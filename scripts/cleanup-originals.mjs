#!/usr/bin/env node

/**
 * Original Video Retention-Window Cleanup
 *
 * Deletes original video files from Supabase Storage for videos whose
 * processing completed more than RETENTION_DAYS ago. This is a retention
 * window, not immediate post-caption deletion: originals are kept around
 * after Submagic finishes so features like re-processing/trimming can still
 * use them, and are only reclaimed once they're older than the window.
 *
 * Storage context: Supabase Storage previously hit 103GB/100GB (Pro plan)
 * because originals were kept forever. This job exists to keep that in
 * check without deleting originals the moment captioning finishes.
 *
 * Intended to run on a recurring schedule (e.g. daily). NOT wired up to a
 * scheduler yet (Netlify scheduled function / n8n / cron are all options,
 * decided separately) — this is the script logic only.
 *
 * Age is measured from the video's *completion* date, not its upload date:
 *   - Phase 1 & 2 (completed videos): `processing_completed_at`
 *   - Phase 3 (--failed, opt-in):     `updated_at` (when it was marked failed;
 *     failed videos have no completion date)
 *
 * Safety gates:
 *   - Only targets videos with submagic_status = 'completed' (or 'failed' with --failed)
 *   - Only targets videos older than the retention window (default 30 days)
 *   - For local processed files: verifies file exists via createSignedUrl before deleting
 *   - For URL fallback files: also gated by the retention window (see note below)
 *   - Default mode is dry-run; must pass --execute to delete
 *
 * Modes:
 *   --local-only          Only clean originals that have a local processed file (safest)
 *   --include-urls        Also clean originals where processed is a URL fallback
 *   --failed               Also clean originals for failed videos (no processed result ever existed)
 *   --retention-days=N    Override the retention window in days (default 30)
 *
 * Note on --include-urls: a URL-fallback "processed" video is just a Submagic
 * CDN link that expires within hours, so once its original is deleted there is
 * no durable copy of that video left at all. It's still gated by the same
 * retention window as local files (rather than deleted on sight) so users get
 * the same grace period to re-download/re-process before it's gone for good.
 *
 * Usage:
 *   node scripts/cleanup-originals.mjs --dry-run                                   # Preview local-only cleanup, 30-day window
 *   node scripts/cleanup-originals.mjs --dry-run --include-urls                    # Preview full cleanup
 *   node scripts/cleanup-originals.mjs --dry-run --retention-days=14               # Preview with a shorter window
 *   node scripts/cleanup-originals.mjs --execute                                   # Execute local-only cleanup
 *   node scripts/cleanup-originals.mjs --execute --include-urls                    # Execute full cleanup
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

const DEFAULT_RETENTION_DAYS = 30;
const retentionArg = args.find((a) => a.startsWith('--retention-days='));
const RETENTION_DAYS = retentionArg
  ? Number(retentionArg.split('=')[1])
  : DEFAULT_RETENTION_DAYS;

if (!Number.isFinite(RETENTION_DAYS) || RETENTION_DAYS <= 0) {
  console.error(`Error: --retention-days must be a positive number (got "${retentionArg}").`);
  process.exit(1);
}

const CUTOFF_ISO = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE — no files will be deleted. Pass --execute to delete.');
} else {
  console.log('⚠️  EXECUTE MODE — original video files will be deleted.');
}
console.log(`   Retention window: ${RETENTION_DAYS} day(s) — deleting originals completed before ${CUTOFF_ISO}`);
if (INCLUDE_URLS) {
  console.log('   Including URL-fallback videos (still gated by the retention window).');
}
if (INCLUDE_FAILED) {
  console.log('   Including failed videos (gated by retention window since they were marked failed).');
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

  // ── Phase 1: Videos with local processed files, past retention window ──
  console.log('Phase 1: Querying completed videos with local processed files past the retention window...');

  // Paginate to get all rows (Supabase defaults to 1000 limit)
  let localVideos = [];
  {
    let page = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data, error: localError } = await supabase
        .from('videos')
        .select('id, title, original_storage_path, processed_storage_path, file_size_bytes, processing_completed_at')
        .eq('submagic_status', 'completed')
        .not('processed_storage_path', 'is', null)
        .not('processed_storage_path', 'like', 'http%')
        .not('processing_completed_at', 'is', null)
        .lte('processing_completed_at', CUTOFF_ISO)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (localError) {
        console.error('Query failed:', localError.message);
        process.exit(1);
      }
      if (!data || data.length === 0) break;
      localVideos = localVideos.concat(data);
      if (data.length < PAGE_SIZE) break;
      page++;
    }
  }

  console.log(`  Found ${localVideos.length} video(s) with local processed files past the retention window.`);

  for (const video of localVideos) {
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

  // ── Phase 2: Videos with URL-fallback processed paths, past retention window ──
  if (INCLUDE_URLS) {
    console.log('\nPhase 2: Querying completed videos with URL-fallback processed paths past the retention window...');
    console.log('  (Submagic CDN URLs expire — once deleted, no durable copy remains.)\n');

    // Paginate to get all rows (Supabase defaults to 1000 limit)
    let urlVideos = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data, error: urlErr } = await supabase
        .from('videos')
        .select('id, title, original_storage_path, file_size_bytes, processing_completed_at')
        .eq('submagic_status', 'completed')
        .like('processed_storage_path', 'http%')
        .not('processing_completed_at', 'is', null)
        .lte('processing_completed_at', CUTOFF_ISO)
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

    console.log(`  Found ${urlVideos.length} video(s) with expired URL fallbacks past the retention window.`);

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

  // ── Phase 3: Failed videos, past retention window (never produced a result) ──
  if (INCLUDE_FAILED) {
    console.log('\nPhase 3: Querying failed videos past the retention window (no processed result exists)...');

    let failedVideos = [];
    let fPage = 0;
    const F_PAGE_SIZE = 1000;
    while (true) {
      const { data, error: fErr } = await supabase
        .from('videos')
        .select('id, title, original_storage_path, file_size_bytes, updated_at')
        .eq('submagic_status', 'failed')
        .lte('updated_at', CUTOFF_ISO)
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

    console.log(`  Found ${failedVideos.length} failed video(s) past the retention window.`);

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
  console.log(`  Retention:    ${RETENTION_DAYS} day(s) (cutoff: ${CUTOFF_ISO})`);
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
