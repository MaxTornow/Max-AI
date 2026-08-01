-- ============================================================================
-- 011_videos_caption_position.sql
-- Add columns for body caption position (Submagic API captionPositionX/Y)
--
-- Ranges confirmed via live API testing against Submagic's create-project
-- endpoint on Aug 1, 2026 (validation error responses):
--   - captionPositionX: 0-100  ("captionPositionX must be between 0 and 100")
--   - captionPositionY: 0-80   ("captionPositionY must be between 0 and 80")
-- These ranges are NOT symmetric: Y shares hookTitle.top's 0-80 ceiling, X
-- does not.
--
-- Payload shape confirmed as top-level fields on the Submagic create-project
-- request body (SubmagicCreateProjectRequest), not nested under a
-- caption-specific object.
-- ============================================================================

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS caption_position_x INTEGER DEFAULT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS caption_position_y INTEGER DEFAULT NULL;

-- Valid values: NULL (not set by user, Submagic applies its own default) or 0-100
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_caption_position_x_check;
ALTER TABLE public.videos ADD CONSTRAINT videos_caption_position_x_check
  CHECK (caption_position_x IS NULL OR (caption_position_x >= 0 AND caption_position_x <= 100));

-- Valid values: NULL (not set by user, Submagic applies its own default) or 0-80
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_caption_position_y_check;
ALTER TABLE public.videos ADD CONSTRAINT videos_caption_position_y_check
  CHECK (caption_position_y IS NULL OR (caption_position_y >= 0 AND caption_position_y <= 80));

COMMENT ON COLUMN public.videos.caption_position_x IS 'Body caption horizontal position from Submagic captionPositionX field. Range 0-100 confirmed via live API validation error testing (Aug 1, 2026). NULL = not set by user, Submagic applies its own default.';
COMMENT ON COLUMN public.videos.caption_position_y IS 'Body caption vertical position from Submagic captionPositionY field. Range 0-80 confirmed via live API validation error testing (Aug 1, 2026) -- matches hookTitle.top''s ceiling, NOT the same range as caption_position_x. NULL = not set by user, Submagic applies its own default.';
