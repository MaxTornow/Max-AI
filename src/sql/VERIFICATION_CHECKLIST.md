# Storage Policy Verification Checklist

## Triple Verification: Will This Policy Work?

### Verification 1: Upload Path Format Match

**App Code** (`src/services/betty/index.ts:92`):
```typescript
const path = `${userId}/${timestamp}-${safeName}`;
```

**Generated Path Example**:
```
2c220e7c-558d-451f-ad22-d44098671e38/1764184652174-Movie_on_11-26-25_at_2.15_PM.mov
```

**Policy Check**:
```sql
(storage.foldername(name))[1] = auth.uid()::text
```

**How It Works**:
1. `storage.foldername('2c220e7c-558d-451f-ad22-d44098671e38/1764184652174-Movie.mov')`
   → Returns: `['2c220e7c-558d-451f-ad22-d44098671e38']`
2. `[1]` gets the first element (PostgreSQL arrays are 1-indexed)
   → Returns: `'2c220e7c-558d-451f-ad22-d44098671e38'`
3. `auth.uid()::text` returns the authenticated user's ID as text

**MATCH**: The first folder segment IS the user ID

---

### Verification 2: Bucket Name Match

**App Code** (`src/services/betty/index.ts:101-102`):
```typescript
const { data, error } = await supabase.storage
  .from('videos')  // <-- bucket name
  .upload(path, file, {...});
```

**Policy Check**:
```sql
bucket_id = 'videos'
```

**MATCH**: Bucket name is exactly `'videos'` in both

---

### Verification 3: User ID Source Match

**App Code** (`src/pages/betty/BettyPage.tsx:194`):
```typescript
const { path, url } = await uploadVideoToStorage(selectedFile, user.id, ...)
```

**Where `user` comes from**:
```typescript
const { user } = useAuth();  // From Supabase auth session
```

**Policy Check**:
```sql
auth.uid()::text
```

**How It Works**:
- `useAuth()` returns the user from `supabase.auth.getUser()` or `supabase.auth.getSession()`
- `auth.uid()` in Supabase SQL returns the user ID from the JWT token
- These are **THE SAME VALUE** from the same authentication session

**MATCH**: `user.id` === `auth.uid()`

---

## Verification Summary

| Check | App Value | Policy Value | Status |
|-------|-----------|--------------|--------|
| Path Format | `{userId}/{timestamp}-{filename}` | `(storage.foldername(name))[1]` | MATCH |
| Bucket Name | `'videos'` | `bucket_id = 'videos'` | MATCH |
| User ID | `user.id` from useAuth() | `auth.uid()::text` | MATCH |

## Confidence Level: HIGH

The storage policies will work correctly with the app because:

1. **Path structure is correct**: The app creates paths with `userId` as the first folder segment, and the policy checks exactly that.

2. **Bucket name matches exactly**: Both use `'videos'` (case-sensitive).

3. **Authentication flow is correct**: The app uses Supabase auth, and the policy uses `auth.uid()` which reads from the same auth session.

4. **Policy applies to authenticated users**: The `TO authenticated` clause ensures only logged-in users can access, and the app already checks `if (!user) return` before uploading.

---

## How to Apply the Fix

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `008_videos_storage_policies.sql`
3. Click **Run**
4. Verify with this query:
   ```sql
   SELECT policyname, cmd
   FROM pg_policies
   WHERE tablename = 'objects' AND schemaname = 'storage'
   AND policyname LIKE '%video%';
   ```
5. Expected result: 4 policies (INSERT, SELECT, UPDATE, DELETE)

---

## Post-Fix Verification

After applying the policies, test by:

1. Log in to the app
2. Navigate to BETTY
3. Upload a small test video
4. Verify:
   - No RLS error appears
   - File appears in Supabase Storage under `videos/{your-user-id}/`
   - Console shows "Video uploaded successfully"
