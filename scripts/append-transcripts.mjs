#!/usr/bin/env node

/**
 * Course Transcript Appender (append-only)
 *
 * Parses a Kajabi CSV (Video Title, Link, Transcript), chunks by timestamp,
 * generates embeddings, and INSERTS new rows into Supabase `documents`.
 *
 * Unlike update-transcripts.mjs (deletes all rows for --course first) and
 * update-vga-transcripts.mjs (deletes the entire table first), this script
 * has no delete, truncate, or upsert-with-replace step of any kind. It only
 * ever adds rows. Existing rows — regardless of course — are never touched.
 *
 * Before inserting, it checks the table for any video_title already present
 * (matched case-insensitively, trimmed) and skips those videos by default,
 * so re-running the same CSV (or a CSV that overlaps a prior batch) doesn't
 * create duplicate chunks. Pass --allow-duplicates to insert them anyway.
 *
 * Embeddings: uses OPENAI_API_KEY directly against api.openai.com if it's
 * set; otherwise falls back to OPENROUTER_API_KEY against OpenRouter's
 * "openai/text-embedding-3-small" passthrough (confirmed elsewhere in this
 * repo — see check-openrouter-embedding-match.mjs — to be a faithful,
 * same-vector-space passthrough to the OpenAI model already used for every
 * existing row).
 *
 * Usage:
 *   node scripts/append-transcripts.mjs --course "VGA" path/to/file.csv
 *   node scripts/append-transcripts.mjs --course "VGA" --dry-run path/to/file.csv
 *   node scripts/append-transcripts.mjs --course "VGA" --allow-duplicates path/to/file.csv
 *
 * Environment (loaded from .env automatically):
 *   OPENAI_API_KEY            - Preferred for embedding generation, if set
 *   OPENROUTER_API_KEY        - Used if OPENAI_API_KEY is not set
 *   SUPABASE_SERVICE_ROLE_KEY - Required to bypass RLS
 *   SUPABASE_URL              - Falls back to VITE_SUPABASE_URL
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// ── Arg parsing ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ALLOW_DUPLICATES = args.includes('--allow-duplicates');
const courseIdx = args.indexOf('--course');
const COURSE = courseIdx !== -1 ? args[courseIdx + 1] : null;
const CSV_PATH = args.filter((a, i) => {
  if (a === '--dry-run' || a === '--allow-duplicates' || a === '--course') return false;
  if (i === courseIdx + 1 && courseIdx !== -1) return false;
  return true;
}).at(0);

if (!CSV_PATH) {
  console.error('Usage: node scripts/append-transcripts.mjs --course "COURSE_NAME" path/to/file.csv [--dry-run] [--allow-duplicates]');
  process.exit(1);
}
if (!COURSE) {
  console.error('Error: --course is required (e.g. --course "VGA")');
  process.exit(1);
}

// ── Config ──────────────────────────────────────────────────────────
const EMBEDDING_DIMS = 1536;
const BATCH_SIZE = 20;
const MAX_CHARS_PER_CHUNK = 1500;

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

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Which embedding provider we'll use — decided once, up front, so dry-run
// output and the live run always agree on what would happen.
const EMBED_PROVIDER = OPENAI_API_KEY ? 'openai' : 'openrouter';

// Supabase creds are required even for --dry-run, since dry-run does a
// real (read-only) check against the live table.
if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL)');
if (!SUPABASE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
if (!DRY_RUN) {
  if (EMBED_PROVIDER === 'openai' && !OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');
  if (EMBED_PROVIDER === 'openrouter' && !OPENROUTER_API_KEY) throw new Error('Missing OPENROUTER_API_KEY (no OPENAI_API_KEY set either)');
}

// ── CSV Parser (handles quoted fields with embedded newlines) ───────
function parseCSV(content) {
  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"' && content[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      current.push(field);
      field = '';
    } else if (ch === '\n' || (ch === '\r' && content[i + 1] === '\n')) {
      current.push(field);
      field = '';
      if (current.some(f => f.trim())) rows.push(current);
      current = [];
      if (ch === '\r') i++;
    } else {
      field += ch;
    }
  }
  if (field || current.length) {
    current.push(field);
    if (current.some(f => f.trim())) rows.push(current);
  }
  return rows;
}

// ── Transcript chunker ──────────────────────────────────────────────
function chunkTranscript(transcript) {
  const segments = transcript.split(/\n\n+/);
  const rawChunks = [];
  let ts = '00:00:00';
  let text = '';

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;
    const lines = trimmed.split('\n');
    const first = lines[0].trim();

    if (/^\d{2}:\d{2}:\d{2}/.test(first)) {
      if (text.trim()) rawChunks.push({ timestamp: ts, text: text.trim() });
      ts = first.replace(/,\d{3}\s*$/, '');
      text = lines.slice(1).join(' ').trim();
    } else {
      text += (text ? ' ' : '') + trimmed.replace(/\n/g, ' ');
    }
  }
  if (text.trim()) rawChunks.push({ timestamp: ts, text: text.trim() });

  // Merge small consecutive segments
  const merged = [];
  let cur = null;
  for (const c of rawChunks) {
    if (!cur) {
      cur = { ...c, endTimestamp: c.timestamp };
    } else if (cur.text.length + c.text.length + 1 < MAX_CHARS_PER_CHUNK) {
      cur.text += ' ' + c.text;
      cur.endTimestamp = c.timestamp;
    } else {
      merged.push(cur);
      cur = { ...c, endTimestamp: c.timestamp };
    }
  }
  if (cur) merged.push(cur);
  return merged;
}

// ── Embeddings (OpenAI direct, or OpenRouter passthrough) ────────────
async function getEmbeddings(texts) {
  if (EMBED_PROVIDER === 'openai') {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: texts, model: 'text-embedding-3-small', dimensions: EMBEDDING_DIMS }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
  }

  const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: texts, model: 'openai/text-embedding-3-small' }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function normalizeTitle(title) {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log(`Course:    ${COURSE}`);
  console.log(`CSV:       ${CSV_PATH}`);
  console.log(`Mode:      ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Embedding: ${EMBED_PROVIDER === 'openai' ? 'OpenAI direct (OPENAI_API_KEY)' : 'OpenRouter passthrough (OPENROUTER_API_KEY)'}`);
  console.log(`Dupes:     ${ALLOW_DUPLICATES ? 'allowed (--allow-duplicates set)' : 'skip videos whose title already exists'}\n`);

  const content = readFileSync(resolve(CSV_PATH), 'utf-8');
  const rows = parseCSV(content).slice(1); // skip header

  // Extract modules & videos
  let currentModule = null;
  const videos = [];
  for (const row of rows) {
    const [title, link, transcript] = row.map(f => (f || '').trim());
    if (!link && !transcript && title) {
      currentModule = title;
    } else if (link && transcript) {
      videos.push({ module: currentModule, title, link, transcript });
    }
  }
  console.log(`Parsed ${videos.length} videos with transcripts`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Read-only Supabase checks — run in BOTH dry-run and live mode.
  console.log('\nChecking Supabase...');
  const { count: totalDocs, error: countErr } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });
  if (countErr) throw new Error(`Supabase connection failed: ${countErr.message}`);

  const { count: existingCourseCount, error: existingErr } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('metadata->>course', COURSE);
  if (existingErr) throw new Error(`Course count check failed: ${existingErr.message}`);

  console.log(`  Total documents:                   ${totalDocs}`);
  console.log(`  Existing "${COURSE}" documents (will NOT be touched): ${existingCourseCount}`);

  // Duplicate video_title pre-check against the whole table (a video could
  // in principle be re-tagged under a different course by mistake, so we
  // check globally rather than scoping to COURSE).
  const { data: existingTitleRows, error: titleErr } = await supabase
    .from('documents')
    .select('metadata')
    .not('metadata->>video_title', 'is', null)
    .limit(10000);
  if (titleErr) throw new Error(`Existing-title scan failed: ${titleErr.message}`);

  const existingTitles = new Set(existingTitleRows.map(r => normalizeTitle(r.metadata.video_title)));

  const videosToInsert = [];
  const skippedDuplicates = [];
  for (const v of videos) {
    if (!ALLOW_DUPLICATES && existingTitles.has(normalizeTitle(v.title))) {
      skippedDuplicates.push(v.title);
    } else {
      videosToInsert.push(v);
    }
  }

  if (skippedDuplicates.length) {
    console.log(`\n  Skipping ${skippedDuplicates.length} video(s) already present in the table:`);
    for (const t of skippedDuplicates) console.log(`    - "${t}"`);
    console.log('  (pass --allow-duplicates to insert them anyway)');
  }

  // Chunk the videos that will actually be inserted
  const allChunks = [];
  for (let vi = 0; vi < videosToInsert.length; vi++) {
    const v = videosToInsert[vi];
    const chunks = chunkTranscript(v.transcript);
    for (let ci = 0; ci < chunks.length; ci++) {
      allChunks.push({
        content: chunks[ci].text,
        metadata: {
          course: COURSE,
          module: v.module,
          video_title: v.title,
          video_link: v.link,
          chunk_id: `${vi}_${ci}`,
          chunk_index: ci,
          timestamp_start: chunks[ci].timestamp,
          timestamp_end: chunks[ci].endTimestamp,
        },
      });
    }
  }
  console.log(`\nGenerated ${allChunks.length} chunks from ${videosToInsert.length} video(s) to insert`);

  if (allChunks.length) {
    const moduleCounts = {};
    for (const c of allChunks) {
      const m = c.metadata.module;
      moduleCounts[m] = (moduleCounts[m] || 0) + 1;
    }
    console.log('Module breakdown:');
    for (const [m, count] of Object.entries(moduleCounts)) {
      console.log(`  ${m}: ${count} chunks`);
    }

    const lengths = allChunks.map(c => c.content.length);
    const totalChars = lengths.reduce((a, b) => a + b, 0);
    const estTokens = Math.ceil(totalChars / 4);
    console.log(`\nChunk stats: avg=${Math.round(totalChars / lengths.length)} min=${Math.min(...lengths)} max=${Math.max(...lengths)}`);
    console.log(`Embedding cost estimate: ~$${(estTokens * 0.02 / 1_000_000).toFixed(4)} (${estTokens} tokens)`);
  }

  console.log(`\nExpected "${COURSE}" total after run:   ${existingCourseCount + allChunks.length}`);
  console.log(`Expected overall total after run:      ${totalDocs + allChunks.length}`);

  if (DRY_RUN) {
    console.log('\n--dry-run: stopping before any embedding calls or writes. No rows read above were touched.');
    return;
  }

  if (!allChunks.length) {
    console.log('\nNothing to insert (all videos were duplicates or CSV was empty). Exiting.');
    return;
  }

  // Sanity-check the embedding provider before spending on the real batch
  console.log(`\nTesting ${EMBED_PROVIDER}...`);
  const testEmb = await getEmbeddings(['connection test']);
  if (testEmb[0].length !== EMBEDDING_DIMS) throw new Error(`Expected ${EMBEDDING_DIMS} dims, got ${testEmb[0].length}`);
  console.log(`  ${EMBED_PROVIDER}: ${EMBEDDING_DIMS}-dim embeddings OK`);

  // APPEND ONLY — no delete, no truncate, no upsert. Existing rows for
  // this course (or any other) are never read for the purpose of removal.
  console.log(`\nInserting ${allChunks.length} new chunks (batch size ${BATCH_SIZE})...`);
  let inserted = 0;

  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map(c => c.content);
    const embeddings = await getEmbeddings(texts);

    const rows = batch.map((chunk, idx) => ({
      content: chunk.content,
      metadata: chunk.metadata,
      embedding: JSON.stringify(embeddings[idx]),
    }));

    const { error } = await supabase.from('documents').insert(rows);
    if (error) throw new Error(`Insert batch ${i}: ${error.message}`);

    inserted += batch.length;
    process.stdout.write(`  ${inserted}/${allChunks.length}\r`);

    if (i + BATCH_SIZE < allChunks.length) await sleep(150);
  }

  // Verify
  console.log(`\n\nVerifying...`);
  const { count: newCourseCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('metadata->>course', COURSE);
  const { count: newTotal } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });

  console.log(`  "${COURSE}" documents: ${existingCourseCount} existing + ${inserted} new = ${newCourseCount}`);
  console.log(`  Total documents:       ${totalDocs} existing + ${inserted} new = ${newTotal}`);
  if (newCourseCount !== existingCourseCount + allChunks.length || newTotal !== totalDocs + allChunks.length) {
    console.log('  WARNING: counts do not match expectations — investigate before trusting this data.');
  }
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
