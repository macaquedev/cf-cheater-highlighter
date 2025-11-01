const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Stream for writing suspects (newline-delimited JSON) — initialized before processing
let suspectsStream;

// Firebase setup
let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch (error) {
  console.error('❌ serviceAccountKey.json not found!');
  process.exit(1);
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const CONTEST_STATUS_API = 'https://codeforces.com/api/contest.status';
const CF_BATCH_SIZE = 100000; // fetch 10k subs per page
const FIREBASE_BATCH_SIZE = 500;
const TIME_DIFF_SEC = 5 * 60; // 5 minutes

const IGNORE_CE = true;
const SAVE_FILE = false;
const ADD_REPORTS = true;

// Load existing cheaters list to avoid duplicate reports for known cheaters
let existingCheaters = new Set();
try {
  const cheatersPath = path.resolve(__dirname, '..', 'cheaters.json');
  const raw = fs.readFileSync(cheatersPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (parsed && Array.isArray(parsed.cheaters)) {
    for (const h of parsed.cheaters) {
      existingCheaters.add(h.toLowerCase());
    }
  }
} catch (err) {
  console.warn('Warning: could not load cheaters.json, continuing without existing-cheaters filter');
}

// Firestore batch logic
let reportBatch = db.batch();
let batchCount = 0;
const reportCollection = db.collection('reports');

async function commitBatchIfNeeded(force = false) {
  if (!ADD_REPORTS) return;
  if (batchCount >= FIREBASE_BATCH_SIZE || (force && batchCount > 0)) {
    await reportBatch.commit();
    console.log(`🔥 Firestore batch committed (${batchCount} reports)`);
    reportBatch = db.batch();
    batchCount = 0;
  }
}

function addReportToBatch(report) {
  if (!ADD_REPORTS) return;
  const docRef = reportCollection.doc();
  reportBatch.set(docRef, report);
  batchCount++;
}

function makeAutomatedReport(rec) {
  if (!ADD_REPORTS) return;
  const handle = rec.handle;
  const contestId = rec.contest;
  const problemIndex = rec.problem || '';
  const subId = rec.prev && rec.prev.id;
  const lastId = rec.cur && rec.cur.id;
  const lang = rec.prev && rec.prev.lang;
  const lastLang = rec.cur && rec.cur.lang;
  const diff = rec.diffSecs || 0;

  const subLink = `https://codeforces.com/contest/${contestId}/submission/${subId}`;
  const lastLink = `https://codeforces.com/contest/${contestId}/submission/${lastId}`;
  const problemLink = `https://codeforces.com/contest/${contestId}/problem/${problemIndex}`;
  const problemName = `${contestId}${problemIndex}`;

  const fmtDuration = (secs) => {
    const s = Math.max(0, Math.floor(Number(secs) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return (h ? `${h}h` : '') + (m ? `${m}m` : '') + `${sec}s`;
  };

  const message = [
    `**Language Change Detection (Automated)**`,
    `${handle} switched from ${lang} to ${lastLang} on [${problemName}](${problemLink}) in ${fmtDuration(diff)}.`,
    `Submissions: [1st](${subLink}) → [2nd](${lastLink}).`
  ].join('\n\n');
  const report = {
    username: handle,
    evidence: message,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  addReportToBatch(report);
  commitBatchIfNeeded();
  return report;
}

// Submission processing logic
const langs = ['java', 'kotlin', 'rust', 'haskell', 'go', 'php', 'delphi', 'ocaml', 'perl', 'ruby', 'c#', 'f#', 'scala'];

function normLang(lang) {
  if (!lang) return 'unknown';
  const s = lang.toLowerCase();
  if (/(c\+\+|cpp|g\+\+|gnu[_-]?c|gcc|clang|\bc\b|c11|c99)/i.test(s)) return 'c/cpp';
  if (s === 'd') return 'd';
  if (s.includes('python') || s.includes('pypy')) return 'python';
  if (s.includes('pascal') || s.includes('fpc')) return 'pascal';
  if (s.includes('node.js') || s.includes('javascript')) return 'js';
  for (const lang of langs) {
    if (s.includes(lang)) return lang;
  }
  console.log('Unknown language', s)
  return s;
}

function getHandle(sub) {
  if (!sub || !sub.author) return undefined;
  const handle =  sub.author.members[0].handle || '';
  return handle.toLowerCase();
}

async function fetchPage(contestId, from) {
  const url = `${CONTEST_STATUS_API}?contestId=${contestId}&from=${from}&count=${CF_BATCH_SIZE}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function findSuspects(contestId) {
  if (!contestId) throw new Error('Missing contestId');

  const arrProblems = [];
  const problemIndex = new Map();
  const suspects = [];

  let from = 1;
  while (true) {
    let data;
    try {
      data = await fetchPage(contestId, from);
    } catch (err) {
      console.error('Fetch error:', err.message);
      break;
    }
    if (!data || data.status !== 'OK') {
      console.error('API error:', data.comment || '');
      break;
    }
    const page = data.result || [];
    if (page.length === 0) break;

    for (let idx = 0; idx < page.length; idx++) {
      const sub = page[idx];
      if (!sub || !sub.author) continue;
      const verdict = (sub.verdict || '').toUpperCase();
      if (verdict === 'SKIPPED') continue;
      if (IGNORE_CE && verdict === 'COMPILATION_ERROR') continue;
      const p = sub.problem || '?';
      const partType = sub.author.participantType;
      if (partType !== 'CONTESTANT') continue;
      const handle = getHandle(sub);
      if (!handle) continue;
      const problemId = p.index;
      let pIdx = problemIndex.get(problemId);
      if (pIdx === undefined) {
        pIdx = arrProblems.length;
        problemIndex.set(problemId, pIdx);
        arrProblems.push(new Map());
      }
      const map = arrProblems[pIdx];
      const lang = normLang(sub.programmingLanguage || '');
      const timeSec = sub.creationTimeSeconds || 0;
      const last = map.get(handle);
      if (last) {
        const diff = last.timeSec - timeSec;
        if (last.lang !== lang && diff <= TIME_DIFF_SEC && diff >= 0) {
          const rec = {
            handle,
            contest: contestId,
            problem: problemId,
            prev: { lang, id: sub.id },
            cur: { lang: last.lang, id: last.id },
            diffSecs: diff
          };

          if (!existingCheaters.has(handle)) {
            suspects.push(rec);
            makeAutomatedReport(rec);
          }
        }
      }
      map.set(handle, { lang, timeSec, id: sub.id });
    }
    const pageNum = Math.floor((from - 1) / CF_BATCH_SIZE) + 1;
    console.log(`processed page ${pageNum} of size ${page.length}`);
    from += CF_BATCH_SIZE;
  }

  return suspects;
}

async function processContests(contestIds) {
  let totalSuspects = 0;
  if (SAVE_FILE) {
    const outPath = path.resolve(__dirname, '..', 'suspects.jsonl');
    suspectsStream = fs.createWriteStream(outPath, { flags: 'w' });
  } else {
    suspectsStream = null;
  }
  for (const contestId of contestIds) {
    console.log(`📊 Processing contest ${contestId}`);
    let suspects = [];
    try {
      suspects = await findSuspects(contestId);
    } catch (err) {
      console.error(`❌ Error for contest ${contestId}:`, err.message);
      continue;
    }

    if (SAVE_FILE && suspectsStream) {
      try {
        for (const rec of suspects) {
          suspectsStream.write(JSON.stringify(rec) + '\n');
        }
      } catch (err) {
        console.error('❌ Error writing suspects to file:', err.message);
      }
    }
    totalSuspects += suspects.length;
    console.log(`✅ Contest ${contestId}: ${suspects.length} suspects found.`);
  }

  await commitBatchIfNeeded(true);

  if (SAVE_FILE && suspectsStream) {
    suspectsStream.end();
    console.log('Suspects written to suspects.jsonl');
  }
  console.log(`✅ Finished. ${totalSuspects} suspects collected`);
}

// Example usage: pass contest IDs as array
const contestIds = [];
processContests(contestIds).catch(e => { console.error(e); process.exit(1); });