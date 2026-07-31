#!/usr/bin/env node

/**
 * TEMPORARY one-off ADDITIVE-ONLY script — OpenRouter variant
 * ============================================================
 * DELETE THIS FILE after the run it was created for. Do not adopt it as
 * a permanent tool. update-transcripts.mjs stays the canonical script
 * and continues to hit api.openai.com directly, with its
 * delete-then-replace semantics unchanged.
 *
 * This is NOT a fork of update-transcripts.mjs's course-replace
 * behavior. This CSV contains only 4 new videos, not a full course
 * export — a delete-then-insert against a partial CSV would destroy the
 * other ~622 existing chunks. This script skips the delete step
 * entirely and only INSERTs the new chunks on top of what's already
 * there.
 *
 * Why OpenRouter: no working OPENAI_API_KEY was available for this
 * update, but OPENROUTER_API_KEY is. A same-content cosine similarity
 * check (see scripts/check-openrouter-embedding-match.mjs) confirmed
 * OpenRouter's "openai/text-embedding-3-small" is a faithful passthrough
 * (1.000000 similarity) to the model already used for the existing 622
 * VGA rows, so embeddings produced here land in the same vector space.
 *
 * Usage:
 *   node scripts/_TEMP-update-transcripts-openrouter.mjs --course "VGA" path/to/file.csv
 *   node scripts/_TEMP-update-transcripts-openrouter.mjs --course "VGA" --dry-run path/to/file.csv
 *
 * Environment (loaded from .env automatically):
 *   OPENROUTER_API_KEY        - Required for embedding generation
 *   SUPABASE_SERVICE_ROLE_KEY - Required to bypass RLS
 *   SUPABASE_URL              - Falls back to VITE_SUPABASE_URL
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// ── Arg parsing ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const courseIdx = args.indexOf('--course');
const COURSE = courseIdx !== -1 ? args[courseIdx + 1] : null;
const CSV_PATH = args.filter(a => a !== '--dry-run' && a !== '--course' && a !== COURSE).at(0);

if (!CSV_PATH) {
  console.error('Usage: node scripts/_TEMP-update-transcripts-openrouter.mjs --course "COURSE_NAME" path/to/file.csv [--dry-run]');
  process.exit(1);
}
if (!COURSE) {
  console.error('Error: --course is required (e.g. --course "VGA")');
  process.exit(1);
}

// ── Config ──────────────────────────────────────────────────────────
const EMBEDDING_MODEL = 'openai/text-embedding-3-small'; // OpenRouter provider-prefixed model id
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

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DRY_RUN) {
  if (!OPENROUTER_API_KEY) throw new Error('Missing OPENROUTER_API_KEY');
  if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL)');
  if (!SUPABASE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
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

// ── OpenRouter embeddings ───────────────────────────────────────────
async function getEmbeddings(texts) {
  const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: texts, model: EMBEDDING_MODEL }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log(`Course: ${COURSE}`);
  console.log(`CSV:    ${CSV_PATH}`);
  console.log(`Mode:   ${DRY_RUN ? 'DRY RUN' : 'LIVE'} (via OpenRouter)\n`);

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

  // Chunk all transcripts
  const allChunks = [];
  for (let vi = 0; vi < videos.length; vi++) {
    const v = videos[vi];
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
  console.log(`Generated ${allChunks.length} chunks\n`);

  // Module summary
  const moduleCounts = {};
  for (const c of allChunks) {
    const m = c.metadata.module;
    moduleCounts[m] = (moduleCounts[m] || 0) + 1;
  }
  console.log('Module breakdown:');
  for (const [m, count] of Object.entries(moduleCounts)) {
    console.log(`  ${m}: ${count} chunks`);
  }

  // Chunk stats
  const lengths = allChunks.map(c => c.content.length);
  const totalChars = lengths.reduce((a, b) => a + b, 0);
  const estTokens = Math.ceil(totalChars / 4);
  console.log(`\nChunk stats: avg=${Math.round(totalChars / lengths.length)} min=${Math.min(...lengths)} max=${Math.max(...lengths)}`);
  console.log(`Embedding cost estimate: ~$${(estTokens * 0.02 / 1_000_000).toFixed(4)} (${estTokens} tokens)`);

  if (DRY_RUN) {
    console.log('\n--dry-run: stopping before database operations');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Test connections
  console.log('\nTesting connections...');
  const { count: totalDocs, error: countErr } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });
  if (countErr) throw new Error(`Supabase connection failed: ${countErr.message}`);

  const testEmb = await getEmbeddings(['connection test']);
  if (testEmb[0].length !== EMBEDDING_DIMS) throw new Error(`Expected ${EMBEDDING_DIMS} dims, got ${testEmb[0].length}`);
  console.log(`  Supabase:   ${totalDocs} total documents`);
  console.log(`  OpenRouter: ${EMBEDDING_DIMS}-dim embeddings OK`);

  const { count: existingCourseCount, error: existingErr } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('metadata->>course', COURSE);
  if (existingErr) throw new Error(`Course count check failed: ${existingErr.message}`);
  console.log(`  Existing "${COURSE}" documents (will NOT be touched): ${existingCourseCount}`);

  // ADDITIVE ONLY — no delete step. This CSV is a partial set of new
  // videos, not a full course export, so existing rows are left as-is.
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
  const { count: newCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('metadata->>course', COURSE);
  const { count: newTotal } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });

  console.log(`  "${COURSE}" documents: ${existingCourseCount} existing + ${inserted} new = ${newCount}`);
  console.log(`  Total documents:       ${newTotal}`);
  if (newCount !== existingCourseCount + allChunks.length) {
    console.log(`  WARNING: expected ${existingCourseCount + allChunks.length}, got ${newCount} — investigate before trusting this data.`);
  }
  console.log(`\nDone!`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
