-- ============================================================================
-- 008_videos_storage_policies.sql
-- Storage bucket policies for the 'videos' bucket
--
-- IMPORTANT: This script creates RLS policies for Supabase Storage.
-- These policies are SEPARATE from database table policies.
-- Without these policies, authenticated users cannot upload/download files.
--
-- The upload path format in the app is: {userId}/{timestamp}-{filename}
-- Example: 2c220e7c-558d-451f-ad22-d44098671e38/1764184652174-Movie.mov
--
-- The policy checks that the first folder segment matches the user's auth.uid()
-- ============================================================================

-- First, ensure the videos bucket exists (run in Supabase Dashboard if this fails)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'videos',
--   'videos',
--   false,
--   2147483648,  -- 2GB
--   ARRAY['video/mp4', 'video/quicktime', 'video/webm']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INSERT Policy: Allow authenticated users to upload to their own folder
-- ============================================================================
-- This policy allows users to upload files ONLY to paths that start with their user ID
-- Path format: {auth.uid()}/{any-filename}
CREATE POLICY "Users can upload videos to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- SELECT Policy: Allow users to read/download their own files
-- ============================================================================
-- This policy allows users to read files ONLY from paths that start with their user ID
CREATE POLICY "Users can view own videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- UPDATE Policy: Allow users to update/replace their own files
-- ============================================================================
-- This policy allows users to update files ONLY in paths that start with their user ID
CREATE POLICY "Users can update own videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- DELETE Policy: Allow users to delete their own files
-- ============================================================================
-- This policy allows users to delete files ONLY from paths that start with their user ID
CREATE POLICY "Users can delete own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- VERIFICATION QUERIES (Run these after creating policies to verify)
-- ============================================================================
-- Check that all 4 policies exist:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
--
-- Expected output:
-- | policyname                           | cmd    |
-- |--------------------------------------|--------|
-- | Users can upload videos to own folder| INSERT |
-- | Users can view own videos            | SELECT |
-- | Users can update own videos          | UPDATE |
-- | Users can delete own videos          | DELETE |
