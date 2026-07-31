#!/usr/bin/env node

/**
 * KB Diagnostic (read-only)
 *
 * Inspects the Supabase `documents` table without modifying anything:
 *  - total row count and course/module breakdown
 *  - distinct video_title values (what's actually indexed)
 *  - embedding dimension consistency check
 *  - embedding L2 norm distribution (flags mixed embedding pipelines)
 *  - targeted title search for known trouble spots
 *
 * Usage:
 *   node scripts/kb_diagnose.mjs
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

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL)');
if (!SUPABASE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseEmbedding(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') return JSON.parse(raw);
  return null;
}

function norm(vec) {
  let sum = 0;
  for (const x of vec) sum += x * x;
  return Math.sqrt(sum);
}

async function main() {
  const { count: totalCount, error: countErr } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true });
  if (countErr) throw new Error(`Count failed: ${countErr.message}`);
  console.log(`Total rows in documents: ${totalCount}\n`);

  const { data: allRows, error: allErr } = await supabase
    .from('documents')
    .select('id, content, metadata, embedding');
  if (allErr) throw new Error(`Fetch failed: ${allErr.message}`);

  const courseCounts = {};
  const moduleCounts = {};
  const videoTitles = new Set();
  const dims = [];
  const norms = [];
  let parseFailures = 0;

  for (const row of allRows) {
    const md = row.metadata || {};
    const course = md.course ?? '(untagged)';
    courseCounts[course] = (courseCounts[course] || 0) + 1;
    const mod = md.module ?? '(none)';
    moduleCounts[mod] = (moduleCounts[mod] || 0) + 1;
    if (md.video_title) videoTitles.add(md.video_title);

    const vec = parseEmbedding(row.embedding);
    if (!vec) {
      parseFailures++;
      continue;
    }
    dims.push(vec.length);
    norms.push(norm(vec));
  }

  console.log('=== Course breakdown (metadata->>course) ===');
  for (const [c, n] of Object.entries(courseCounts)) console.log(`  ${c}: ${n} chunks`);

  console.log('\n=== Module breakdown ===');
  for (const [m, n] of Object.entries(moduleCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${m}: ${n} chunks`);
  }

  console.log(`\n=== Embedding dimension check ===`);
  const dimSet = new Set(dims);
  console.log(`  Distinct dimension values: ${[...dimSet].join(', ')}`);
  console.log(`  Parse failures (null/malformed embedding): ${parseFailures}`);

  console.log(`\n=== Embedding norm check ===`);
  const avgNorm = norms.reduce((a, b) => a + b, 0) / norms.length;
  const minNorm = Math.min(...norms);
  const maxNorm = Math.max(...norms);
  const variance = norms.reduce((a, b) => a + (b - avgNorm) ** 2, 0) / norms.length;
  console.log(`  avg=${avgNorm.toFixed(4)} min=${minNorm.toFixed(4)} max=${maxNorm.toFixed(4)} stddev=${Math.sqrt(variance).toFixed(4)}`);

  const buckets = {};
  for (const n of norms) {
    const b = (Math.floor(n / 0.05) * 0.05).toFixed(2);
    buckets[b] = (buckets[b] || 0) + 1;
  }
  console.log('  Norm histogram (bucket: count):');
  for (const [b, n] of Object.entries(buckets).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
    console.log(`    ${b}: ${'#'.repeat(Math.ceil(n / 5))} (${n})`);
  }

  console.log(`\n=== Distinct video_title values (${videoTitles.size}) ===`);
  for (const t of [...videoTitles].sort()) console.log(`  - ${t}`);

  const targets = [
    'Highlight Section on Instagram',
    'Clone Video',
    'Green Screen',
    'four-tile',
    'Four-Tile',
    'Four Tile',
    'Yap Video',
  ];
  console.log(`\n=== Targeted title matches ===`);
  for (const t of targets) {
    const matches = [...videoTitles].filter(v => v.toLowerCase().includes(t.toLowerCase()));
    console.log(`  "${t}": ${matches.length ? matches.join(' | ') : '(no match)'}`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
