-- ============================================================================
-- 012_videos_original_deleted_at.sql
-- Tracks when a video's original file was actually deleted from Storage by
-- the retention-window cleanup job (scripts/lib/cleanupOriginals.cjs, run
-- via scripts/cleanup-originals.mjs and netlify/functions/cleanup-originals-run.js).
--
-- Without this column, the cleanup job's eligibility queries had no way to
-- know an original had already been removed (original_storage_path stays
-- populated in the DB after deletion), so already-cleaned rows kept getting
-- re-selected as "eligible" on every subsequent run forever. This column
-- gives the job a persistent completion marker to filter on.
-- ============================================================================

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS original_deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN public.videos.original_deleted_at IS 'Set by the retention-window cleanup job when original_storage_path has been deleted (or confirmed already absent) from Storage. NULL = original still present / not yet processed by the job.';

-- ── One-time backfill ────────────────────────────────────────────────────
-- These 2 videos' originals were deleted by an --execute run of
-- cleanup-originals-run.js before this column existed (confirmed via Netlify
-- function logs: "DELETED original" for both, ~10:10:04 on the day this
-- migration was written). Mark them now so they stop showing as eligible
-- once the updated query (which filters on original_deleted_at IS NULL)
-- ships. Safe to run more than once — the WHERE clause is idempotent.
UPDATE public.videos
SET original_deleted_at = now()
WHERE original_storage_path IN (
  '2c220e7c-558d-451f-ad22-d44098671e38/1774381832440-IMG_7783.MOV',
  '2c220e7c-558d-451f-ad22-d44098671e38/1774382482502-IMG_7783.MOV'
)
AND original_deleted_at IS NULL;
