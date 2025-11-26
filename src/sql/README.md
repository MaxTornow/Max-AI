# SQL Scripts for Supabase

This folder contains all SQL scripts needed to set up the Supabase database and storage for the MAXAI application.

## Scripts Overview

| Script | Purpose | Status |
|--------|---------|--------|
| `001_profiles.sql` | User profiles table | In Production |
| `002_styles.sql` | Writing styles for AI agents | In Production |
| `003_rewrites.sql` | Content rewrites history | In Production |
| `004_invitations.sql` | User invitation system | In Production |
| `005_conversations.sql` | Chat conversations (future) | Ready for Use |
| `006_messages.sql` | Chat messages (future) | Ready for Use |
| `007_videos.sql` | BETTY video records | In Production |
| `008_videos_storage_policies.sql` | Storage bucket RLS policies | **REQUIRED** |

## Running Order

Scripts are numbered and should be run in order. However, note:

1. **001-007**: Database table scripts (can be run via SQL Editor)
2. **008**: Storage policies (must be run after creating the `videos` bucket)

## Quick Start

### 1. Create the Videos Storage Bucket

In Supabase Dashboard:
1. Go to **Storage** > **New Bucket**
2. Name: `videos`
3. Public: **OFF** (private)
4. File size limit: `2147483648` (2GB)
5. Allowed MIME types: `video/mp4, video/quicktime, video/webm`

### 2. Run Storage Policies

After creating the bucket, run `008_videos_storage_policies.sql` in the SQL Editor.

This creates 4 policies:
- **INSERT**: Users can upload to their own folder
- **SELECT**: Users can view their own files
- **UPDATE**: Users can update their own files
- **DELETE**: Users can delete their own files

### 3. Verify Policies

Run this query to verify all policies are created:

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';
```

Expected output:
```
| policyname                            | cmd    |
|---------------------------------------|--------|
| Users can upload videos to own folder | INSERT |
| Users can view own videos             | SELECT |
| Users can update own videos           | UPDATE |
| Users can delete own videos           | DELETE |
```

## How Storage Policies Work

### Upload Path Format

The app uploads videos to paths like:
```
{userId}/{timestamp}-{filename}
```

Example:
```
2c220e7c-558d-451f-ad22-d44098671e38/1764184652174-Movie.mov
```

### Policy Logic

The policy `(storage.foldername(name))[1] = auth.uid()::text` works as follows:

1. `storage.foldername(name)` extracts folder segments from the path
2. `[1]` gets the first segment (the user ID folder)
3. `auth.uid()::text` gets the authenticated user's ID as text
4. The policy ensures these match, so users can only access their own folder

## Troubleshooting

### Error: "new row violates row-level security policy"

This means storage policies are missing. Run `008_videos_storage_policies.sql`.

### Error: "Bucket not found"

Create the `videos` bucket in Supabase Dashboard first.

### Policies not working

1. Make sure the bucket name is exactly `videos` (case-sensitive)
2. Verify the user is authenticated (not anonymous)
3. Check that the upload path starts with the user's ID

## Related Files

- `src/types/supabase.ts` - TypeScript types for all tables
- `src/services/betty/index.ts` - Betty service using these tables
- `supabase-schema.sql` - Legacy combined schema file
