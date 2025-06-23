// fetch-cheaters.js
import fs from 'fs/promises';
import fetch from 'node-fetch';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID    = process.env.CHANNEL_ID;

if (!DISCORD_TOKEN || !CHANNEL_ID) {
  console.error('Missing DISCORD_TOKEN or CHANNEL_ID');
  process.exit(1);
}

async function getMessages() {
  const res = await fetch(
    `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=100`,
    { headers: { Authorization: `Bot ${DISCORD_TOKEN}` } }
  );
  if (!res.ok) throw new Error(`Discord API error ${res.status}`);
  return await res.json();
}

function extractHandles(messages) {
  const re = /`?([A-Za-z0-9_]+)`?/g;
  const set = new Set();
  for (const m of messages) {
    let match;
    while ((match = re.exec(m.content))) {
      set.add(match[1]);
    }
  }
  return Array.from(set);
}

async function main() {
  const msgs = await getMessages();
  const cheaters = extractHandles(msgs);
  await fs.writeFile('cheaters.json', JSON.stringify({ cheaters }, null, 2));
  console.log(`Wrote ${cheaters.length} handles`);
}
main().catch(err => { console.error(err); process.exit(1); });
