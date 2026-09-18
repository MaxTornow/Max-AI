/**
 * Pure caption-correction helpers -- no API calls, no `import.meta.env`.
 * Kept dependency-free (only ./types) so components like VideoCard/VideoLibrary
 * can safely import these to decide whether to show a "Review Captions" action,
 * without transitively pulling in index.ts (which reads import.meta.env at
 * module scope and is not parseable by Jest -- same reasoning as retry.ts
 * being kept "env-free so it can be unit-tested without import.meta.env").
 *
 * The actual PUT/export API calls live in captionCorrection.ts.
 */

import type { SubmagicWord } from './types';
import { HOOK_OVERLAY_DURATION_SECONDS } from './types';

/** Sort transcript words by startTime -- the API requires this on every PUT. */
export const sortTranscriptWords = (words: SubmagicWord[]): SubmagicWord[] =>
  [...words].sort((a, b) => a.startTime - b.startTime);

/**
 * True if a word falls inside the video's animated hook-title overlay window,
 * where on-screen text is a separate AI-paraphrased sentence, not driven by
 * the transcript -- editing such a word via the API succeeds but is
 * invisible in the rendered video. See HOOK_OVERLAY_DURATION_SECONDS for
 * why this is a provisional estimate, not a confirmed boundary.
 */
export const isWordInHookWindow = (word: SubmagicWord, hookTitleEnabled: boolean): boolean =>
  hookTitleEnabled && word.startTime < HOOK_OVERLAY_DURATION_SECONDS;

/**
 * True if a transcript has at least one word a user could plausibly want to
 * correct -- used to decide whether to offer caption review for a video at all.
 */
export const hasEditableCaptionWords = (words: SubmagicWord[]): boolean =>
  words.some((word) => word.type === 'word');
