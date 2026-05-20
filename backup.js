/**
 * Journey Coach — Database Backup Script
 *
 * One-time setup:
 *   1. Create a plain text file called backup.config in this folder
 *   2. Add one line:  DATABASE_URL=your_connection_string_from_vercel
 *      (Vercel → project → Settings → Environment Variables → DATABASE_URL)
 *
 * Run anytime:
 *   node backup.js
 *
 * Saves a dated JSON file to the backups/ folder and keeps the 10 most recent.
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Load DATABASE_URL from .env.backup ───────────────────────────────────────
const envPath = path.join(__dirname, 'backup.config');
if (!fs.existsSync(envPath)) {
  console.error('\n  ERROR: backup.config file not found.');
  console.error('  Create a file called backup.config in this folder with:');
  console.error('  DATABASE_URL=your_connection_string_from_vercel\n');
  process.exit(1);
}
const envLine = fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .find(l => l.startsWith('DATABASE_URL='));
if (!envLine) {
  console.error('\n  ERROR: DATABASE_URL not found in backup.config.\n');
  process.exit(1);
}
const DATABASE_URL = envLine.replace('DATABASE_URL=', '').trim();

// ── Tables to back up ────────────────────────────────────────────────────────
const TABLES = [
  'subscribers',
  'contact_submissions',
  'posts',
  'testimonials',
  'campaign_emails',
  'navigation',
  'page_sections',
  'site_settings',
  'calendly_events',
  'tools',
  'bookmark_categories',
  'bookmarks',
];

// ── Run backup ───────────────────────────────────────────────────────────────
async function run() {
  console.log('\n  Journey Coach — Database Backup');
  console.log('  ' + '─'.repeat(40));

  const sql = neon(DATABASE_URL);
  const backup = { created_at: new Date().toISOString(), tables: {} };
  let totalRows = 0;

  for (const table of TABLES) {
    try {
      const rows = await sql(`SELECT * FROM ${table} ORDER BY id`);
      backup.tables[table] = rows;
      totalRows += rows.length;
      console.log(`  ✓  ${table.padEnd(24)} ${rows.length} rows`);
    } catch (err) {
      // Table may not exist yet — skip gracefully
      console.log(`  -  ${table.padEnd(24)} (skipped: ${err.message.split('\n')[0]})`);
      backup.tables[table] = [];
    }
  }

  // ── Save file ──────────────────────────────────────────────────────────────
  const backupsDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `journeycoach_${stamp}.json`;
  const filepath = path.join(backupsDir, filename);
  const json = JSON.stringify(backup, null, 2);
  fs.writeFileSync(filepath, json);

  const kb = (json.length / 1024).toFixed(1);
  console.log(`\n  Saved: backups/${filename}  (${kb} KB, ${totalRows} total rows)`);

  // ── Keep only 10 most recent backups ──────────────────────────────────────
  const files = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('journeycoach_') && f.endsWith('.json'))
    .sort();
  if (files.length > 10) {
    const toDelete = files.slice(0, files.length - 10);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(backupsDir, f));
      console.log(`  Removed old backup: ${f}`);
    });
  }

  console.log('\n  Done.\n');
}

run().catch(err => {
  console.error('\n  Backup failed:', err.message, '\n');
  process.exit(1);
});
