/**
 * VINCE - Keyframe Detection
 *
 * ffmpeg.wasm's @ffmpeg/core ships only the `ffmpeg` binary, not `ffprobe` —
 * there's no structured probe output available. Detection instead uses
 * ffmpeg's own `showinfo` filter combined with `-skip_frame nokey`, which
 * tells the decoder to skip non-keyframe decoding entirely (for most codecs
 * this means only I-frames get decoded, so this is much faster than a full
 * decode pass, though it still requires the codec's decoder to be present
 * in this ffmpeg.wasm build — see the KNOWN RISK note below).
 *
 * KNOWN RISK: this approach requires an actual decode of surviving frames
 * (`showinfo` operates post-decode). If a given codec's decoder isn't
 * compiled into this ffmpeg.wasm core build, detection will fail for that
 * codec even though a pure stream-copy trim (which never decodes) might
 * still work. This has been empirically verified for H.264/HEVC/VP9 as
 * part of this feature's build — see the verification notes in the PR.
 * If a future format fails here, the documented fallback (not built
 * pre-emptively) is parsing the container's own keyframe metadata directly
 * (the `stss` box for MP4/MOV, the keyframe flag on Matroska SimpleBlocks
 * for WebM) with zero decoding involved at all.
 */

import { trimFfmpegClient, classifyError } from './ffmpegClient';
import { TrimError } from './types';

const INPUT_NAME = 'keyframe-scan-input';

// Matches a showinfo log line's pts_time and iskey fields, e.g.:
// "[Parsed_showinfo_0 @ 0x...] n:   3 pts:60 pts_time:2 ... iskey:1 type:I ..."
const PTS_TIME_RE = /pts_time:([\d.]+)/;
const IS_KEY_RE = /iskey:1/;

/**
 * Scans a video file once and returns sorted keyframe positions in seconds.
 * Intended to be called a single time when a video is loaded — the result
 * should be cached by the caller (e.g. in component state) and used for
 * fast, local, synchronous lookups via snapToNearestKeyframe() during
 * interactive UI (dragging a cut handle), NOT re-scanned per interaction.
 */
export async function getKeyframeTimestamps(file: File): Promise<number[]> {
  await trimFfmpegClient.load();

  const inputExt = file.name.split('.').pop() || 'mp4';
  const inputName = `${INPUT_NAME}.${inputExt}`;

  try {
    await trimFfmpegClient.writeInputFile(inputName, file);

    const { logLines } = await trimFfmpegClient.execCaptured([
      '-skip_frame', 'nokey',
      '-i', inputName,
      '-vf', 'showinfo',
      '-f', 'null',
      '-',
    ]);

    const timestamps: number[] = [];
    for (const line of logLines) {
      if (!IS_KEY_RE.test(line)) continue;
      const match = PTS_TIME_RE.exec(line);
      if (match) timestamps.push(parseFloat(match[1]));
    }

    timestamps.sort((a, b) => a - b);

    if (timestamps.length === 0) {
      throw new TrimError(
        'unsupported-format',
        'Could not detect any keyframes in this video — it may use a codec this browser can\'t decode.'
      );
    }

    return timestamps;
  } catch (error) {
    throw classifyError(error);
  } finally {
    await trimFfmpegClient.deleteFileQuiet(inputName);
  }
}

