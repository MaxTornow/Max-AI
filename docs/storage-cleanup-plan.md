# Plan: Auto-Delete Original Videos After Processing + One-Time Cleanup

## Context

Supabase Storage is at **103.32 GB / 100 GB** (Pro Plan). All storage is VINCE videos. The root cause: both original uploads AND processed videos are kept forever with no cleanup. After processing completes, the original serves no purpose — users only download the processed version. Deleting originals for completed videos should reclaim ~50% of storage immediately, and auto-deleting going forward prevents recurrence.

**Zero room for error** — we never delete an original unless the processed version is confirmed saved in Supabase Storage (not a URL fallback).

---

## Files to Modify

| File | Change |
|------|--------|
| `src/services/vince/index.ts` | Add `deleteOriginalVideo()` and `completeVideoProcessing()` |
| `src/pages/vince/VincePage.tsx` | Replace 3 duplicated completion code blocks with single `completeVideoProcessing()` call |
| `scripts/cleanup-originals.mjs` | **New file** — one-time cleanup script for existing completed videos |

---

## Part 1: Add Centralized Completion Logic (`src/services/vince/index.ts`)

### 1a. Add `deleteOriginalVideo()` (after `saveProcessedVideo`, ~line 201)

```typescript
export const deleteOriginalVideo = async (
  originalStoragePath: string
): Promise<void> => {
  console.log('Cleaning up original video file:', originalStoragePath);
  const { error } = await supabase.storage
    .from('videos')
    .remove([originalStoragePath]);
  if (error) {
    console.warn('Failed to delete original video (non-fatal):', error);
  } else {
    console.log('Original video deleted successfully:', originalStoragePath);
  }
};
```

- Uses existing authenticated Supabase client (RLS allows users to delete in their own `{userId}/` folder)
- Errors are **non-fatal** — logged as warnings, never thrown
- Idempotent — calling on an already-deleted file returns success (Supabase `remove` behavior)

### 1b. Add `completeVideoProcessing()` (after `deleteOriginalVideo`)

```typescript
export const completeVideoProcessing = async (
  videoId: string,
  userId: string,
  originalFilename: string,
  originalStoragePath: string,
  downloadUrl: string
): Promise<string> => {
  // 1. Download from Submagic and save to Supabase Storage
  const processedPath = await saveProcessedVideo(downloadUrl, userId, originalFilename);

  // 2. Update database record
  await updateVideoRecord(videoId, {
    submagic_status: 'completed',
    processed_storage_path: processedPath,
    submagic_download_url: downloadUrl,
    processing_completed_at: new Date().toISOString(),
  });

  // 3. Delete original ONLY if processed was saved to storage (not URL fallback)
  if (!processedPath.startsWith('http')) {
    await deleteOriginalVideo(originalStoragePath);
  }

  return processedPath;
};
```

**Critical safety gate:** `!processedPath.startsWith('http')` — when `saveProcessedVideo` fails to download from Submagic (CORS), it returns the CDN URL as fallback. In that case, no processed file exists in our storage, so we must keep the original.

---

## Part 2: Replace 3 Duplicated Completion Paths (`VincePage.tsx`)

Currently, 3 places in VincePage.tsx repeat the same `saveProcessedVideo` → `updateVideoRecord` pattern. Replace all 3 with a single `completeVideoProcessing()` call.

### Import change (line ~24)

- Add `completeVideoProcessing` to imports from `@services/vince`
- Remove `saveProcessedVideo` from imports (no longer called directly from VincePage)
- Keep `updateVideoRecord` (still used for failure handling elsewhere)

### Path 1: Timeout sync (lines 254–265)

Replace `saveProcessedVideo` + `updateVideoRecord` block with:

```typescript
await completeVideoProcessing(
  video.id, user!.id, video.original_filename,
  video.original_storage_path, videoUrl
);
```

### Path 2: Normal sync (lines 287–294)

Same replacement — `video` object has `original_storage_path`:

