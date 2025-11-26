-- ============================================================================
-- 007_videos.sql
-- Videos table - stores BETTY video records and processing status
-- ============================================================================

-- Create videos table
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size_bytes BIGINT,
  duration_seconds INTEGER,
  original_storage_path TEXT NOT NULL,
  processed_storage_path TEXT,
  submagic_project_id TEXT,
  submagic_status TEXT DEFAULT 'pending' CHECK (submagic_status IN ('pending', 'processing', 'completed', 'failed')),
  submagic_download_url TEXT,
  template_name TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  magic_zooms BOOLEAN DEFAULT true,
  magic_brolls BOOLEAN DEFAULT false,
  magic_brolls_percentage INTEGER DEFAULT 30 CHECK (magic_brolls_percentage >= 0 AND magic_brolls_percentage <= 100),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS videos_user_id_idx ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS videos_status_idx ON public.videos(submagic_status);
CREATE INDEX IF NOT EXISTS videos_created_at_idx ON public.videos(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Create policies for videos table
-- Users can view their own videos
CREATE POLICY "Users can view their own videos"
  ON public.videos
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own videos
CREATE POLICY "Users can insert their own videos"
  ON public.videos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own videos
CREATE POLICY "Users can update their own videos"
  ON public.videos
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own videos
CREATE POLICY "Users can delete their own videos"
  ON public.videos
  FOR DELETE
  USING (auth.uid() = user_id);
