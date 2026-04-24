#!/usr/bin/env node

/**
 * VGA Transcript Updater
 *
 * Parses Kajabi CSV transcripts, chunks by timestamp segments,
 * generates OpenAI embeddings, and replaces all documents in Supabase.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... SUPABASE_SERVICE_ROLE_KEY=... node scripts/update-vga-transcripts.mjs [path-to-csv]
 *
 * Environment:
 *   OPENAI_API_KEY            - Required for embedding generation
 *   SUPABASE_SERVICE_ROLE_KEY - Required to bypass RLS
 *   SUPABASE_URL              - Falls back to VITE_SUPABASE_URL from .env
 *
 * Options:
 *   --dry-run    Parse and chunk only, don't touch the database
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// ── Config ──────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const CSV_PATH = process.argv.filter(a => a !== '--dry-run').at(2) || 'Kajabi Transcriptions - VGA 2026 v2 - VGA.csv';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS = 1536;
const BATCH_SIZE = 20; // chunks per embedding API call
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
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DRY_RUN) {
  if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');
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
  // Split on double-newlines to get timestamp-delimited segments
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
      ts = first.replace(/,\d{3}\s*$/, ''); // strip ms
      text = lines.slice(1).join(' ').trim();
    } else {
      text += (text ? ' ' : '') + trimmed.replace(/\n/g, ' ');
    }
  }
  if (text.trim()) rawChunks.push({ timestamp: ts, text: text.trim() });

  // Merge small consecutive segments up to MAX_CHARS_PER_CHUNK
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

// ── OpenAI embeddings ───────────────────────────────────────────────
async function getEmbeddings(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: texts, model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMS }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  console.log('Reading CSV:', CSV_PATH);
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
  console.log(`  ${videos.length} videos with transcripts`);

  // Chunk all transcripts
  const allChunks = [];
  for (let vi = 0; vi < videos.length; vi++) {
    const v = videos[vi];
    const chunks = chunkTranscript(v.transcript);
    for (let ci = 0; ci < chunks.length; ci++) {
      allChunks.push({
        content: chunks[ci].text,
        metadata: {
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
  console.log(`  ${allChunks.length} chunks generated`);

  // Module summary
  const moduleCounts = {};
  for (const c of allChunks) {
    const m = c.metadata.module;
    moduleCounts[m] = (moduleCounts[m] || 0) + 1;
  }
  console.log('\n  Module breakdown:');
  for (const [m, count] of Object.entries(moduleCounts)) {
    console.log(`    ${m}: ${count} chunks`);
  }

  if (DRY_RUN) {
    console.log('\n  --dry-run: stopping before database operations');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Delete existing documents
  console.log('\nDeleting existing documents...');
  const { error: delErr, count: delCount } = await supabase
    .from('documents')
    .delete({ count: 'exact' })
    .gte('id', 0);
  if (delErr) throw new Error(`Delete failed: ${delErr.message}`);
  console.log(`  Deleted ${delCount ?? '?'} rows`);

  // Insert in batches with embeddings
  console.log(`\nInserting ${allChunks.length} chunks (batch size ${BATCH_SIZE})...`);
  let inserted = 0;
  let totalTokens = 0;

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

    // Rate-limit courtesy
    if (i + BATCH_SIZE < allChunks.length) await sleep(150);
  }

  console.log(`\nDone! Inserted ${inserted} document chunks.`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
