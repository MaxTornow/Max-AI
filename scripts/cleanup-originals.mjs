#!/usr/bin/env node

/**
 * One-Time Original Video Cleanup
 *
 * Deletes original video files from Supabase Storage for videos that have
 * already been processed and have a confirmed processed file in storage.
 *
 * Safety gates:
 *   - Only targets videos with submagic_status = 'completed'
 *   - For local processed files: verifies file exists via createSignedUrl before deleting
 *   - For URL fallback files: also deletes originals (processed URLs are expired/dead)
 *   - Default mode is dry-run; must pass --execute to delete
 *
 * Modes:
 *   --local-only    Only clean originals that have a local processed file (safest)
 *   --include-urls  Also clean originals where processed is a URL fallback (frees most space)
 *
 * Usage:
 *   node scripts/cleanup-originals.mjs --dry-run                    # Preview local-only cleanup
 *   node scripts/cleanup-originals.mjs --dry-run --include-urls     # Preview full cleanup
 *   node scripts/cleanup-originals.mjs --execute                    # Execute local-only cleanup
 *   node scripts/cleanup-originals.mjs --execute --include-urls     # Execute full cleanup
 *
 * Environment (loaded from .env automatically):
 *   SUPABASE_SERVICE_ROLE_KEY - Required to bypass RLS
 *   SUPABASE_URL              - Falls back to VITE_SUPABASE_URL
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// ── Arg parsing ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const DRY_RUN = !EXECUTE;
const INCLUDE_URLS = args.includes('--include-urls');
const INCLUDE_FAILED = args.includes('--failed');

if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE — no files will be deleted. Pass --execute to delete.');
} else {
  console.log('⚠️  EXECUTE MODE — original video files will be deleted.');
}
if (INCLUDE_URLS) {
  console.log('   Including URL-fallback videos (Submagic CDN URLs are expired/dead).');
}
if (INCLUDE_FAILED) {
  console.log('   Including failed videos (never produced a processed result).');
}
console.log();

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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.');
  console.error('Set them in your .env file or environment.');
  process.exit(1);
}

// ── Supabase admin client (bypasses RLS) ────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  let deletedCount = 0;
  let skippedCount = 0;
  let totalBytesReclaimed = 0;

  // ── Phase 1: Videos with local processed files ──────────────────
  console.log('Phase 1: Querying completed videos with local processed files...');
  const { data: localVideos, error: localError } = await supabase
    .from('videos')
    .select('id, title, original_storage_path, processed_storage_path, file_size_bytes')
    .eq('submagic_status', 'completed')
    .not('processed_storage_path', 'is', null)
    .not('processed_storage_path', 'like', 'http%');

  if (localError) {
    console.error('Query failed:', localError.message);
    process.exit(1);
  }

  console.log(`  Found ${localVideos?.length || 0} video(s) with local processed files.`);

  for (const video of localVideos || []) {
    const label = `[${video.title || video.id}]`;

    // Verify processed file exists before deleting original
    const { data: signedData, error: signedError } = await supabase.storage
      .from('videos')
      .createSignedUrl(video.processed_storage_path, 60);

    if (signedError || !signedData?.signedUrl) {
      console.warn(`  ${label} SKIP — processed file not found in storage: ${video.processed_storage_path}`);
      skippedCount++;
      continue;
    }

    const sizeStr = video.file_size_bytes
      ? `${(video.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
      : 'unknown size';

    if (DRY_RUN) {
      console.log(`  ${label} WOULD DELETE original (${sizeStr}): ${video.original_storage_path}`);
    } else {
      const { error: deleteError } = await supabase.storage
        .from('videos')
        .remove([video.original_storage_path]);

      if (deleteError) {
        console.warn(`  ${label} DELETE FAILED: ${deleteError.message}`);
        skippedCount++;
        continue;
      }
      console.log(`  ${label} DELETED original (${sizeStr}): ${video.original_storage_path}`);
    }

    deletedCount++;
    if (video.file_size_bytes) totalBytesReclaimed += video.file_size_bytes;
  }

  // ── Phase 2: Videos with URL-fallback processed paths ───────────
  if (INCLUDE_URLS) {
    console.log('\nPhase 2: Querying completed videos with URL-fallback processed paths...');
    console.log('  (Submagic CDN URLs expire — these originals are dead weight.)\n');

    // Paginate to get all rows (Supabase defaults to 1000 limit)
    let urlVideos = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data, error: urlErr } = await supabase
        .from('videos')
        .select('id, title, original_storage_path, file_size_bytes')
        .eq('submagic_status', 'completed')
        .like('processed_storage_path', 'http%')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (urlErr) {
        console.error('Query failed:', urlErr.message);
        process.exit(1);
      }
      if (!data || data.length === 0) break;
      urlVideos = urlVideos.concat(data);
      if (data.length < PAGE_SIZE) break;
      page++;
    }

    console.log(`  Found ${urlVideos.length} video(s) with expired URL fallbacks.`);

    // Process in batches to avoid overwhelming the API
    const BATCH_SIZE = 20;
    const videos = urlVideos;

    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batch = videos.slice(i, i + BATCH_SIZE);
      const paths = batch.map(v => v.original_storage_path);

      if (DRY_RUN) {
        for (const video of batch) {
          const sizeStr = video.file_size_bytes
            ? `${(video.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
            : 'unknown size';
          console.log(`  [${video.title || video.id}] WOULD DELETE original (${sizeStr})`);
        }
      } else {
        const { error: deleteError } = await supabase.storage
          .from('videos')
          .remove(paths);

        if (deleteError) {
          console.warn(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} DELETE FAILED: ${deleteError.message}`);
          skippedCount += batch.length;
          continue;
        }
        console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: deleted ${batch.length} originals`);
      }

      for (const video of batch) {
        if (video.file_size_bytes) totalBytesReclaimed += video.file_size_bytes;
      }
      deletedCount += batch.length;
    }
  }

  // ── Phase 3: Failed videos (never produced a result) ─────────────
  if (INCLUDE_FAILED) {
    console.log('\nPhase 3: Querying failed videos (no processed result exists)...');

    let failedVideos = [];
    let fPage = 0;
    const F_PAGE_SIZE = 1000;
    while (true) {
      const { data, error: fErr } = await supabase
        .from('videos')
        .select('id, title, original_storage_path, file_size_bytes')
        .eq('submagic_status', 'failed')
        .range(fPage * F_PAGE_SIZE, (fPage + 1) * F_PAGE_SIZE - 1);

      if (fErr) {
        console.error('Query failed:', fErr.message);
        process.exit(1);
      }
      if (!data || data.length === 0) break;
      failedVideos = failedVideos.concat(data);
      if (data.length < F_PAGE_SIZE) break;
      fPage++;
    }

    console.log(`  Found ${failedVideos.length} failed video(s).`);

    const BATCH_SIZE_F = 20;
    for (let i = 0; i < failedVideos.length; i += BATCH_SIZE_F) {
      const batch = failedVideos.slice(i, i + BATCH_SIZE_F);
      const paths = batch.map(v => v.original_storage_path);

      if (DRY_RUN) {
        for (const video of batch) {
          const sizeStr = video.file_size_bytes
            ? `${(video.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
            : 'unknown size';
          console.log(`  [${video.title || video.id}] WOULD DELETE original (${sizeStr})`);
        }
      } else {
        const { error: deleteError } = await supabase.storage
          .from('videos')
          .remove(paths);

        if (deleteError) {
          console.warn(`  Batch ${Math.floor(i / BATCH_SIZE_F) + 1} DELETE FAILED: ${deleteError.message}`);
          skippedCount += batch.length;
          continue;
        }
        console.log(`  Batch ${Math.floor(i / BATCH_SIZE_F) + 1}: deleted ${batch.length} originals`);
      }

      for (const video of batch) {
        if (video.file_size_bytes) totalBytesReclaimed += video.file_size_bytes;
      }
      deletedCount += batch.length;
    }
  }

  // ── Summary ─────────────────────────────────────────────────────
  const totalMB = (totalBytesReclaimed / (1024 * 1024)).toFixed(1);
  const totalGB = (totalBytesReclaimed / (1024 * 1024 * 1024)).toFixed(2);

  const modeFlags = [INCLUDE_URLS ? 'include-urls' : '', INCLUDE_FAILED ? 'failed' : ''].filter(Boolean).join(' + ');
  console.log('\n── Summary ──────────────────────────────────────────');
  console.log(`  Mode:         ${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}${modeFlags ? ' + ' + modeFlags : ''}`);
  console.log(`  ${DRY_RUN ? 'Would delete' : 'Deleted'}:  ${deletedCount} original file(s)`);
  console.log(`  Skipped:      ${skippedCount} file(s)`);
  console.log(`  Reclaimed:    ~${totalMB} MB (${totalGB} GB)`);

  if (DRY_RUN && deletedCount > 0) {
    console.log('\n  Run with --execute to perform deletions.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
