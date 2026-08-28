/**
 * VINCE - Keyframe Snapping
 *
 * Deliberately its own file with zero ffmpeg dependency (unlike
 * keyframes.ts's getKeyframeTimestamps, which needs a real ffmpeg.wasm
 * instance) — this keeps the one piece of pure, synchronous logic in this
 * feature trivially unit-testable without pulling in ffmpeg.wasm at all,
 * and safe to call at interactive rates (e.g. every pointermove while
 * dragging a cut handle in a future timeline UI).
 */

/**
 * Finds the nearest value in a sorted array of keyframe timestamps to a
 * candidate cut time. Ties resolve toward the earlier keyframe.
 *
 * @param time - candidate cut point in seconds
 * @param keyframes - sorted keyframe timestamps, as returned by getKeyframeTimestamps()
 */
export function snapToNearestKeyframe(time: number, keyframes: number[]): number {
  if (keyframes.length === 0) return time;
  if (keyframes.length === 1) return keyframes[0];

  let lo = 0;
  let hi = keyframes.length - 1;

  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (keyframes[mid] <= time) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const before = keyframes[lo];
  const after = keyframes[hi];
  return Math.abs(time - before) <= Math.abs(after - time) ? before : after;
}
