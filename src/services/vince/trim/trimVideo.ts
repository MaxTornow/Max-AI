/**
 * VINCE - Trim Execution
 *
 * Stream-copy trim across one or more kept segments (removing middle
 * sections is supported via the concat demuxer): extract each kept segment
 * with -c copy (fast, no re-encode), then stitch them back together.
 *
 * Cut points are always re-snapped to the nearest detected keyframe here,
 * regardless of what the caller passes in — this is the trust boundary: a
 * future UI may already snap live during dragging for display purposes,
 * but the actual ffmpeg command executed here must always target a real
 * keyframe, so this re-snap is a safety net, not an optimization to skip.
 */

import { trimFfmpegClient, classifyError } from './ffmpegClient';
import { getKeyframeTimestamps } from './keyframes';
import { snapToNearestKeyframe } from './snapToNearestKeyframe';
import { TrimError, type TrimProgress, type TrimSegment } from './types';

function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new TrimError('aborted', 'Trim cancelled.');
  }
}

function buildOutputFilename(originalName: string): string {
  const withoutExt = originalName.replace(/\.[^.]+$/, '');
  return `${withoutExt}_trimmed.mp4`;
}

/**
 * Trims `file` down to the given keep-segments and returns the result
 * wrapped as a File, ready for uploadVideoToStorage() as-is.
 *
 * @param file - the raw, not-yet-uploaded source video
 * @param keepSegments - segments to KEEP, in source-timeline seconds (the
 *   complement of whatever the caller's UI considers "cut out")
 * @param onProgress - phase-weighted progress callback
 * @param signal - optional AbortSignal, checked between ffmpeg calls
 *   (an in-flight ffmpeg.wasm exec() itself cannot be interrupted)
 */
export async function trimVideo(
  file: File,
  keepSegments: TrimSegment[],
  onProgress?: (progress: TrimProgress) => void,
  signal?: AbortSignal
): Promise<File> {
  if (keepSegments.length === 0) {
    throw new TrimError('unknown', 'No segments to keep were provided.');
  }

  await trimFfmpegClient.requestWakeLock();

  try {
    onProgress?.({ phase: 'loading-ffmpeg', progress: 0, message: 'Loading video engine...' });
    await trimFfmpegClient.load((p) =>
      onProgress?.({ phase: 'loading-ffmpeg', progress: p, message: 'Loading video engine...' })
    );
    checkAborted(signal);

    onProgress?.({ phase: 'detecting-keyframes', progress: 0, message: 'Analyzing video...' });
    const keyframes = await getKeyframeTimestamps(file);
    onProgress?.({ phase: 'detecting-keyframes', progress: 100, message: 'Analyzing video...' });
    checkAborted(signal);

    const snappedSegments = keepSegments
      .map((seg) => ({
        start: snapToNearestKeyframe(seg.start, keyframes),
        end: snapToNearestKeyframe(seg.end, keyframes),
      }))
      .filter((seg) => seg.end > seg.start);

    if (snappedSegments.length === 0) {
      throw new TrimError(
        'unknown',
        'No valid segments remained after snapping cut points to the nearest keyframes.'
      );
    }

    const inputExt = file.name.split('.').pop() || 'mp4';
    const inputName = `trim-input.${inputExt}`;
    await trimFfmpegClient.writeInputFile(inputName, file);

    const segmentNames: string[] = [];
    let outputName = '';

    try {
      onProgress?.({
        phase: 'extracting-segments',
        progress: 0,
        message: `Extracting ${snappedSegments.length} segment(s)...`,
      });

      for (let i = 0; i < snappedSegments.length; i++) {
        checkAborted(signal);
        const seg = snappedSegments[i];
        const segmentName = `trim-segment-${i}.mp4`;

        const { exitCode } = await trimFfmpegClient.execCaptured([
          '-ss', String(seg.start),
          '-i', inputName,
          '-t', String(seg.end - seg.start),
          '-c', 'copy',
          '-avoid_negative_ts', 'make_zero',
          segmentName,
        ]);

        if (exitCode !== 0) {
          throw new TrimError(
            'ffmpeg-failed',
            `Failed to extract segment ${i + 1} of ${snappedSegments.length}.`
          );
        }

        segmentNames.push(segmentName);
        onProgress?.({
          phase: 'extracting-segments',
          progress: Math.round(((i + 1) / snappedSegments.length) * 100),
          message: `Extracted segment ${i + 1} of ${snappedSegments.length}...`,
        });
      }

      checkAborted(signal);
      onProgress?.({ phase: 'concatenating', progress: 0, message: 'Joining segments...' });

      if (segmentNames.length === 1) {
        // Single kept segment — nothing to concat, it's already the output.
        outputName = segmentNames[0];
      } else {
        outputName = 'trim-output.mp4';
        const listName = 'trim-concat-list.txt';
        const listContents = segmentNames.map((name) => `file '${name}'`).join('\n');
        await trimFfmpegClient.writeTextFile(listName, listContents);

        const { exitCode } = await trimFfmpegClient.execCaptured([
          '-f', 'concat',
          '-safe', '0',
          '-i', listName,
          '-c', 'copy',
          outputName,
        ]);

        await trimFfmpegClient.deleteFileQuiet(listName);

        if (exitCode !== 0) {
          throw new TrimError('ffmpeg-failed', 'Failed to join the trimmed segments together.');
        }
      }

      onProgress?.({ phase: 'concatenating', progress: 100, message: 'Joining segments...' });

      const outputData = await trimFfmpegClient.readOutputFile(outputName);
      const outputBlob = new Blob([outputData], { type: 'video/mp4' });
      const outputFile = new File([outputBlob], buildOutputFilename(file.name), {
        type: 'video/mp4',
      });

      onProgress?.({ phase: 'completed', progress: 100, message: 'Trim complete!' });
      return outputFile;
    } finally {
      await trimFfmpegClient.deleteFileQuiet(inputName);
      for (const name of segmentNames) {
        await trimFfmpegClient.deleteFileQuiet(name);
      }
      if (outputName) {
        await trimFfmpegClient.deleteFileQuiet(outputName);
      }
    }
  } catch (error) {
    throw classifyError(error);
  } finally {
    await trimFfmpegClient.releaseWakeLock();
  }
}
