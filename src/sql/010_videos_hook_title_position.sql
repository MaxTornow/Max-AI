-- ============================================================================
-- 010_videos_hook_title_position.sql
-- Add column for hook title vertical position (Submagic API top param: 0-80)
-- ============================================================================

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS hook_title_position INTEGER DEFAULT NULL;

-- Valid values: NULL (default/not set) or 0-80 per Submagic API
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_hook_title_position_check;
ALTER TABLE public.videos ADD CONSTRAINT videos_hook_title_position_check
  CHECK (hook_title_position IS NULL OR (hook_title_position >= 0 AND hook_title_position <= 80));

COMMENT ON COLUMN public.videos.hook_title_position IS 'Hook title vertical position (0-80, NULL = Submagic default of 50)';
