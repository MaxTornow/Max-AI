import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiScissors, FiPlus, FiX, FiAlertCircle, FiInfo, FiLoader, FiPlay, FiPause } from 'react-icons/fi';
import type { TrimSegment } from '@services/vince/trim';
// Imported directly from their own files, NOT the '@services/vince/trim'
// barrel — the barrel's index.ts unconditionally re-exports
// getKeyframeTimestamps/trimVideo too, which would pull ffmpeg.wasm into
// this component's bundle even though this file only needs these two
// pure, dependency-free pieces. getKeyframeTimestamps itself (the one
// that actually needs ffmpeg.wasm) is loaded via dynamic import below,
// matching the pattern VincePage.tsx already uses for trimVideo.
import { snapToNearestKeyframe } from '@services/vince/trim/snapToNearestKeyframe';
import { assertFileSizeWithinTrimLimit } from '@services/vince/trim/types';

/**
 * Multi-segment cut timeline: draggable cut regions (start/end handles via
 * pointer events, not native range inputs), live keyframe snapping, and
 * neighbor-boundary clamping so cuts can never overlap or cross — each
 * handle's drag range is constrained to its immediate neighbors (or the
 * video's true bounds) rather than validated after the fact, so an invalid
 * arrangement is simply unreachable.
 */

// Minimum length (seconds) for a cut region and for the keep-region
// between two cuts (or between a cut and the video's edge), so a drag
// can't collapse either down to nothing.
const MIN_SEGMENT_SECONDS = 0.5;

// Cap on simultaneous cuts — each one is an extra ffmpeg segment-extraction
// + concat entry, so more cuts means more exec() calls and more chances
// for one to fail mid-pipeline.
const MAX_CUTS = 5;

// Below this, a keyframe-snap falling short of the video's true start/end
// isn't worth calling out — it reads as normal snapping, not a surprise.
const NOTICEABLE_GAP_SECONDS = 0.3;
const EPSILON = 0.01;

interface Cut {
  id: string;
  start: number;
  end: number;
}

interface TrimTimelineProps {
  file: File;
  onTrimSegmentsChange: (segments: TrimSegment[] | null) => void;
  disabled?: boolean;
}

