/**
 * Shared retention-window cleanup logic for original video files.
 *
 * Used by both the manual CLI (scripts/cleanup-originals.mjs) and the
 * n8n-scheduled HTTP endpoint (netlify/functions/cleanup-originals-run.js).
 * Keeping the query/deletion logic in one place means the two entry points
 * can't drift out of sync with each other.
 *
 * Age is always measured from when a video finished processing, not when it
 * was uploaded:
 *   - Phases 'local' and 'url' (submagic_status = 'completed'): processing_completed_at
 *   - Phase 'failed' (submagic_status = 'failed'): updated_at (failed videos
 *     have no completion date — this is when they were marked failed)
 *
 * This file is deliberately .cjs (CommonJS), not .mjs, even though the rest
 * of this project is "type": "module". Netlify's function bundler can trace
 * and transform this file's *content* to CommonJS while leaving an .mjs
 * *extension* untouched — Node then refuses to load it (the extension forces
 * ESM parsing, but the content is CJS). A .cjs extension is unambiguous
 * either way, so there's nothing for a bundler-version difference to get
 * wrong. Both consumers (the ESM CLI script and the Netlify function) import
 * this via a CJS-from-ESM path, which Node supports natively.
 */

const DEFAULT_RETENTION_DAYS = 30;

const PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 20;

function cutoffFromRetentionDays(retentionDays) {
  return new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
}

