import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiScissors, FiPlus, FiAlertCircle, FiLoader } from 'react-icons/fi';
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
 * CHECKPOINT 1 scope: renders the track, loads duration + keyframes, and
 * supports a single draggable cut region with live keyframe snapping.
 * Multi-cut add/remove and neighbor-boundary clamping between sibling
 * cuts land in the next phase — capped at one cut here on purpose so the
 * core interaction feel can be reviewed before that layer gets built on
 * top of it.
 */

// Minimum length (seconds) for both a cut region and the keep-regions on
// either side of it, so a drag can't collapse either down to nothing.
const MIN_SEGMENT_SECONDS = 0.5;

interface Cut {
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
 * duration. Written to take an array (even though checkpoint 1 only ever
 * passes 0 or 1 cut) so this doesn't need to change in the multi-cut phase. */
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

const TrimTimeline: React.FC<TrimTimelineProps> = ({ file, onTrimSegmentsChange, disabled = false }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [keyframes, setKeyframes] = useState<number[] | null>(null);
  const [keyframesError, setKeyframesError] = useState<string | null>(null);
  const [cut, setCut] = useState<Cut | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);
  const [dragRawTime, setDragRawTime] = useState<number | null>(null);

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
    const handleLoadedMetadata = () => setDuration(video.duration);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
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
    setCut(null);
  }, [file]);

  const emitSegments = useCallback(
    (nextCut: Cut | null, currentDuration: number) => {
      onTrimSegmentsChange(cutsToKeepSegments(nextCut ? [nextCut] : [], currentDuration));
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

  const handleAddCut = () => {
    if (duration == null) return;
    // Center a default-length cut in the middle of the video.
    const cutLength = Math.min(2, duration / 3);
    const start = clamp(duration / 2 - cutLength / 2, 0, duration - cutLength);
    const initial: Cut = { start, end: start + cutLength };
    setCut(initial);
    emitSegments(initial, duration);
  };

  const handleRemoveCut = () => {
    setCut(null);
    if (duration != null) emitSegments(null, duration);
  };

  const handlePointerDown = (handle: 'start' | 'end') => (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingHandle(handle);
  };

  useEffect(() => {
    if (!draggingHandle || !cut || duration == null) return;

    const onMove = (e: PointerEvent) => {
      const raw = timeFromClientX(e.clientX);

      setCut((prev) => {
        if (!prev) return prev;

        if (draggingHandle === 'start') {
          const maxStart = prev.end - MIN_SEGMENT_SECONDS;
          const clampedRaw = clamp(raw, 0, maxStart);
          const snapped = keyframes ? snapToNearestKeyframe(clampedRaw, keyframes) : clampedRaw;
          const finalStart = clamp(snapped, 0, maxStart);
          setDragRawTime(clampedRaw);
          return { ...prev, start: finalStart };
        } else {
          const minEnd = prev.start + MIN_SEGMENT_SECONDS;
          const clampedRaw = clamp(raw, minEnd, duration);
          const snapped = keyframes ? snapToNearestKeyframe(clampedRaw, keyframes) : clampedRaw;
          const finalEnd = clamp(snapped, minEnd, duration);
          setDragRawTime(clampedRaw);
          return { ...prev, end: finalEnd };
        }
      });
    };

    const onUp = () => {
      setDraggingHandle(null);
      setDragRawTime(null);
      // Read the latest cut via functional update to avoid a stale closure.
      setCut((latest) => {
        emitSegments(latest, duration);
        return latest;
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggingHandle, cut, duration, keyframes, timeFromClientX, emitSegments]);

  if (sizeError) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
        <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{sizeError}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Hidden video element, used only to read duration */}
      {videoUrl && (
        <video ref={videoRef} src={videoUrl} className="hidden" preload="metadata" />
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
            {cut && (
              <>
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
                {draggingHandle && dragRawTime != null && Math.abs(
                  dragRawTime - (draggingHandle === 'start' ? cut.start : cut.end)
                ) > 0.05 && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-gray-500 dark:bg-gray-300 opacity-60"
                    style={{ left: `${(dragRawTime / duration) * 100}%` }}
                  />
                )}

                {/* Start handle */}
                <div
                  onPointerDown={handlePointerDown('start')}
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
                  onPointerDown={handlePointerDown('end')}
                  className={`absolute top-0 h-full w-3 -ml-1.5 bg-primary-600 hover:bg-primary-700 cursor-ew-resize touch-none rounded ${disabled ? 'pointer-events-none opacity-50' : ''}`}
                  style={{ left: `${(cut.end / duration) * 100}%` }}
                  role="slider"
                  aria-label="Cut end"
                  aria-valuemin={0}
                  aria-valuemax={duration}
                  aria-valuenow={cut.end}
                />
              </>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>0:00</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Live readout + add/remove. Derived from the same
              cutsToKeepSegments() conversion that's actually emitted, so
              the readout can never show a "kept" range (e.g. a zero-length
              sliver when a cut reaches the video's edge) that disagrees
              with what trimVideo() will actually receive. */}
          {cut ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Cutting <span className="font-medium">{formatTime(cut.start)}–{formatTime(cut.end)}</span>
                {' '}({formatTime(cut.end - cut.start)})
                {(() => {
                  const keepSegments = cutsToKeepSegments([cut], duration);
                  if (!keepSegments || keepSegments.length === 0) return null;
                  return (
                    <>
                      {' '}— keeping{' '}
                      {keepSegments.map((seg, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && ' and '}
                          <span className="font-medium">{formatTime(seg.start)}–{formatTime(seg.end)}</span>
                        </React.Fragment>
                      ))}
                    </>
                  );
                })()}
              </p>
              <button
                type="button"
                onClick={handleRemoveCut}
                disabled={disabled}
                className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove cut
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddCut}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiScissors className="w-3.5 h-3.5" />
              <FiPlus className="w-3.5 h-3.5" />
              Add cut
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default TrimTimeline;
