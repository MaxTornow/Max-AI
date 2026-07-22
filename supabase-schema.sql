-- ============================================================================
-- MAXAI Supabase Schema
-- Complete database and storage setup for the MAXAI application
--
-- Last Updated: 2025-11-26
-- Individual scripts available in: src/sql/
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{"theme": "light", "notifications": true}'::jsonb,
  role TEXT DEFAULT 'user' NOT NULL
);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. STYLES TABLE
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS styles_user_id_idx ON public.styles(user_id);
ALTER TABLE public.styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own styles"
  ON public.styles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own styles"
  ON public.styles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own styles"
  ON public.styles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own styles"
  ON public.styles FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 3. REWRITES TABLE
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS rewrites_user_id_idx ON public.rewrites(user_id);
CREATE INDEX IF NOT EXISTS rewrites_platform_idx ON public.rewrites(platform);
ALTER TABLE public.rewrites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rewrites"
  ON public.rewrites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own rewrites"
  ON public.rewrites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own rewrites"
  ON public.rewrites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own rewrites"
  ON public.rewrites FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 4. INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS invitations_email_idx ON public.invitations(email);
CREATE INDEX IF NOT EXISTS invitations_token_idx ON public.invitations(token);
CREATE INDEX IF NOT EXISTS invitations_status_idx ON public.invitations(status);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all invitations"
  ON public.invitations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can update invitations"
  ON public.invitations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can delete invitations"
  ON public.invitations FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Anyone can check invitation by token"
  ON public.invitations FOR SELECT USING (true);

-- ============================================================================
-- 5. CONVERSATIONS TABLE (Future Use)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('ava', 'vera', 'lara', 'lacy', 'franck', 'faris', 'sage', 'aimax')),
  is_archived BOOLEAN DEFAULT false NOT NULL
);

CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS conversations_agent_type_idx ON public.conversations(agent_type);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own conversations"
  ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversations"
  ON public.conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own conversations"
  ON public.conversations FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 6. MESSAGES TABLE (Future Use)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  attachments TEXT[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "Users can insert messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "Users can update messages in their conversations"
  ON public.messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "Users can delete messages in their conversations"
  ON public.messages FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));

-- ============================================================================
-- 7. VIDEOS TABLE (BETTY)
-- ============================================================================
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

CREATE INDEX IF NOT EXISTS videos_user_id_idx ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS videos_status_idx ON public.videos(submagic_status);
CREATE INDEX IF NOT EXISTS videos_created_at_idx ON public.videos(created_at DESC);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own videos"
  ON public.videos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own videos"
  ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own videos"
  ON public.videos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own videos"
  ON public.videos FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 8. STORAGE BUCKET POLICIES (VIDEOS)
-- ============================================================================
-- NOTE: Run these AFTER creating the 'videos' bucket in Supabase Dashboard
--
-- Bucket settings:
--   - Name: videos
--   - Public: false
--   - File size limit: 2147483648 (2GB)
--   - Allowed MIME types: video/mp4, video/quicktime, video/webm
--
-- Upload path format: {userId}/{timestamp}-{filename}
-- Example: 2c220e7c-558d-451f-ad22-d44098671e38/1764184652174-Movie.mov
-- ============================================================================

-- INSERT: Allow users to upload to their own folder
CREATE POLICY "Users can upload videos to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- SELECT: Allow users to view their own files
CREATE POLICY "Users can view own videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: Allow users to update their own files
CREATE POLICY "Users can update own videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: Allow users to delete their own files
CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
