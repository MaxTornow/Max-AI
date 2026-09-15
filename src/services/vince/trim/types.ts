/**
 * VINCE - Client-Side Trim Types
 */

/** A segment of the source video to keep, in seconds (source timeline). */
export interface TrimSegment {
  start: number;
  end: number;
}

/** Phases of the trim pipeline, in order. */
export type TrimPhase =
  | 'loading-ffmpeg'
  | 'detecting-keyframes'
  | 'extracting-segments'
  | 'concatenating'
  | 'completed';

export interface TrimProgress {
  phase: TrimPhase;
  /** 0-100, progress within the current phase. */
  progress: number;
  message: string;
}

/** Reasons a trim can fail, distinguished so callers can show a specific message. */
export type TrimErrorReason =
  | 'unsupported-format'
  | 'file-too-large'
  | 'ffmpeg-failed'
  | 'oom'
  | 'aborted'
  | 'unknown';

export class TrimError extends Error {
  reason: TrimErrorReason;

  constructor(reason: TrimErrorReason, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'TrimError';
    this.reason = reason;
  }
}

/**
 * Maximum file size this module will attempt to process, in bytes.
 *
 * CONFIRMED (2026-09-15) via real-device testing on an iPhone in Safari,
 * HEVC .MOV files:
 *   - ~400MB: getKeyframeTimestamps() and trimVideo() both completed
 *     successfully end-to-end (full pipeline, clean output file).
 *   - ~568MB: correctly rejected by this guard before any processing
 *     began (working as intended — over the 500MB cap).
 *   - ~1.5GB (1,566,946,479 bytes): reproduced twice, silently killed the
 *     tab (full page reload, no catchable JS error — Safari exposes no
 *     memory-pressure API to detect this ahead of time, so there is no
 *     way to warn and recover mid-operation, only to refuse upfront).
 * The range between ~500MB and ~1.5GB was deliberately not bisected
 * further — chasing an exact crash boundary wouldn't generalize across
 * devices/content anyway. 500MB was kept as the v1 cap, giving real
 * margin below the confirmed-safe point and well below the confirmed
 * failure. See the PR discussion around this commit for the full
 * reasoning.
 */
export const MAX_TRIM_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

/**
 * Throws TrimError('file-too-large') if `file` exceeds
 * MAX_TRIM_FILE_SIZE_BYTES. Called as the very first thing in both
 * getKeyframeTimestamps() and trimVideo(), before ffmpeg.wasm is loaded or
 * any bytes of the file are touched — an oversized file is rejected
 * instantly rather than risking the silent, uncatchable tab crash this
 * guards against.
 */
export function assertFileSizeWithinTrimLimit(file: File): void {
  if (file.size > MAX_TRIM_FILE_SIZE_BYTES) {
    const fileMb = Math.round(file.size / (1024 * 1024));
    const limitMb = Math.round(MAX_TRIM_FILE_SIZE_BYTES / (1024 * 1024));
    throw new TrimError(
      'file-too-large',
      `This video (${fileMb} MB) is larger than the ${limitMb} MB limit we can safely trim in your browser. You can still upload and caption it without trimming.`
    );
  }
}
