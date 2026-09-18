/**
 * Caption correction API calls: editing Submagic's word-level transcript and
 * triggering a re-render so the correction is reflected in the final video.
 *
 * Split out from captions.ts (which holds the pure, import.meta.env-free
 * helpers) because this file transitively imports index.ts for the Submagic
 * API config/GET call -- importing it from a component that's directly unit
 * tested (e.g. VideoCard) would pull in index.ts's `import.meta.env` usage,
 * which is not parseable by Jest. Only CaptionReview.tsx (the actual save
 * flow) needs this file.
 *
 * Confirmed live against a real Submagic project (Sep 18, 2026):
 * - PUT /v1/projects/:id with { words: [...] } requires the FULL words
 *   array -- add a word with no `id` to insert one, omit a word to remove
 *   it -- strictly sorted by startTime. The GET response is not reliably
 *   ordered (silence entries can carry timestamps from a different
 *   reference point than surrounding words), and an unsorted PUT is
 *   rejected with VALIDATION_ERROR.
 * - Editing text alone does not re-render the video. A separate
 *   POST /v1/projects/:id/export (empty body) triggers the re-render;
 *   downloadUrl/directUrl only reflect the correction once that completes.
 * - downloadUrl can briefly still show the PREVIOUS render's URL right
 *   after export starts, before clearing and regenerating -- polling must
 *   wait for a URL different from the one recorded before export, not just
 *   any non-empty URL (this caused one false-positive "done" in manual
 *   testing before the guard below was added).
 * - Retroactive correction works fine on an already-rendered project
 *   (default autoRender: true) -- no special-casing needed for videos
 *   already in the library.
 */

import type { SubmagicWord, SubmagicProjectResponse } from './types';
import { SUBMAGIC_API_URL, SUBMAGIC_API_KEY, getSubmagicProjectStatus } from './index';
import { retryableFetch } from './retry';
import { sortTranscriptWords } from './captions';

const EXPORT_POLL_INTERVAL_MS = 5000;
const EXPORT_POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/** Update a project's transcript. Always sorts before sending -- see module docs. */
export const updateSubmagicTranscript = async (
  projectId: string,
  words: SubmagicWord[]
): Promise<void> => {
  if (!SUBMAGIC_API_KEY) {
    throw new Error('Submagic API key not configured');
  }

  await retryableFetch(
    `${SUBMAGIC_API_URL}/projects/${projectId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SUBMAGIC_API_KEY,
      },
      body: JSON.stringify({ words: sortTranscriptWords(words) }),
    },
    'Failed to update captions'
  );
};

/** Trigger a re-export so a transcript correction is reflected in the rendered video. */
export const exportSubmagicProject = async (projectId: string): Promise<void> => {
  if (!SUBMAGIC_API_KEY) {
    throw new Error('Submagic API key not configured');
  }

  await retryableFetch(
    `${SUBMAGIC_API_URL}/projects/${projectId}/export`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SUBMAGIC_API_KEY,
      },
      body: JSON.stringify({}),
    },
    'Failed to export project'
  );
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Poll until the project's video URL changes from `previousVideoUrl` -- NOT
 * just until a URL is present, since downloadUrl can briefly still show the
 * stale pre-export render right after export starts. See module docs.
 */
export const pollForNewRender = async (
  projectId: string,
  previousVideoUrl: string | undefined,
  options?: { intervalMs?: number; timeoutMs?: number }
): Promise<SubmagicProjectResponse> => {
  const intervalMs = options?.intervalMs ?? EXPORT_POLL_INTERVAL_MS;
  const deadline = Date.now() + (options?.timeoutMs ?? EXPORT_POLL_TIMEOUT_MS);

  const poll = async (): Promise<SubmagicProjectResponse> => {
    const status = await getSubmagicProjectStatus(projectId);

    if (status.status === 'failed') {
      throw new Error(status.errorMessage || 'Export failed');
    }

    const currentUrl = status.downloadUrl || status.directUrl;
    if (status.status === 'completed' && currentUrl && currentUrl !== previousVideoUrl) {
      return status;
    }

    if (Date.now() >= deadline) {
      throw new Error('Timed out waiting for the corrected video to finish rendering');
    }

    await sleep(intervalMs);
    return poll();
  };

  return poll();
};

/**
 * Full caption-correction save flow: update the transcript, trigger a
 * re-export, and wait for the new render to be ready.
 */
export const saveCaptionCorrections = async (
  projectId: string,
  words: SubmagicWord[],
  previousVideoUrl: string | undefined
): Promise<SubmagicProjectResponse> => {
  await updateSubmagicTranscript(projectId, words);
  await exportSubmagicProject(projectId);
  return pollForNewRender(projectId, previousVideoUrl);
};
