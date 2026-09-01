/**
 * VINCE - Client-Side Trim (public API)
 *
 * Scoped to new uploads only: trimming happens on a raw File client-side,
 * BEFORE uploadAndCreateVideoRecord() is ever called (see VincePage.tsx).
 * Re-trimming an already-uploaded/processed video is out of scope — that's
 * the same handleReprocess() gap flagged and deferred earlier in this
 * project, unaffected by this feature.
 */

export { getKeyframeTimestamps } from './keyframes';
export { snapToNearestKeyframe } from './snapToNearestKeyframe';
export { trimVideo } from './trimVideo';
export { TrimError } from './types';
export type { TrimSegment, TrimProgress, TrimPhase, TrimErrorReason } from './types';
