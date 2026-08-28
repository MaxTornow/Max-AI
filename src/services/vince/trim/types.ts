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
