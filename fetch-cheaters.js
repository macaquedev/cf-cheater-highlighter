// fetch-cheaters.js
import fs from 'fs/promises';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import 'dotenv/config';

const { DISCORD_TOKEN, CHANNEL_ID } = process.env;
if (!DISCORD_TOKEN || !CHANNEL_ID) {
  console.error('❌ Missing DISCORD_TOKEN or CHANNEL_ID');
  process.exit(1);
}

const client = new Client({
  intents: [ GatewayIntentBits.Guilds ]
});

async function collectAllThreadTitles() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (!channel || channel.type !== ChannelType.GuildForum) {
    throw new Error('Channel ID is not a ForumChannel');
  }

  const titles = [];

  // 1) Active threads (no pagination endpoint, returns up to 100)
  {
    const { threads: active } = await channel.threads.fetchActive();
    for (const thread of active.values()) {
      titles.push(thread.name);
    }
  }

  // Helper to fetch a page of archived threads and collect titles
  async function fetchArchivedPage(type, before) {
    const opts = { type, limit: 100 };
    if (before) opts.before = before;
    const page = await channel.threads.fetchArchived(opts);
    for (const thread of page.threads.values()) {
      titles.push(thread.name);
    }
    return page;
  }

  // 2) Public-archived threads, with pagination
  {
    let page = await fetchArchivedPage('public');
    while (page.hasMore) {
      const last = Array.from(page.threads.values()).pop().id;
      page = await fetchArchivedPage('public', last);
    }
  }

  // 3) Private-archived threads (bot-joined), with pagination
  {
    let page = await fetchArchivedPage('private');
    while (page.hasMore) {
      const last = Array.from(page.threads.values()).pop().id;
      page = await fetchArchivedPage('private', last);
    }
  }

  return titles;
}

function filterValidTitles(titles) {
  return titles.filter(title => {
    // must be a single word (no whitespace)
    if (/\s/.test(title)) return false;
    const lower = title.toLowerCase();
    // exclude "." or "more"
    if (lower === '.' || lower === 'more') return false;
    return true;
  });
}

async function main() {
  try {
    await client.login(DISCORD_TOKEN);

    const allTitles    = await collectAllThreadTitles();
    const validTitles  = filterValidTitles(allTitles);
    const uniqueTitles = Array.from(new Set(validTitles));

    await fs.writeFile(
      'cheaters.json',
      JSON.stringify({ cheaters: uniqueTitles }, null, 2)
    );

    console.log(`✅ Wrote ${uniqueTitles.length} cheaters to cheaters.json`);
    process.exit(0);
  } catch (err) {
    console.error('❌', err);
    process.exit(1);
  }
}

main();
