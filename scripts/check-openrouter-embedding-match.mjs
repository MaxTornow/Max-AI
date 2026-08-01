#!/usr/bin/env node

/**
 * OpenRouter Embedding Compatibility Check (read-only)
 *
 * Pulls the stored content + embedding for one existing chunk from
 * Supabase, re-embeds that identical text via OpenRouter's
 * "openai/text-embedding-3-small" model, and computes cosine similarity
 * against the stored vector. A score near 1.0 means OpenRouter's copy of
 * the model is a faithful passthrough to the same underlying OpenAI
 * model used for the existing rows, so new chunks embedded via
 * OpenRouter would land in the same vector space. No writes.
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-or-... node scripts/check-openrouter-embedding-match.mjs
 *   node scripts/check-openrouter-embedding-match.mjs "Clone Video"   # custom title filter
 *
 * Environment (loaded from .env automatically):
 *   OPENROUTER_API_KEY        - Required
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
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const TITLE_FILTER = process.argv[2] || 'Clone Video';

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL)');
if (!SUPABASE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
if (!OPENROUTER_API_KEY) throw new Error('Missing OPENROUTER_API_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseEmbedding(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') return JSON.parse(raw);
  return null;
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error(`Dimension mismatch: stored=${a.length} fresh=${b.length}`);
  }
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function main() {
  console.log(`Looking up an existing chunk with video_title matching "${TITLE_FILTER}"...`);
  const { data: rows, error } = await supabase
    .from('documents')
    .select('id, content, metadata, embedding')
    .ilike('metadata->>video_title', `%${TITLE_FILTER}%`)
    .limit(1);
  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  if (!rows || rows.length === 0) {
    throw new Error(`No row found with video_title matching "${TITLE_FILTER}". Try a different filter (argv[2]).`);
  }

  const row = rows[0];
  const storedVec = parseEmbedding(row.embedding);
  if (!storedVec) throw new Error(`Could not parse stored embedding for row id=${row.id}`);

  console.log(`Found row id=${row.id}, video_title="${row.metadata?.video_title}"`);
  console.log(`Content (${row.content.length} chars): "${row.content.slice(0, 120)}..."`);
  console.log(`Stored embedding dims: ${storedVec.length}\n`);

  console.log('Requesting fresh embedding from OpenRouter (model: openai/text-embedding-3-small)...');
  const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/text-embedding-3-small',
      input: row.content,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }
  const data = await res.json();
  const freshVec = data.data[0].embedding;
  console.log(`Fresh embedding dims: ${freshVec.length}\n`);

  const similarity = cosineSimilarity(storedVec, freshVec);
  console.log(`Cosine similarity: ${similarity.toFixed(6)}`);
  if (similarity >= 0.999) {
    console.log('=> MATCH: OpenRouter is a faithful passthrough for this model. Safe to use for new chunks.');
  } else if (similarity >= 0.95) {
    console.log('=> CLOSE BUT NOT IDENTICAL: investigate before relying on this for production retrieval.');
  } else {
    console.log('=> MISMATCH: OpenRouter is not producing the same vectors. Do not mix providers for this table.');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