function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Converts cut regions (what's removed) to the keep-segments the trim
 * module actually consumes — the complement of the cuts against the full
 * duration. Cuts are never overlapping/unsorted by construction (drag is
 * clamped to neighbors), but this sorts defensively anyway since it's the
 * one function every other calculation in this file builds on. */
function cutsToKeepSegments(cuts: Cut[], duration: number): TrimSegment[] | null {
  if (cuts.length === 0) return null;

  const sorted = [...cuts].sort((a, b) => a.start - b.start);
  const keep: TrimSegment[] = [];
  let cursor = 0;

  for (const cut of sorted) {
    if (cut.start > cursor) {
      keep.push({ start: cursor, end: cut.start });
    }
    cursor = Math.max(cursor, cut.end);
  }
  if (cursor < duration) {
    keep.push({ start: cursor, end: duration });
  }

  return keep.length > 0 ? keep : null;
}

interface UsableGap {
  start: number;
  end: number;
  usableStart: number;
  usableEnd: number;
  usableLength: number;
}

/** Finds the largest kept gap that can still fit a new cut without
 * violating the minimum keep-length against its neighbors — a gap
 * touching the video's true start/end doesn't need a buffer on that side,
 * since there's no neighbor cut there to protect. Placing every new cut
 * inside a gap sized this way guarantees it never overlaps an existing
 * one and never starts life below the minimum keep-length. */
function findLargestUsableGap(cuts: Cut[], duration: number): UsableGap | null {
  const keepGaps = cutsToKeepSegments(cuts, duration) ?? [{ start: 0, end: duration }];
  let best: UsableGap | null = null;

  for (const gap of keepGaps) {
    const hasLeftNeighbor = gap.start > EPSILON;
    const hasRightNeighbor = gap.end < duration - EPSILON;
    const usableStart = gap.start + (hasLeftNeighbor ? MIN_SEGMENT_SECONDS : 0);
    const usableEnd = gap.end - (hasRightNeighbor ? MIN_SEGMENT_SECONDS : 0);
    const usableLength = usableEnd - usableStart;

    if (usableLength >= MIN_SEGMENT_SECONDS && (!best || usableLength > best.usableLength)) {
      best = { start: gap.start, end: gap.end, usableStart, usableEnd, usableLength };
    }
  }

  return best;
}

const TrimTimeline: React.FC<TrimTimelineProps> = ({ file, onTrimSegmentsChange, disabled = false }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const nextIdRef = useRef(0);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [keyframes, setKeyframes] = useState<number[] | null>(null);
  const [keyframesError, setKeyframesError] = useState<string | null>(null);
  const [cuts, setCuts] = useState<Cut[]>([]);
  // Mirrors `cuts` for synchronous reads inside the drag handler below —
  // React doesn't guarantee a setCuts() functional-updater callback runs
  // synchronously within the same call, which made an earlier version of
  // this effect's preview-seek trigger silently never fire (previewTime
  // stayed null past the setCuts() call). Computing from this ref instead
  // of an updater removes that dependency on React's internal timing.
  const cutsRef = useRef<Cut[]>([]);
  useEffect(() => {
    cutsRef.current = cuts;
  }, [cuts]);
  const [draggingCutId, setDraggingCutId] = useState<string | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);
  const [dragRawTime, setDragRawTime] = useState<number | null>(null);
  const [isPlayingEdit, setIsPlayingEdit] = useState(false);
  // Playhead position on the track during "Play edit" playback — null
  // whenever not playing, so the marker only ever renders during that
  // mode (a drag's own handle position already serves as its indicator).
  const [playheadTime, setPlayheadTime] = useState<number | null>(null);
  // Snapshotted once when playback starts (not recomputed per tick) — cuts
  // can't change while playback is active (see pauseEditPreview() below),
  // so this is a stable source of truth for the whole playback session.
  const activeSegmentsRef = useRef<TrimSegment[]>([]);
  const activeSegmentIndexRef = useRef(0);

  const sizeError = (() => {
    try {
      assertFileSizeWithinTrimLimit(file);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'This video is too large to trim in your browser.';
    }
  })();

  // Load video duration via a throwaway <video> element — same
  // loadedmetadata pattern as Tyler's VideoPreview.tsx.
  useEffect(() => {
    if (sizeError) return;
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, sizeError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
    };
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [videoUrl]);

  // Live preview: seeks the same <video> element used for duration to
  // whichever handle is actively being dragged, so the user sees the exact
  // frame at that cut point instead of dragging blind. Native <video>
  // seeking runs on the browser's own media pipeline, entirely separate
  // from ffmpeg.wasm's WASM heap — this adds no memory pressure to the
  // pipeline that's already the constrained resource here (see
  // MAX_TRIM_FILE_SIZE_BYTES's history in types.ts).
  //
  // pointermove fires far faster than a seek can complete, so seeks are
  // throttled by the video's own 'seeked' event rather than fired on every
  // event: only one seek is ever in flight, and a newer target overwrites
  // any pending one rather than queuing behind it.
  const seekInFlightRef = useRef(false);
  const pendingSeekTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleSeeked = () => {
      if (pendingSeekTimeRef.current != null) {
        const next = pendingSeekTimeRef.current;
        pendingSeekTimeRef.current = null;
        video.currentTime = next;
      } else {
        seekInFlightRef.current = false;
      }
    };
    video.addEventListener('seeked', handleSeeked);
    return () => video.removeEventListener('seeked', handleSeeked);
  }, [videoUrl]);

  const requestPreviewSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    if (seekInFlightRef.current) {
      pendingSeekTimeRef.current = time;
      return;
    }
    seekInFlightRef.current = true;
    video.currentTime = time;
  }, []);

  // "Preview the edit": plays only the KEPT segments in order, jumping
  // past each cut the moment it's reached, on the original file — no
  // ffmpeg involved, same reasoning as the live drag-preview above (native
  // <video> playback is separate from ffmpeg.wasm's WASM heap). Segment
  // jumps use direct currentTime assignment rather than
  // requestPreviewSeek()'s throttling: that throttle exists for
  // pointermove's much higher event rate, not relevant to the
  // once-per-boundary jumps here.
  //
  // The video stays muted outside of this playback mode (the drag-preview
  // above is a rapid series of paused-frame seeks, not something anyone
  // wants to hear) and is explicitly unmuted only while actually playing
  // an edit preview — set/unset imperatively via the ref rather than a
  // reactive `muted` prop, matching how currentTime is already handled
  // everywhere else in this file. All "stop" paths funnel through
  // stopEditPreview() so muting back on can't be missed from any of them.
  const stopEditPreview = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.muted = true;
    }
    setIsPlayingEdit(false);
    setPlayheadTime(null);
  }, []);

  const pauseEditPreview = useCallback(() => {
    if (isPlayingEdit) stopEditPreview();
  }, [isPlayingEdit, stopEditPreview]);

  const handleTogglePlayEdit = () => {
    const video = videoRef.current;
    if (!video || duration == null || disabled) return;

    if (isPlayingEdit) {
      stopEditPreview();
      return;
    }

    const segments = cutsToKeepSegments(cutsRef.current, duration) ?? [{ start: 0, end: duration }];
    activeSegmentsRef.current = segments;
    activeSegmentIndexRef.current = 0;
    video.currentTime = segments[0].start;
    setPlayheadTime(segments[0].start);
    // Safe to unmute here specifically because this runs synchronously
    // inside a real click handler — browsers require exactly that (a
    // direct user gesture) to allow unmuted playback triggered from JS;
    // an unmute+play() from, say, a useEffect on mount would be blocked.
    video.muted = false;
    video.play();
    setIsPlayingEdit(true);
  };

  // Walks the snapshotted segment list forward as playback advances,
  // jumping to the next kept segment's start the moment the current one
  // ends, and pausing once the last one is exhausted (no auto-loop).
  // Tracking by segment index (rather than "is currentTime inside any
  // segment right now") stays correct even for short or closely-spaced
  // segments, and uniformly corrects a manual scrub into a cut region the
  // same way it corrects reaching one by natural playback.
  //
  // The track playhead is driven from this SAME handler (not a second
  // listener) specifically so it can't drift from the jump logic: on a
  // normal tick it's set to the current, still-within-segment time; on a
  // jump it's set straight to the next segment's start in the same tick,
  // so it never renders at a position inside a cut — no in-between frame
  // exists where that could happen. No CSS transition on its position
  // either, on purpose: timeupdate's own coarse firing rate already makes
  // normal playback advance in small discrete hops, and smoothing that
  // over would also smooth over the cut-jump into looking like it played
  // through the cut, which it didn't.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlayingEdit) return;

    const handleTimeUpdate = () => {
      const segments = activeSegmentsRef.current;
      const seg = segments[activeSegmentIndexRef.current];
      if (!seg) return;

      if (video.currentTime >= seg.end) {
        const nextIndex = activeSegmentIndexRef.current + 1;
        const nextSeg = segments[nextIndex];
        if (nextSeg) {
          activeSegmentIndexRef.current = nextIndex;
          video.currentTime = nextSeg.start;
          setPlayheadTime(nextSeg.start);
        } else {
          stopEditPreview();
        }
      } else {
        setPlayheadTime(video.currentTime);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [isPlayingEdit, stopEditPreview]);

  // Keeps isPlayingEdit (and muted) correct if the video pauses for any
  // reason this component didn't itself initiate (a hardware media key,
  // iOS Control Center, a tab going to the background) — safe to also
  // fire on the pause() calls made above, since re-applying the same
  // state is a no-op.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleNativePause = () => {
      video.muted = true;
      setIsPlayingEdit(false);
    };
    video.addEventListener('pause', handleNativePause);
    return () => video.removeEventListener('pause', handleNativePause);
  }, [videoUrl]);

  // Detect keyframes once per file. Not blocking — dragging still works
  // with raw (unsnapped) positions if this is slow or fails; it only
  // enhances the drag once it resolves. Matches getKeyframeTimestamps()'s
  // documented "call once, cache" contract.
  useEffect(() => {
    if (sizeError) return;
    let cancelled = false;
    setKeyframes(null);
    setKeyframesError(null);

    import('@services/vince/trim').then(({ getKeyframeTimestamps }) =>
      getKeyframeTimestamps(file)
        .then((timestamps) => {
          if (!cancelled) setKeyframes(timestamps);
        })
        .catch((error) => {
          if (cancelled) return;
          const message = error instanceof Error ? error.message : 'Could not analyze this video for precise cut points.';
          setKeyframesError(message);
        })
    );

    return () => {
      cancelled = true;
    };
  }, [file, sizeError]);

  // Reset everything when the file itself changes.
  useEffect(() => {
    setDuration(null);
    setCuts([]);
    setIsPlayingEdit(false);
  }, [file]);

  // If the whole panel becomes disabled (e.g. processing starts) while an
  // edit preview is running, stop it rather than leaving it playing behind
  // a now-inert UI.
  useEffect(() => {
    if (disabled) pauseEditPreview();
  }, [disabled, pauseEditPreview]);

  const emitSegments = useCallback(
    (nextCuts: Cut[], currentDuration: number) => {
      onTrimSegmentsChange(cutsToKeepSegments(nextCuts, currentDuration));
    },
    [onTrimSegmentsChange]
  );

  const timeFromClientX = useCallback(
    (clientX: number): number => {
      if (!trackRef.current || duration == null) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      return ratio * duration;
    },
    [duration]
  );

  const usableGap = duration != null ? findLargestUsableGap(cuts, duration) : null;
  const canAddCut = duration != null && cuts.length < MAX_CUTS && usableGap != null;

  const handleAddCut = () => {
    if (duration == null || !usableGap) return;
    pauseEditPreview();
    const cutLength = Math.min(2, usableGap.usableLength);
    const start = clamp(
      (usableGap.usableStart + usableGap.usableEnd) / 2 - cutLength / 2,
      usableGap.usableStart,
      usableGap.usableEnd - cutLength
    );
    const newCut: Cut = { id: `cut-${nextIdRef.current++}`, start, end: start + cutLength };

    setCuts((prev) => {
      const next = [...prev, newCut].sort((a, b) => a.start - b.start);
      emitSegments(next, duration);
      return next;
    });
  };

  const handleRemoveCut = (id: string) => {
    pauseEditPreview();
    setCuts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (duration != null) emitSegments(next, duration);
      return next;
    });
  };

  const handlePointerDown = (cutId: string, handle: 'start' | 'end') => (e: React.PointerEvent) => {
    if (disabled) return;
    pauseEditPreview();
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingCutId(cutId);
    setDraggingHandle(handle);
  };

  // Depends only on the drag session's identity (which cut/handle,
  // duration, keyframes) — NOT on `cuts` itself — so this effect doesn't
  // re-subscribe its window listeners on every pointermove-driven update.
  useEffect(() => {
    if (!draggingCutId || !draggingHandle || duration == null) return;

    const onMove = (e: PointerEvent) => {
      const raw = timeFromClientX(e.clientX);

      // Computed synchronously from cutsRef, NOT from a setCuts() updater
      // callback — React doesn't guarantee that callback runs synchronously
      // within this call, which is exactly what made an earlier version of
      // this seek trigger silently never fire.
      const sorted = [...cutsRef.current].sort((a, b) => a.start - b.start);
      const idx = sorted.findIndex((c) => c.id === draggingCutId);
      if (idx === -1) return;

      const current = sorted[idx];
      const prevNeighbor = sorted[idx - 1];
      const nextNeighbor = sorted[idx + 1];

      let updated: Cut;
      let previewTime: number;
      if (draggingHandle === 'start') {
        const lower = prevNeighbor ? prevNeighbor.end + MIN_SEGMENT_SECONDS : 0;
        const upper = current.end - MIN_SEGMENT_SECONDS;
        const clampedRaw = clamp(raw, lower, upper);
        const snapped = keyframes ? snapToNearestKeyframe(clampedRaw, keyframes) : clampedRaw;
        const finalStart = clamp(snapped, lower, upper);
        setDragRawTime(clampedRaw);
        previewTime = finalStart;
        updated = { ...current, start: finalStart };
      } else {
        const lower = current.start + MIN_SEGMENT_SECONDS;
        const upper = nextNeighbor ? nextNeighbor.start - MIN_SEGMENT_SECONDS : duration;
        const clampedRaw = clamp(raw, lower, upper);
        const snapped = keyframes ? snapToNearestKeyframe(clampedRaw, keyframes) : clampedRaw;
        const finalEnd = clamp(snapped, lower, upper);
        setDragRawTime(clampedRaw);
        previewTime = finalEnd;
        updated = { ...current, end: finalEnd };
      }

      const next = [...sorted];
      next[idx] = updated; // stays sorted — clamping never lets cuts cross
      cutsRef.current = next;
      setCuts(next);
      requestPreviewSeek(previewTime);
    };

    const onUp = () => {
      setDraggingCutId(null);
      setDraggingHandle(null);
      setDragRawTime(null);
      emitSegments(cutsRef.current, duration);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggingCutId, draggingHandle, duration, keyframes, timeFromClientX, emitSegments, requestPreviewSeek]);

  if (sizeError) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
        <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{sizeError}</span>
      </div>
    );
  }

  // Only the very first cut's start (vs. the video's true beginning) and
  // the very last cut's end (vs. its true end) can be "snap limited"
  // against the video's actual boundary — an internal gap between two
  // cuts isn't bounded by the video's edges, so it doesn't get this cue.
  const sortedCuts = [...cuts].sort((a, b) => a.start - b.start);
  const firstCut = sortedCuts[0];
  const lastCut = sortedCuts[sortedCuts.length - 1];
  const firstKeyframe = keyframes && keyframes.length > 0 ? keyframes[0] : null;
  const lastKeyframe = keyframes && keyframes.length > 0 ? keyframes[keyframes.length - 1] : null;

  const startSnapGap =
    duration != null && firstCut && firstKeyframe != null && Math.abs(firstCut.start - firstKeyframe) < EPSILON
      ? firstCut.start
      : 0;
  const endSnapGap =
    duration != null && lastCut && lastKeyframe != null && Math.abs(lastCut.end - lastKeyframe) < EPSILON
      ? duration - lastCut.end
      : 0;
  const startIsSnapLimited = startSnapGap > NOTICEABLE_GAP_SECONDS;
  const endIsSnapLimited = endSnapGap > NOTICEABLE_GAP_SECONDS;

  const keepSegments = duration != null ? cutsToKeepSegments(cuts, duration) : null;
  const totalCutSeconds = cuts.reduce((sum, c) => sum + (c.end - c.start), 0);

  // Compact preview sizing, capped much smaller than Tyler's main
  // VideoPreview.tsx since this is a secondary accessory next to the
  // track, not a main viewer. Driven by a fixed `height` (not maxHeight)
  // with `width: auto` derived from aspect-ratio — a max-height alone on a
  // box with no other definite dimension doesn't give a percentage-sized
  // child (the video's `h-full`) anything to resolve against per the CSS
  // spec, so it silently falls back to the video's raw intrinsic size and
  // ignores the cap entirely (confirmed empirically: without this, a
  // 320x240 video rendered at 525px tall instead of the intended 220px).
  // A definite height sidesteps that pitfall entirely and works the same
  // way for both vertical and horizontal video, so no orientation branch
  // is needed.
  const aspectRatio = videoDimensions ? videoDimensions.width / videoDimensions.height : 16 / 9;
  const previewContainerStyle: React.CSSProperties = {
    height: 220,
    width: 'auto',
    maxWidth: '100%',
    aspectRatio: `${aspectRatio}`,
    margin: '0 auto',
  };

  return (
    <div className="space-y-3">
      {/* Live frame preview. The same <video> element is used to read
          duration above (before this point it's not yet meaningful to
          show, so it stays hidden) — kept as one element rather than two
          so there's no second load of the file. */}
      {videoUrl && (
        <div
          className={duration == null ? 'hidden' : 'relative bg-black rounded-lg overflow-hidden'}
          style={duration == null ? undefined : previewContainerStyle}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            preload="metadata"
            playsInline
            muted
          />

          {duration != null && (
            <>
              {isPlayingEdit && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs font-medium">
                  Previewing edit
                </div>
              )}

              {/* Full-cover click target, like a standard video player's
                  play/pause overlay. No native `controls` here on purpose
                  — its scrub bar would span the ORIGINAL video's full
                  duration, which wouldn't correspond to position in the
                  edited result this button is meant to preview. */}
              <button
                type="button"
                onClick={handleTogglePlayEdit}
                disabled={disabled}
                aria-label={isPlayingEdit ? 'Pause preview' : 'Preview the edit'}
                className={`absolute inset-0 flex items-center justify-center group ${disabled ? 'pointer-events-none' : ''}`}
              >
                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-black/50 group-hover:bg-black/70 text-white transition-colors">
                  {isPlayingEdit ? (
                    <FiPause className="w-6 h-6" />
                  ) : (
                    <FiPlay className="w-6 h-6 ml-0.5" />
                  )}
                </span>
              </button>
            </>
          )}
        </div>
      )}

      {duration == null ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <FiLoader className="w-4 h-4 animate-spin" />
          Loading video...
        </div>
      ) : (
        <>
          {keyframesError && (
            <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
              <FiAlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{keyframesError} Cut points will use approximate positions.</span>
            </div>
          )}
          {!keyframes && !keyframesError && (
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <FiLoader className="w-3.5 h-3.5 animate-spin" />
              Analyzing video for precise cut points...
            </div>
          )}

          {/* Track */}
          <div
            ref={trackRef}
            className="relative w-full h-12 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden select-none"
          >
            {/* Keyframe-limited "kept" slivers at the very start/end of the
                video — hatched instead of plain background so they read as
                a deliberate technical limit, not an unstyled gap, with the
                explanatory text below spelling out why. */}
            {startIsSnapLimited && firstCut && (
              <div
                className="absolute top-0 h-full"
                style={{
                  left: 0,
                  width: `${(firstCut.start / duration) * 100}%`,
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(217,119,6,0.18) 0px, rgba(217,119,6,0.18) 4px, transparent 4px, transparent 9px)',
                }}
              />
            )}
            {endIsSnapLimited && lastCut && (
              <div
                className="absolute top-0 h-full"
                style={{
                  left: `${(lastCut.end / duration) * 100}%`,
                  width: `${((duration - lastCut.end) / duration) * 100}%`,
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(217,119,6,0.18) 0px, rgba(217,119,6,0.18) 4px, transparent 4px, transparent 9px)',
                }}
              />
            )}

            {sortedCuts.map((cut) => {
              const isDraggingThis = draggingCutId === cut.id;
              const midPercent = ((cut.start + cut.end) / 2 / duration) * 100;

              return (
                <React.Fragment key={cut.id}>
                  {/* Cut region (what gets removed) */}
                  <div
                    className="absolute top-0 h-full bg-red-400/60 dark:bg-red-500/40"
                    style={{
                      left: `${(cut.start / duration) * 100}%`,
                      width: `${((cut.end - cut.start) / duration) * 100}%`,
                    }}
                  />

                  {/* Faint raw-pointer marker, shown while dragging if it
                      differs from the snapped (committed) handle position */}
                  {isDraggingThis && draggingHandle && dragRawTime != null && Math.abs(
                    dragRawTime - (draggingHandle === 'start' ? cut.start : cut.end)
                  ) > 0.05 && (
                    <div
                      className="absolute top-0 h-full w-0.5 bg-gray-500 dark:bg-gray-300 opacity-60"
                      style={{ left: `${(dragRawTime / duration) * 100}%` }}
                    />
                  )}

                  {/* Remove button, centered in the cut region */}
                  <button
                    type="button"
                    onClick={() => handleRemoveCut(cut.id)}
                    disabled={disabled}
                    aria-label="Remove this cut"
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-white/90 dark:bg-gray-900/80 text-red-600 dark:text-red-400 hover:bg-white dark:hover:bg-gray-900 shadow ${disabled ? 'pointer-events-none opacity-50' : ''}`}
                    style={{ left: `${midPercent}%` }}
                  >
                    <FiX className="w-4 h-4" />
                  </button>

                  {/* Start handle */}
                  <div
                    onPointerDown={handlePointerDown(cut.id, 'start')}
                    className={`absolute top-0 h-full w-3 -ml-1.5 bg-primary-600 hover:bg-primary-700 cursor-ew-resize touch-none rounded ${disabled ? 'pointer-events-none opacity-50' : ''}`}
                    style={{ left: `${(cut.start / duration) * 100}%` }}
                    role="slider"
                    aria-label="Cut start"
                    aria-valuemin={0}
                    aria-valuemax={duration}
                    aria-valuenow={cut.start}
                  />

                  {/* End handle */}
                  <div
                    onPointerDown={handlePointerDown(cut.id, 'end')}
                    className={`absolute top-0 h-full w-3 -ml-1.5 bg-primary-600 hover:bg-primary-700 cursor-ew-resize touch-none rounded ${disabled ? 'pointer-events-none opacity-50' : ''}`}
                    style={{ left: `${(cut.end / duration) * 100}%` }}
                    role="slider"
                    aria-label="Cut end"
                    aria-valuemin={0}
                    aria-valuemax={duration}
                    aria-valuenow={cut.end}
                  />
                </React.Fragment>
              );
            })}

            {/* "Play edit" playhead — only ever rendered during that
                playback mode (a drag's own handle position already serves
                as its indicator, so this would just duplicate it there).
                Deliberately no CSS transition: see the handleTimeUpdate
                effect above for why a smoothed position would misrepresent
                the discrete jump across a cut. Rendered last so it's
                topmost, though in practice it can never coincide with an
                active drag — starting one calls pauseEditPreview() first. */}
            {playheadTime != null && (
              <div
                className="absolute top-0 h-full w-0.5 bg-gray-900 dark:bg-white pointer-events-none"
                style={{ left: `${(playheadTime / duration) * 100}%` }}
              />
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>0:00</span>
            <span>{formatTime(duration)}</span>
          </div>

          {(startIsSnapLimited || endIsSnapLimited) && (
            <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <FiInfo className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                {startIsSnapLimited && endIsSnapLimited
                  ? `This browser can't cut all the way to the very start or end of this video — the nearest usable keyframes are ${formatTime(startSnapGap)} in and ${formatTime(endSnapGap)} before the end.`
                  : startIsSnapLimited
                  ? `This browser can't cut all the way to the very start of this video — the nearest usable keyframe is ${formatTime(startSnapGap)} in.`
                  : `This browser can't cut all the way to the very end of this video — the nearest usable keyframe is ${formatTime(endSnapGap)} before the end.`}
              </span>
            </p>
          )}

          {/* Live readout, derived from the same cutsToKeepSegments()
              conversion that's actually emitted, so it can never disagree
              with what trimVideo() will receive. */}
          {cuts.length > 0 ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Cutting {cuts.length} {cuts.length === 1 ? 'segment' : 'segments'}
              {' '}({formatTime(totalCutSeconds)} total)
              {keepSegments && keepSegments.length > 0 && (
                <>
                  {' '}— keeping{' '}
                  {keepSegments.map((seg, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && ', '}
                      <span className="font-medium">{formatTime(seg.start)}–{formatTime(seg.end)}</span>
                    </React.Fragment>
                  ))}
                </>
              )}
            </p>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              No cuts yet — the full video will be processed as-is.
            </p>
          )}

          <button
            type="button"
            onClick={handleAddCut}
            disabled={disabled || !canAddCut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            title={cuts.length >= MAX_CUTS ? `Up to ${MAX_CUTS} cuts at a time` : undefined}
          >
            <FiScissors className="w-3.5 h-3.5" />
            <FiPlus className="w-3.5 h-3.5" />
            Add cut
          </button>
        </>
      )}
    </div>
  );
};

export default TrimTimeline;
