# Plan: Retention-Window Cleanup of Original Videos

## Status

**Revised 2026-08-07.** The original version of this plan (auto-delete the
original immediately once Submagic captioning finished) has been reverted.
Immediate deletion left no window for future features — re-processing,
re-downloading, or trimming — to use the original once captioning was done,
and it removed the seam a planned trim/cut feature needs (trim has to run
*before* captioning, on a file that's still there).

The storage constraint that motivated auto-deletion in the first place is
still real (see Context below), so this isn't "keep everything forever" —
it's a **30-day retention window**: originals are kept after captioning
completes and only reclaimed once they're older than the window, via a
scheduled cleanup job instead of an immediate delete in the completion path.

---

## Context

Supabase Storage hit **103.32 GB / 100 GB** (Pro Plan). All storage is VINCE
videos. The root cause: both original uploads AND processed videos were kept
forever with no cleanup. Once a video's processed version has existed for
long enough that nobody is realistically going back to trim/re-process it,
the original stops earning its keep — but "long enough" is now a window
(default 30 days), not "the instant captioning finishes."

**Zero room for error** — we never delete an original unless the processed
version is confirmed saved in Supabase Storage (not a URL fallback), and now
also only once it's past the retention window.

---

## Current Behavior (as implemented)

| File | Behavior |
|------|----------|
| `src/services/vince/index.ts` | `completeVideoProcessing()` saves the processed video and updates the DB record, but does **not** call `deleteOriginalVideo()`. The original is left in place after captioning. `deleteOriginalVideo()` still exists as a function, just isn't called automatically. |
| `src/pages/vince/VincePage.tsx` | `handleProcessVideo()` is split into `uploadAndCreateVideoRecord()` (upload + DB record) and `submitVideoForCaptioning()` (triggers Submagic), called back-to-back today. This is the seam a future trim step will insert into, between upload and the Submagic call. |
| `scripts/cleanup-originals.mjs` | Adapted from a one-time cleanup script into retention-window cleanup logic (see below). Not yet wired to a scheduler. |

---

## Retention-Window Cleanup Script (`scripts/cleanup-originals.mjs`)

### Logic

1. **Load env** — `SUPABASE_URL` (or `VITE_SUPABASE_URL`) + `SUPABASE_SERVICE_ROLE_KEY`
2. **Create admin client** — `createClient(url, serviceRoleKey)` to bypass RLS
3. **Compute cutoff** — `now - RETENTION_DAYS` (default 30, override with `--retention-days=N`)
4. **Phase 1 — completed videos with a local processed file, past the cutoff:**
   ```sql
   SELECT id, title, original_storage_path, processed_storage_path,
          file_size_bytes, processing_completed_at
   FROM videos
   WHERE submagic_status = 'completed'
     AND processed_storage_path IS NOT NULL
     AND processed_storage_path NOT LIKE 'http%'
     AND processing_completed_at IS NOT NULL
     AND processing_completed_at <= <cutoff>
   ```
   For each: verify the processed file still exists via `createSignedUrl(processed_storage_path, 60)` — if that fails, **skip and warn** rather than delete. Otherwise delete the original.
5. **Phase 2 — `--include-urls` (opt-in):** same idea, but for videos whose processed path is a URL fallback (`processed_storage_path LIKE 'http%'`), gated by the same `processing_completed_at <= <cutoff>` check. These CDN URLs expire in hours regardless, but the original is still held for the full retention window rather than deleted on sight — same grace period as local-file videos.
6. **Phase 3 — `--failed` (opt-in):** videos that never produced a result at all. There's no completion date for a failed video, so age is measured from `updated_at` (when it was marked failed) instead of `processing_completed_at`.
7. **Print summary:** retention window used, files deleted/skipped, bytes reclaimed.

Age is always based on **when the video finished processing (or failed), not when it was uploaded** — a video uploaded a year ago but completed yesterday is not eligible for deletion yet.

### Usage

```bash
# See what would be deleted (30-day window, local-processed-file videos only)
node scripts/cleanup-originals.mjs --dry-run

# Preview with URL-fallback videos included too
node scripts/cleanup-originals.mjs --dry-run --include-urls

# Preview with a different window
node scripts/cleanup-originals.mjs --dry-run --retention-days=14

# Execute
node scripts/cleanup-originals.mjs --execute
node scripts/cleanup-originals.mjs --execute --include-urls
```

Default behavior (no `--execute`) = **dry-run** for safety.

### Scheduling — not yet decided

This script is meant to run on a recurring basis (e.g. daily) once trusted,
but is **not wired to any scheduler yet**. Options under consideration:
Netlify scheduled function, n8n, or a plain external cron hitting a small
trigger endpoint. That decision is separate from the script logic above and
will be made once the retention-window behavior itself has been validated
with `--dry-run` against production data.

---

## Impact on Existing `deleteVideo()` (library manual delete) — no change

`deleteVideo()` in `src/services/vince/index.ts` always tries
`storage.remove([original_storage_path])` regardless of whether the
retention job already deleted it. This is fine — Supabase `remove` is
idempotent and returns success for non-existent files; the soft warning on
failure doesn't break the delete flow.

---

## Known Follow-Up (explicitly out of scope here)

`handleReprocess()` in `VincePage.tsx` currently can't reuse a video's
original — for videos outside the retention window it will already be gone,
and even inside the window there's no code path that reuses it — so
re-processing forces a fresh upload. This is a real gap for a future
trim/re-process feature, but is being addressed separately once that
feature's design is locked, not as part of this fix.

---

## Safety Summary

| Scenario | What happens | Safe? |
|----------|-------------|-------|
| Processed saved to storage, still within retention window | Original kept | Yes |
| Processed saved to storage, past retention window | `createSignedUrl` verifies processed file first, then original deleted | Yes |
| Processed fell back to URL (CORS failure), within retention window | Original kept regardless of `--include-urls` (cutoff not reached) | Yes |
| Processed fell back to URL, past retention window, `--include-urls` passed | Original deleted (no durable copy exists once it's gone — accepted tradeoff of the URL-fallback path) | Yes, by design |
| `deleteVideo()` called after original already gone | `remove()` is idempotent, returns success | Yes |
| Cleanup script: processed file missing from storage | `createSignedUrl` fails → video skipped | Yes |
| Cleanup script run twice | Second run: already-deleted files are no-ops | Yes |
| `original_storage_path` DB column after deletion | Path stays (column is NOT NULL), file just gone | Yes |

---

## Verification

1. **Code change (deletion removed from completion path):** Upload and process a test video. Confirm in Supabase Storage dashboard that the original is **still present** after captioning completes, alongside the processed file.
2. **Cleanup script dry-run:** Run `--dry-run` against production data and confirm only videos completed more than 30 days ago are listed.
3. **Cleanup script execute (once scheduling is decided):** Check Supabase Storage dashboard — storage usage should trend down as the backlog of old originals clears, while recently-completed videos keep their originals.
