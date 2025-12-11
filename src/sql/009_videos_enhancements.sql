-- ============================================================================
-- 009_videos_enhancements.sql
-- Add columns for Submagic enhancement features:
-- - Remove Silence (removeSilencePace)
-- - Remove Filler Words (removeBadTakes)
-- - Hook Title (hookTitle)
-- ============================================================================

-- Add new columns for Submagic enhancement settings
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS remove_silence_pace TEXT DEFAULT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS remove_bad_takes BOOLEAN DEFAULT false;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS hook_title_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS hook_title_text TEXT DEFAULT NULL;

-- Valid values for remove_silence_pace: NULL (off), 'natural', 'fast', 'extra-fast'
-- Add a check constraint for valid pace values
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_remove_silence_pace_check;
ALTER TABLE public.videos ADD CONSTRAINT videos_remove_silence_pace_check
  CHECK (remove_silence_pace IS NULL OR remove_silence_pace IN ('natural', 'fast', 'extra-fast'));

-- Comment on columns for documentation
COMMENT ON COLUMN public.videos.remove_silence_pace IS 'Silence removal pace: NULL (off), natural, fast, extra-fast';
COMMENT ON COLUMN public.videos.remove_bad_takes IS 'Remove filler words/bad takes (adds ~1-2 min processing time)';
COMMENT ON COLUMN public.videos.hook_title_enabled IS 'Add animated intro caption';
COMMENT ON COLUMN public.videos.hook_title_text IS 'Custom hook title text (NULL = AI-generated)';
