#!/usr/bin/env node

/**
 * Original Video Retention-Window Cleanup (manual CLI)
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
 * This is the manual entry point. The same logic also runs on a schedule via
 * netlify/functions/cleanup-originals-run.js (triggered by n8n) — both call
 * scripts/lib/cleanupOriginals.cjs so they can't drift out of sync.
 *
 * Age is measured from the video's *completion* date, not its upload date:
 *   - Phase local & url (completed videos): `processing_completed_at`
 *   - Phase failed (--failed, opt-in):      `updated_at` (when it was marked
 *     failed; failed videos have no completion date)
 *
 * Safety gates:
 *   - Only targets videos with submagic_status = 'completed' (or 'failed' with --failed)
 *   - Only targets videos older than the retention window (default 30 days)
 *   - For local processed files: verifies file exists via createSignedUrl before deleting
 *   - For URL fallback files: also gated by the retention window (see note below)
 *   - Default mode is dry-run; must pass --execute to delete
 *
 * Modes:
 *   --local-only          Only clean originals that have a local processed file (safest, default)
 *   --include-urls        Also clean originals where processed is a URL fallback
 *   --failed               Also clean originals for failed videos (no processed result ever existed)
 *   --retention-days=N    Override the retention window in days (default 30)
 *   --max-per-run=N       Cap total videos processed this run (default unlimited for manual CLI use)
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
import { runCleanupOriginals, DEFAULT_RETENTION_DAYS } from './lib/cleanupOriginals.cjs';

// ── Arg parsing ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const DRY_RUN = !EXECUTE;
const INCLUDE_URLS = args.includes('--include-urls');
const INCLUDE_FAILED = args.includes('--failed');

const retentionArg = args.find((a) => a.startsWith('--retention-days='));
const RETENTION_DAYS = retentionArg ? Number(retentionArg.split('=')[1]) : DEFAULT_RETENTION_DAYS;

const maxArg = args.find((a) => a.startsWith('--max-per-run='));
const MAX_PER_RUN = maxArg ? Number(maxArg.split('=')[1]) : Infinity;

if (!Number.isFinite(RETENTION_DAYS) || RETENTION_DAYS <= 0) {
  console.error(`Error: --retention-days must be a positive number (got "${retentionArg}").`);
  process.exit(1);
}
if (maxArg && (!Number.isFinite(MAX_PER_RUN) || MAX_PER_RUN <= 0)) {
  console.error(`Error: --max-per-run must be a positive number (got "${maxArg}").`);
  process.exit(1);
}

if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE — no files will be deleted. Pass --execute to delete.');
} else {
  console.log('⚠️  EXECUTE MODE — original video files will be deleted.');
}
console.log(`   Retention window: ${RETENTION_DAYS} day(s)`);
if (INCLUDE_URLS) {
  console.log('   Including URL-fallback videos (still gated by the retention window).');
}
if (INCLUDE_FAILED) {
  console.log('   Including failed videos (gated by retention window since they were marked failed).');
}
if (Number.isFinite(MAX_PER_RUN)) {
  console.log(`   Capped at ${MAX_PER_RUN} video(s) this run.`);
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
  const summary = await runCleanupOriginals(supabase, {
    retentionDays: RETENTION_DAYS,
    includeUrls: INCLUDE_URLS,
    includeFailed: INCLUDE_FAILED,
    dryRun: DRY_RUN,
    maxPerRun: MAX_PER_RUN,
    log: console.log,
    warn: console.warn,
  });

  const totalMB = (summary.bytesReclaimed / (1024 * 1024)).toFixed(1);
  const totalGB = (summary.bytesReclaimed / (1024 * 1024 * 1024)).toFixed(2);

  console.log('\n── Summary ──────────────────────────────────────────');
  console.log(`  Mode:         ${summary.dryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`  Retention:    ${summary.retentionDays} day(s) (cutoff: ${summary.cutoffIso})`);
  console.log(`  Scanned:      ${summary.scanned} video(s)`);
  console.log(`  Eligible:     ${summary.eligible} video(s)`);
  console.log(`  ${summary.dryRun ? 'Would delete' : 'Deleted'}:  ${summary.deletedOrWouldDelete} original file(s)`);
  console.log(`  Skipped:      ${summary.skipped} file(s)`);
  console.log(`  Errors:       ${summary.errors} file(s)`);
  console.log(`  Reclaimed:    ~${totalMB} MB (${totalGB} GB)`);
  if (summary.capped) {
    console.log(`  Capped:       yes — ${summary.backlogRemaining} more eligible video(s) beyond this run's limit`);
  }

  if (summary.dryRun && summary.deletedOrWouldDelete > 0) {
    console.log('\n  Run with --execute to perform deletions.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
