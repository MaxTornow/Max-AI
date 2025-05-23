-- Create styles table
CREATE TABLE IF NOT EXISTS public.styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  niche TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  pain_points TEXT[] NOT NULL DEFAULT '{}',
  communication_style TEXT NOT NULL,
  hero_story TEXT
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS styles_user_id_idx ON public.styles(user_id);

-- Enable Row Level Security
ALTER TABLE public.styles ENABLE ROW LEVEL SECURITY;

-- Create policies for styles table
-- Users can only view their own styles
CREATE POLICY "Users can view their own styles" 
  ON public.styles 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own styles
CREATE POLICY "Users can insert their own styles" 
  ON public.styles 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own styles
CREATE POLICY "Users can update their own styles" 
  ON public.styles 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own styles
CREATE POLICY "Users can delete their own styles" 
  ON public.styles 
  FOR DELETE 
  USING (auth.uid() = user_id);
