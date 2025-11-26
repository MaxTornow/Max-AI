-- ============================================================================
-- 003_rewrites.sql
-- Rewrites table - stores content rewrites from AI agents (AVA, VERA, etc.)
-- ============================================================================

-- Create rewrites table
CREATE TABLE IF NOT EXISTS public.rewrites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  variations JSONB NOT NULL DEFAULT '[]'::jsonb,
  parameters JSONB NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS rewrites_user_id_idx ON public.rewrites(user_id);
CREATE INDEX IF NOT EXISTS rewrites_platform_idx ON public.rewrites(platform);

-- Enable Row Level Security
ALTER TABLE public.rewrites ENABLE ROW LEVEL SECURITY;

-- Create policies for rewrites table
-- Users can only view their own rewrites
CREATE POLICY "Users can view their own rewrites"
  ON public.rewrites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own rewrites
CREATE POLICY "Users can insert their own rewrites"
  ON public.rewrites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own rewrites
CREATE POLICY "Users can update their own rewrites"
  ON public.rewrites
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own rewrites
CREATE POLICY "Users can delete their own rewrites"
  ON public.rewrites
  FOR DELETE
  USING (auth.uid() = user_id);
