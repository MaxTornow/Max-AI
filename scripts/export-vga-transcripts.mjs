#!/usr/bin/env node

/**
 * VGA Transcript Exporter
 *
 * Reads the current state of the Supabase `documents` table and reconstructs
 * the Kajabi CSV format expected by update-vga-transcripts.mjs / update-transcripts.mjs.
 *
 * This is READ-ONLY — it never writes to or deletes from Supabase.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/export-vga-transcripts.mjs [output.csv]
 *
 * Environment:
 *   SUPABASE_SERVICE_ROLE_KEY - Required to bypass RLS
 *   SUPABASE_URL              - Falls back to VITE_SUPABASE_URL from .env
 *
 * Options:
 *   --course <name>   Filter to a specific course tag (metadata.course).
 *                     If omitted, exports all documents regardless of course tag.
 *   --dry-run         Print module/video summary only, don't write CSV.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// ── Arg parsing ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const courseIdx = args.indexOf('--course');
const COURSE_FILTER = courseIdx !== -1 ? args[courseIdx + 1] : null;

const OUTPUT_PATH = args
  .filter(a => a !== '--dry-run' && a !== '--course' && a !== COURSE_FILTER)
  .at(0) || 'Kajabi Transcriptions - VGA 2026 v2 - VGA - CURRENT.csv';

// ── Env ─────────────────────────────────────────────────────────────
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

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL)');
if (!SUPABASE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

// ── CSV field escaper ────────────────────────────────────────────────
// Always quote fields that contain commas, quotes, or newlines.
// Doubles up any internal double-quote characters.
function csvField(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function csvRow(...fields) {
  return fields.map(csvField).join(',');
}

// ── Supabase paginated fetch ─────────────────────────────────────────
async function fetchAllDocuments(supabase) {
  const PAGE = 1000;
  let offset = 0;
  const all = [];

  while (true) {
    let query = supabase
      .from('documents')
      .select('content, metadata')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (COURSE_FILTER) {
      query = query.eq('metadata->>course', COURSE_FILTER);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;

    all.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  return all;
}

// ── Reconstruct transcript from ordered chunks ───────────────────────
// The ingestion script merges consecutive timestamp segments into chunks.
// We can't perfectly undo the merge (we don't store per-segment timestamps),
// but we can reconstruct a valid transcript by emitting each chunk as a
// timestamped block using timestamp_start. The re-ingestion script will
// re-chunk it identically, so round-tripping is safe.
function rebuildTranscript(chunks) {
  // Sort by chunk_index ascending
  const sorted = [...chunks].sort((a, b) => {
    const ai = Number(a.metadata.chunk_index ?? 0);
    const bi = Number(b.metadata.chunk_index ?? 0);
    return ai - bi;
  });

  const lines = [];
  for (const chunk of sorted) {
    const ts = chunk.metadata.timestamp_start || '00:00:00';
    lines.push(ts);
    lines.push(chunk.content.trim());
    lines.push(''); // blank line between segments (triggers new chunk on re-ingest)
  }

  return lines.join('\n').trim();
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Quick sanity check
  const { count, error: countErr } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });
  if (countErr) throw new Error(`Connection test failed: ${countErr.message}`);
  console.log(`  Total documents in table: ${count}`);

  console.log(COURSE_FILTER
    ? `  Filtering by course: "${COURSE_FILTER}"`
    : '  No course filter — exporting all documents');

  console.log('\nFetching documents...');
  const docs = await fetchAllDocuments(supabase);
  console.log(`  Fetched ${docs.length} documents`);

  if (docs.length === 0) {
    console.error('No documents found. Check your course filter or Supabase connection.');
    process.exit(1);
  }

  // ── Group by module → video, preserving insertion order within each group
  // We use a Map to keep modules in the order they first appear.
  const moduleMap = new Map(); // module → Map(video_title → { link, chunks[] })

  for (const doc of docs) {
    const meta = doc.metadata || {};
    const moduleName = meta.module || '(No Module)';
    const videoTitle = meta.video_title || '(Untitled)';
    const videoLink  = meta.video_link  || '';

    if (!moduleMap.has(moduleName)) moduleMap.set(moduleName, new Map());
    const videoMap = moduleMap.get(moduleName);

    if (!videoMap.has(videoTitle)) {
      videoMap.set(videoTitle, { link: videoLink, chunks: [] });
    }
    videoMap.get(videoTitle).chunks.push(doc);
  }

  // ── Print summary ────────────────────────────────────────────────
  console.log('\nModule / Video breakdown:');
  let totalVideos = 0;
  let totalChunks = 0;
  for (const [mod, videoMap] of moduleMap) {
    console.log(`  [${mod}]`);
    for (const [title, { chunks }] of videoMap) {
      console.log(`    ${title} — ${chunks.length} chunks`);
      totalVideos++;
      totalChunks += chunks.length;
    }
  }
  console.log(`\n  ${moduleMap.size} modules, ${totalVideos} videos, ${totalChunks} chunks total`);

  if (DRY_RUN) {
    console.log('\n--dry-run: stopping before writing CSV');
    return;
  }

  // ── Build CSV ────────────────────────────────────────────────────
  // Header row (matches what the ingestion script expects)
  const csvLines = [csvRow('Video Title', 'Link', 'Transcript')];

  for (const [moduleName, videoMap] of moduleMap) {
    // Module header row: title only, empty link + transcript columns
    csvLines.push(csvRow(moduleName, '', ''));

    for (const [videoTitle, { link, chunks }] of videoMap) {
      const transcript = rebuildTranscript(chunks);
      csvLines.push(csvRow(videoTitle, link, transcript));
    }
  }

  const csvContent = csvLines.join('\n') + '\n';

  console.log(`\nWriting CSV to: ${OUTPUT_PATH}`);
  writeFileSync(resolve(OUTPUT_PATH), csvContent, 'utf-8');

  const byteSize = Buffer.byteLength(csvContent, 'utf-8');
  const kb = (byteSize / 1024).toFixed(1);
  console.log(`  Written: ${csvLines.length} rows, ${kb} KB`);
  console.log('\nDone! Safe to open in a spreadsheet or text editor to splice in updates.');
  console.log('Re-ingest with:');
  console.log(`  node scripts/update-transcripts.mjs --course "VGA" "${OUTPUT_PATH}"`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