/** Runs `queryFn(from, to)` across pages until Supabase returns a short page. */
async function fetchAllPages(queryFn) {
  let rows = [];
  let page = 0;
  while (true) {
    const { data, error } = await queryFn(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    rows = rows.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  return rows;
}

/** Phase 'local': completed videos with a local processed file, past the cutoff. */
async function fetchLocalPhaseRows(supabase, cutoffIso) {
  const rows = await fetchAllPages((from, to) =>
    supabase
      .from('videos')
      .select('id, title, original_storage_path, processed_storage_path, file_size_bytes, processing_completed_at')
      .eq('submagic_status', 'completed')
      .not('processed_storage_path', 'is', null)
      .not('processed_storage_path', 'like', 'http%')
      .not('processing_completed_at', 'is', null)
      .lte('processing_completed_at', cutoffIso)
      .range(from, to)
  );
  return rows.map((row) => ({ ...row, phase: 'local' }));
}

/** Phase 'url': completed videos whose processed path is a URL fallback, past the cutoff. */
async function fetchUrlPhaseRows(supabase, cutoffIso) {
  const rows = await fetchAllPages((from, to) =>
    supabase
      .from('videos')
      .select('id, title, original_storage_path, file_size_bytes, processing_completed_at')
      .eq('submagic_status', 'completed')
      .like('processed_storage_path', 'http%')
      .not('processing_completed_at', 'is', null)
      .lte('processing_completed_at', cutoffIso)
      .range(from, to)
  );
  return rows.map((row) => ({ ...row, phase: 'url' }));
}

/** Phase 'failed': videos that never produced a result, past the cutoff. */
async function fetchFailedPhaseRows(supabase, cutoffIso) {
  const rows = await fetchAllPages((from, to) =>
    supabase
      .from('videos')
      .select('id, title, original_storage_path, file_size_bytes, updated_at')
      .eq('submagic_status', 'failed')
      .lte('updated_at', cutoffIso)
      .range(from, to)
  );
  return rows.map((row) => ({ ...row, phase: 'failed' }));
}

function sizeStrFor(video) {
  return video.file_size_bytes
    ? `${(video.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
    : 'unknown size';
}

/**
 * Runs the retention-window cleanup and returns a structured summary.
 * Per-video/per-batch storage failures are recorded (skipped/errors), never
 * thrown; only a failed DB query aborts the run.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - admin client (service role)
 * @param {object} options
 * @param {number} [options.retentionDays] - only touch videos completed/failed this many days ago or more
 * @param {boolean} [options.includeUrls] - also clean originals for URL-fallback processed videos
 * @param {boolean} [options.includeFailed] - also clean originals for failed videos
 * @param {boolean} [options.dryRun] - if true (default), never actually deletes
 * @param {number} [options.maxPerRun] - cap on total videos processed this invocation, across all active phases
 * @param {(...args: any[]) => void} [options.log]
 * @param {(...args: any[]) => void} [options.warn]
 */
async function runCleanupOriginals(supabase, options = {}) {
  const {
    retentionDays = DEFAULT_RETENTION_DAYS,
    includeUrls = false,
    includeFailed = false,
    dryRun = true,
    maxPerRun = Infinity,
    log = () => {},
    warn = () => {},
  } = options;

  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    throw new Error(`retentionDays must be a positive number (got ${retentionDays})`);
  }
  if (!Number.isFinite(maxPerRun) && maxPerRun !== Infinity) {
    throw new Error(`maxPerRun must be a positive number or Infinity (got ${maxPerRun})`);
  }

  const cutoffIso = cutoffFromRetentionDays(retentionDays);
  log(`Retention window: ${retentionDays} day(s) — cutoff ${cutoffIso}`);

  const localRows = await fetchLocalPhaseRows(supabase, cutoffIso);
  const urlRows = includeUrls ? await fetchUrlPhaseRows(supabase, cutoffIso) : [];
  const failedRows = includeFailed ? await fetchFailedPhaseRows(supabase, cutoffIso) : [];

  // Priority order when capping: local, then url, then failed — matches the
  // original script's phase order.
  const allRows = [...localRows, ...urlRows, ...failedRows];
  const scanned = allRows.length;

  const toProcess = Number.isFinite(maxPerRun) ? allRows.slice(0, maxPerRun) : allRows;
  const backlogRemaining = allRows.length - toProcess.length;
  const capped = backlogRemaining > 0;

  let eligible = 0;
  let deletedOrWouldDelete = 0;
  let skipped = 0;
  let errors = 0;
  let bytesReclaimed = 0;

  // ── Phase 'local': verify processed file exists, then delete one at a time ──
  const localToProcess = toProcess.filter((r) => r.phase === 'local');
  if (localToProcess.length > 0) {
    log(`Phase local: ${localToProcess.length} video(s) to process.`);
  }
  for (const video of localToProcess) {
    const label = `[${video.title || video.id}]`;

    const { data: signedData, error: signedError } = await supabase.storage
      .from('videos')
      .createSignedUrl(video.processed_storage_path, 60);

    if (signedError || !signedData?.signedUrl) {
      warn(`  ${label} SKIP — processed file not found in storage: ${video.processed_storage_path}`);
      skipped++;
      continue;
    }

    eligible++;

    if (dryRun) {
      log(`  ${label} WOULD DELETE original (${sizeStrFor(video)}): ${video.original_storage_path}`);
    } else {
      const { error: deleteError } = await supabase.storage.from('videos').remove([video.original_storage_path]);
      if (deleteError) {
        warn(`  ${label} DELETE FAILED: ${deleteError.message}`);
        errors++;
        continue;
      }
      log(`  ${label} DELETED original (${sizeStrFor(video)}): ${video.original_storage_path}`);
    }

    deletedOrWouldDelete++;
    if (video.file_size_bytes) bytesReclaimed += video.file_size_bytes;
  }

  // ── Phases 'url' and 'failed': no per-row check, batched delete ──
  const batchedPhases = [
    ['url', toProcess.filter((r) => r.phase === 'url')],
    ['failed', toProcess.filter((r) => r.phase === 'failed')],
  ];

  for (const [phaseName, rows] of batchedPhases) {
    if (rows.length === 0) continue;
    log(`Phase ${phaseName}: ${rows.length} video(s) to process.`);

    for (let i = 0; i < rows.length; i += DELETE_BATCH_SIZE) {
      const batch = rows.slice(i, i + DELETE_BATCH_SIZE);
      eligible += batch.length;
      const paths = batch.map((v) => v.original_storage_path);

      if (dryRun) {
        for (const video of batch) {
          log(`  [${video.title || video.id}] WOULD DELETE original (${sizeStrFor(video)})`);
        }
      } else {
        const { error: deleteError } = await supabase.storage.from('videos').remove(paths);
        if (deleteError) {
          warn(`  Batch DELETE FAILED (${phaseName}): ${deleteError.message}`);
          errors += batch.length;
          continue;
        }
        log(`  Batch: deleted ${batch.length} original(s) (${phaseName})`);
      }

      deletedOrWouldDelete += batch.length;
      for (const video of batch) {
        if (video.file_size_bytes) bytesReclaimed += video.file_size_bytes;
      }
    }
  }

  return {
    retentionDays,
    cutoffIso,
    dryRun,
    includeUrls,
    includeFailed,
    scanned,
    eligible,
    deletedOrWouldDelete,
    skipped,
    errors,
    bytesReclaimed,
    capped,
    backlogRemaining,
  };
}

module.exports = { runCleanupOriginals, DEFAULT_RETENTION_DAYS };
