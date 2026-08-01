-- ============================================================================
-- 011_videos_caption_position.sql
-- Add columns for body caption position (Submagic API captionPositionX/Y)
--
-- ⚠️ UNCONFIRMED RANGE: Submagic's dev team confirmed these two fields exist
-- (undocumented in their public API as of Aug 2026) and suggested a "likely
-- 0-100" range by analogy to hookTitle.top. That same kind of analogy already
-- proved wrong once: hookTitle.top's original "likely 0-100" hint turned out
-- to actually be 0-80 in production (see 010_videos_hook_title_position.sql).
-- Treat the 0-100 bound below as a permissive placeholder sanity check, not a
-- verified constraint — tighten it once confirmed against real Submagic API
-- behavior or updated docs.
--
-- ⚠️ UNCONFIRMED PAYLOAD SHAPE: these are wired up as top-level fields on the
-- Submagic create-project request body (SubmagicCreateProjectRequest), not
-- nested under a caption-specific object. This has not been verified against
-- a real Submagic API response.
-- ============================================================================

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS caption_position_x INTEGER DEFAULT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS caption_position_y INTEGER DEFAULT NULL;

-- Valid values: NULL (not set by user, Submagic applies its own default) or 0-100 (UNCONFIRMED placeholder, see note above)
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_caption_position_x_check;
ALTER TABLE public.videos ADD CONSTRAINT videos_caption_position_x_check
  CHECK (caption_position_x IS NULL OR (caption_position_x >= 0 AND caption_position_x <= 100));

ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_caption_position_y_check;
ALTER TABLE public.videos ADD CONSTRAINT videos_caption_position_y_check
  CHECK (caption_position_y IS NULL OR (caption_position_y >= 0 AND caption_position_y <= 100));

COMMENT ON COLUMN public.videos.caption_position_x IS 'Body caption horizontal position from Submagic captionPositionX field (undocumented in public API as of Aug 2026). Range 0-100 is an UNCONFIRMED placeholder, not verified with Submagic -- hookTitle_position''s equivalent "likely 0-100" guess turned out to actually be 0-80. NULL = not set by user, Submagic applies its own default.';
COMMENT ON COLUMN public.videos.caption_position_y IS 'Body caption vertical position from Submagic captionPositionY field. See caption_position_x for range/shape caveats. NULL = not set by user.';
