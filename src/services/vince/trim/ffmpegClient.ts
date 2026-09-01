/**
 * VINCE - Trim FFmpeg Client
 *
 * Owns a dedicated FFmpeg.wasm instance for the trim feature. Deliberately
 * NOT shared with Tyler's ffmpegService/canvasExportService singletons — a
 * Tyler export and a Vince trim running in the same browser session must
 * never contend over the same WASM instance/memory.
 *
 * Uses the single-threaded @ffmpeg/core (not @ffmpeg/core-mt), matching
 * what's already running in production for Tyler. Single-threaded means no
 * SharedArrayBuffer / cross-origin-isolation headers are required — see the
 * investigation notes in docs/ (or PR discussion) for why that gap in
 * production headers doesn't block this.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { TrimError } from './types';

// Same CDN/version already used by Tyler's ffmpegService.ts and
// canvasExportService.ts — keep this pinned version in sync with those if
// it's ever bumped, since format/behavior testing is version-specific.
const BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

/** Substrings seen in ffmpeg.wasm/Emscripten out-of-memory failures. */
const OOM_SIGNATURES = [
  'out of memory',
  'memory access out of bounds',
  'allocation failed',
  'aborted(oom)',
];

/**
 * Turns a raw thrown error (or non-zero exit code) from an ffmpeg.wasm call
 * into a TrimError with a specific, UI-actionable reason. Never lets a raw
 * WASM/Emscripten error surface uninterpreted to a caller.
 */
export function classifyError(error: unknown): TrimError {
  if (error instanceof TrimError) return error;

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (OOM_SIGNATURES.some((sig) => lower.includes(sig))) {
    return new TrimError(
      'oom',
      'This video is too large to process in this browser (ran out of memory). Try a smaller file or a different device.',
      { cause: error }
    );
  }

  return new TrimError('ffmpeg-failed', `Video processing failed: ${message}`, { cause: error });
}

class VinceTrimFfmpegClient {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;
  private wakeLock: WakeLockSentinel | null = null;

  // Persistent log listener + a toggleable capture buffer, rather than
  // adding/removing listeners per exec() call.
  private capturing = false;
  private logBuffer: string[] = [];

  async load(onProgress?: (progress: number) => void): Promise<void> {
    if (this.loaded && this.ffmpeg) return;

    this.ffmpeg = new FFmpeg();

    this.ffmpeg.on('log', ({ message }) => {
      if (this.capturing) this.logBuffer.push(message);
    });

    this.ffmpeg.on('progress', ({ progress }) => {
      onProgress?.(Math.round(progress * 100));
    });

    try {
      const coreURL = await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, 'application/wasm');
      await this.ffmpeg.load({ coreURL, wasmURL });
    } catch (error) {
      throw classifyError(error);
    }

    this.loaded = true;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  async requestWakeLock(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.warn('[VinceTrim] Wake lock not available:', err);
    }
  }

  async releaseWakeLock(): Promise<void> {
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
      } catch (err) {
        console.warn('[VinceTrim] Failed to release wake lock:', err);
      }
    }
  }

  async writeInputFile(name: string, file: File | Blob): Promise<void> {
    if (!this.ffmpeg) throw new TrimError('unknown', 'FFmpeg not loaded');
    await this.ffmpeg.writeFile(name, await fetchFile(file));
  }

  async writeTextFile(name: string, contents: string): Promise<void> {
    if (!this.ffmpeg) throw new TrimError('unknown', 'FFmpeg not loaded');
    await this.ffmpeg.writeFile(name, contents);
  }

  async readOutputFile(name: string): Promise<Uint8Array> {
    if (!this.ffmpeg) throw new TrimError('unknown', 'FFmpeg not loaded');
    const data = await this.ffmpeg.readFile(name);
    return data as Uint8Array;
  }

  /** Best-effort delete — cleanup should never throw and abort an otherwise-successful run. */
  async deleteFileQuiet(name: string): Promise<void> {
    try {
      await this.ffmpeg?.deleteFile(name);
    } catch {
      // Already gone or never existed — fine.
    }
  }

  /**
   * Runs one ffmpeg command, capturing its log output for the duration of
   * this call only. Used by keyframes.ts to parse `showinfo` output, and
   * generally useful for debugging trim failures.
   */
  async execCaptured(args: string[]): Promise<{ exitCode: number; logLines: string[] }> {
    if (!this.ffmpeg) throw new TrimError('unknown', 'FFmpeg not loaded');

    this.logBuffer = [];
    this.capturing = true;
    try {
      const exitCode = await this.ffmpeg.exec(args);
      return { exitCode, logLines: this.logBuffer };
    } catch (error) {
      throw classifyError(error);
    } finally {
      this.capturing = false;
    }
  }
}

// One dedicated instance for the trim feature — not exported as a shared
// generic ffmpeg client, so it's never accidentally reused by an unrelated
// future feature the way Tyler's two services never share theirs either.
export const trimFfmpegClient = new VinceTrimFfmpegClient();
