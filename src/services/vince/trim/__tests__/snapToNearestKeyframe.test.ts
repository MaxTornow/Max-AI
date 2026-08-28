/**
 * Unit tests for the pure, non-ffmpeg logic in keyframes.ts.
 * @jest
 */

import { describe, expect, test } from '@jest/globals';
import { snapToNearestKeyframe } from '../snapToNearestKeyframe';

describe('snapToNearestKeyframe', () => {
  const keyframes = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18];

  test('snaps to the exact keyframe when the time already matches one', () => {
    expect(snapToNearestKeyframe(6, keyframes)).toBe(6);
  });

  test('snaps down when closer to the preceding keyframe', () => {
    expect(snapToNearestKeyframe(6.9, keyframes)).toBe(6);
  });

  test('snaps up when closer to the following keyframe', () => {
    expect(snapToNearestKeyframe(7.1, keyframes)).toBe(8);
  });

  test('rounds exact midpoints toward the following keyframe', () => {
    // Math.abs(before) <= Math.abs(after) favors "before" on a tie, so 7.0
    // (equidistant between 6 and 8) should resolve to 6.
    expect(snapToNearestKeyframe(7, keyframes)).toBe(6);
  });

  test('clamps to the first keyframe for times before it', () => {
    expect(snapToNearestKeyframe(-5, keyframes)).toBe(0);
  });

  test('clamps to the last keyframe for times after it', () => {
    expect(snapToNearestKeyframe(999, keyframes)).toBe(18);
  });

  test('handles a single-keyframe array', () => {
    expect(snapToNearestKeyframe(50, [3])).toBe(3);
  });

  test('returns the input time unchanged for an empty keyframe array', () => {
    expect(snapToNearestKeyframe(12.5, [])).toBe(12.5);
  });

  test('works correctly with non-integer keyframe timestamps (e.g. WebM)', () => {
    const webmKeyframes = [0.007, 2.007, 4.007, 6.007, 8.007];
    expect(snapToNearestKeyframe(5.9, webmKeyframes)).toBe(6.007);
    expect(snapToNearestKeyframe(0, webmKeyframes)).toBe(0.007);
  });
});
