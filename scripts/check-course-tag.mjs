#!/usr/bin/env node

/**
 * Course Tag Verification (read-only)
 *
 * Confirms that update-transcripts.mjs's delete-path filter
 * (.eq('metadata->>course', COURSE)) — a Postgres-side JSON text
 * extraction — actually matches the existing rows for a course, before
 * running a live update. Plain JS property access (as used in
 * kb_diagnose.mjs) can hide whitespace/case mismatches that .eq() would
 * silently miss, so this checks the exact DB-side filter plus dumps all
 * distinct raw metadata.course values to surface those mismatches.
 *
 * Usage:
 *   node scripts/check-course-tag.mjs "VGA"
 *
 * Environment (loaded from .env automatically):
 *   SUPABASE_SERVICE_ROLE_KEY - Required to bypass RLS for reads
 *   SUPABASE_URL              - Falls back to VITE_SUPABASE_URL
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

function loadDotenv() {
  try {
    const env = readFileSync(resolve('.env'), 'utf-8');
    for (const line of env.split('\n')) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    }
  } catch { /* no .env file */ }
}
loadDotenv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COURSE = process.argv[2];

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL)');
if (!SUPABASE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
if (!COURSE) {
  console.error('Usage: node scripts/check-course-tag.mjs "COURSE_NAME"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { count: totalDocs, error: countErr } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });
  if (countErr) throw new Error(`Total count failed: ${countErr.message}`);

  // Exact same filter update-transcripts.mjs uses before deleting
  const { count: exactMatch, error: exactErr } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('metadata->>course', COURSE);
  if (exactErr) throw new Error(`Exact-match count failed: ${exactErr.message}`);

  console.log(`Total documents:                 ${totalDocs}`);
  console.log(`metadata->>course = "${COURSE}" (exact, case-sensitive): ${exactMatch}`);

  // Pull distinct raw course values + counts to catch case/whitespace variants
  // that .eq() would silently miss (e.g. "VGA " or "vga").
  const { data: rows, error: rowsErr } = await supabase
    .from('documents')
    .select('metadata')
    .limit(5000);
  if (rowsErr) throw new Error(`Row scan failed: ${rowsErr.message}`);

  const tally = new Map();
  for (const r of rows) {
    const raw = r.metadata?.course;
    const key = raw === undefined ? '<no course key>' : raw === null ? '<null>' : JSON.stringify(raw);
    tally.set(key, (tally.get(key) || 0) + 1);
  }
  console.log('\nDistinct raw metadata.course values found (JSON-quoted to reveal whitespace/case):');
  for (const [key, count] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${key}: ${count}`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