```typescript
await completeVideoProcessing(
  video.id, user!.id, video.original_filename,
  video.original_storage_path, videoUrl
);
```

### Path 3: Active polling (lines 432–445)

Uses `selectedFile?.name` and needs `original_storage_path` from `uploadState`:

```typescript
await completeVideoProcessing(
  currentVideoId, user!.id,
  selectedFile?.name || 'video.mp4',
  uploadState.status === 'uploaded' ? uploadState.storagePath : '',
  videoUrl
);
```

`uploadState.storagePath` is always set before polling reaches completion:

- Set at line 553 during initial upload
- Set at line 321 during sync UI restore
- If somehow empty, `deleteOriginalVideo('')` is a safe no-op

---

## Part 3: One-Time Cleanup Script (`scripts/cleanup-originals.mjs`)

Follows existing conventions from `scripts/update-transcripts.mjs`: `.mjs`, manual `.env` loading, service role key, `--dry-run`.

### Logic

1. **Load env** — `SUPABASE_URL` (or `VITE_SUPABASE_URL`) + `SUPABASE_SERVICE_ROLE_KEY`
2. **Create admin client** — `createClient(url, serviceRoleKey)` to bypass RLS
3. **Query eligible videos:**
   ```sql
   SELECT id, original_storage_path, processed_storage_path, file_size_bytes, title
   FROM videos
   WHERE submagic_status = 'completed'
     AND processed_storage_path IS NOT NULL
     AND processed_storage_path NOT LIKE 'http%'
   ```
4. **For each video:**
   - **Verify** processed file exists: `createSignedUrl(processed_storage_path, 60)` — if fails, **SKIP** and log warning
   - **Delete** original: `storage.remove([original_storage_path])`
   - **Log** action with video title and file size
5. **Print summary:** total files deleted, total bytes reclaimed, any skipped

### Usage

```bash
# See what would be deleted
node scripts/cleanup-originals.mjs --dry-run

# Execute deletions
node scripts/cleanup-originals.mjs --execute
```

Default behavior (no flag) = **dry-run** for safety. Must explicitly pass `--execute` to delete.

---

## Part 4: Impact on Existing `deleteVideo()` — NO CHANGES NEEDED

`deleteVideo()` (line 330–369) always tries `storage.remove([original_storage_path])`. After our changes, the original may already be gone. This is fine — Supabase `remove` is idempotent and returns success for non-existent files. The `storageError` warning at line 351–354 is a soft warning that won't break the flow.

---

## Safety Summary

| Scenario | What happens | Safe? |
|----------|-------------|-------|
| Processed saved to storage → delete original | Original deleted, processed serves downloads | Yes |
| Processed fell back to URL (CORS failure) | `startsWith('http')` guard prevents deletion | Yes |
| `deleteVideo()` called after original already gone | `remove()` is idempotent, returns success | Yes |
| Cleanup script: processed file missing from storage | `createSignedUrl` fails → video skipped | Yes |
| Cleanup script run twice | Second run: files already gone, no-op | Yes |
| `original_storage_path` DB column after deletion | Path stays (column is NOT NULL), file just gone | Yes |

---

## Execution Order

1. Create cleanup script (`scripts/cleanup-originals.mjs`)
2. Run `--dry-run` to assess scope and verify correctness
3. Make code changes (`index.ts` + `VincePage.tsx`)
4. Test locally: upload → process → verify original deleted + download works + library delete works
5. Deploy code changes
6. Run cleanup script with `--execute` on production

---

## Verification

1. **After code change:** Upload and process a test video. Confirm in Supabase Storage dashboard:
   - Processed file exists at `{userId}/processed/...`
   - Original file at `{userId}/...` is gone
   - Download from library works
   - Delete from library works (no errors despite missing original)
2. **After cleanup script dry-run:** Verify listed videos match expectations (completed, with local processed path)
3. **After cleanup script execute:** Check Supabase Storage dashboard — storage usage should drop significantly
