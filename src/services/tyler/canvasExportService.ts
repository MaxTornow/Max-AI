/**
 * TYLER - Canvas-Based Video Export Service
 *
 * Renders video frames + text overlay to canvas, captures via MediaRecorder,
 * then merges original audio back using FFmpeg.
 *
 * This achieves pixel-perfect match between preview and export since both
 * use the browser's CSS text rendering engine.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { TextOverlaySettings, TextAlignment, TextLayer } from './types';
import { getCssFontFamily } from './textUtils';

// FFmpeg CDN for audio operations
const BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

export type ExportPhase = 'initializing' | 'recording' | 'extracting-audio' | 'merging' | 'completed';

export interface CanvasExportProgress {
    phase: ExportPhase;
    progress: number; // 0-100
    message: string;
}

export interface CanvasExportOptions {
    videoFile: File;
    settings: TextOverlaySettings;
    videoWidth: number;
    videoHeight: number;
    onProgress?: (progress: CanvasExportProgress) => void;
}

class CanvasExportService {
    private ffmpeg: FFmpeg | null = null;
    private ffmpegLoaded = false;
    private wakeLock: WakeLockSentinel | null = null;

    /**
     * Request wake lock to prevent browser throttling during export
     */
    private async requestWakeLock(): Promise<void> {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('[CanvasExport] Wake lock acquired');
            }
        } catch (err) {
            console.warn('[CanvasExport] Wake lock not available:', err);
        }
    }

    /**
     * Release wake lock after export
     */
    private async releaseWakeLock(): Promise<void> {
        if (this.wakeLock) {
            try {
                await this.wakeLock.release();
                this.wakeLock = null;
                console.log('[CanvasExport] Wake lock released');
            } catch (err) {
                console.warn('[CanvasExport] Failed to release wake lock:', err);
            }
        }
    }

    /**
     * Load FFmpeg for audio operations
     */
    private async loadFFmpeg(onProgress?: (progress: number) => void): Promise<void> {
        if (this.ffmpegLoaded && this.ffmpeg) {
            console.log('[CanvasExport] FFmpeg already loaded, skipping');
            return;
        }

        console.log('[CanvasExport] Loading FFmpeg WASM...');
        this.ffmpeg = new FFmpeg();

        this.ffmpeg.on('progress', ({ progress }) => {
            onProgress?.(Math.round(progress * 100));
        });

        this.ffmpeg.on('log', ({ message }) => {
            console.log('[FFmpeg]', message);
        });

        console.log('[CanvasExport] Fetching FFmpeg core from CDN...');
        const coreURL = await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, 'text/javascript');
        console.log('[CanvasExport] Core JS loaded, fetching WASM...');
        const wasmURL = await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, 'application/wasm');
        console.log('[CanvasExport] WASM loaded, initializing FFmpeg...');

        await this.ffmpeg.load({ coreURL, wasmURL });

        this.ffmpegLoaded = true;
        console.log('[CanvasExport] FFmpeg loaded successfully');
    }

    /**
     * Calculate Y position to match VideoPreview.tsx exactly
     */
    private getYPosition(
        yPositionPercent: number,
        videoHeight: number,
        totalTextHeight: number
    ): number {
        const yPosition = videoHeight * (yPositionPercent / 100) - totalTextHeight / 2;
        return Math.max(0, Math.min(videoHeight - totalTextHeight, yPosition));
    }

    /**
     * Get X position for text based on alignment
     */
    private getXPosition(
        alignment: TextAlignment,
        videoWidth: number,
        textWidth: number
    ): number {
        const margin = videoWidth * 0.05; // 5% margin
        switch (alignment) {
            case 'left':
                return margin;
            case 'center':
                return (videoWidth - textWidth) / 2;
            case 'right':
                return videoWidth - textWidth - margin;
        }
    }

    /**
     * Draw a single text layer on canvas
     */
    private drawSingleLayer(
        ctx: CanvasRenderingContext2D,
        layer: TextLayer,
        fontName: string,
        videoWidth: number,
        videoHeight: number
    ): void {
        if (!layer.text.trim()) return;

        const fontSize = layer.fontSize;
        const lineHeight = fontSize * 1.3;
        const lines = layer.text.split('\n').filter(line => line.trim());
        const totalTextHeight = lines.length * lineHeight;

        // Set font properties to match CSS
        ctx.font = `bold ${fontSize}px ${getCssFontFamily(fontName)}`;
        ctx.fillStyle = layer.textColor;
        ctx.textBaseline = 'top';

        // Shadow matching VideoPreview.tsx
        const shadowSize = Math.max(1, fontSize * 0.04);
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowOffsetX = shadowSize;
        ctx.shadowOffsetY = shadowSize;
        ctx.shadowBlur = shadowSize * 2;

        // Calculate Y position
        const baseY = this.getYPosition(layer.yPositionPercent, videoHeight, totalTextHeight);

        // Calculate max width for wrapping (90% of video width)
        const maxWidth = videoWidth * 0.9;

        // Word wrap each line and draw
        let currentY = baseY;

        for (const line of lines) {
            const wrappedLines = this.wrapText(ctx, line, maxWidth);

            for (const wrappedLine of wrappedLines) {
                const textMetrics = ctx.measureText(wrappedLine);
                const x = this.getXPosition(layer.alignment, videoWidth, textMetrics.width);
                ctx.fillText(wrappedLine, x, currentY);
                currentY += lineHeight;
            }
        }
    }

    /**
     * Draw all text overlay layers on canvas
     * Renders body first (background), headline last (foreground) for correct z-order
     */
    private drawTextOverlay(
        ctx: CanvasRenderingContext2D,
        settings: TextOverlaySettings,
        videoWidth: number,
        videoHeight: number
    ): void {
        // Filter to enabled layers with text, sort by render order (body first, headline last)
        const layersToRender = settings.layers
            .filter(l => l.enabled && l.text.trim())
            .sort((a, b) => a.id === 'body' ? -1 : 1);

        for (const layer of layersToRender) {
            ctx.save();  // Isolate layer state
            this.drawSingleLayer(ctx, layer, settings.fontName, videoWidth, videoHeight);
            ctx.restore();  // Reset state for next layer
        }
    }

    /**
     * Word wrap text to fit within maxWidth
     * Mimics CSS word-break: break-word behavior
     */
    private wrapText(
        ctx: CanvasRenderingContext2D,
        text: string,
        maxWidth: number
    ): string[] {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines.length > 0 ? lines : [''];
    }

    /**
     * Calculate scaled dimensions capped at 1080p for faster encoding
     * Maintains aspect ratio while ensuring neither dimension exceeds 1920px
     */
    private getScaledDimensions(width: number, height: number): { width: number; height: number; scale: number } {
        const MAX_DIMENSION = 1920; // 1080p cap

        if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
            return { width, height, scale: 1 };
        }

        const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        // Round to even numbers (required for H.264 encoding)
        const scaledWidth = Math.floor((width * scale) / 2) * 2;
        const scaledHeight = Math.floor((height * scale) / 2) * 2;

        console.log(`[CanvasExport] Scaling from ${width}x${height} to ${scaledWidth}x${scaledHeight} (${Math.round(scale * 100)}%)`);

        return { width: scaledWidth, height: scaledHeight, scale };
    }

    /**
     * Record video frames + text overlay to canvas using MediaRecorder
     *
     * CRITICAL FIX: Properly wait for video to be fully ready before recording
     * to prevent black frames and choppy start.
     */
    private async recordCanvasVideo(
        videoFile: File,
        settings: TextOverlaySettings,
        videoWidth: number,
        videoHeight: number,
        onProgress?: (progress: number) => void
    ): Promise<Blob> {
        return new Promise((resolve, reject) => {
            // Create hidden video element
            const video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;
            video.preload = 'auto'; // Ensure full preloading

            // OPTIMIZATION: Cap resolution at 1080p for faster encoding
            const scaled = this.getScaledDimensions(videoWidth, videoHeight);
            const canvasWidth = scaled.width;
            const canvasHeight = scaled.height;
            const scaleFactor = scaled.scale;

            // Create canvas at scaled resolution
            const canvas = document.createElement('canvas');
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Failed to create canvas context'));
                return;
            }

            // Set up MediaRecorder
            const stream = canvas.captureStream(30); // 30 fps
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 8000000, // 8 Mbps for good quality
            });

            const chunks: Blob[] = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                resolve(blob);
            };

            mediaRecorder.onerror = (e) => {
                reject(new Error(`MediaRecorder error: ${e}`));
            };

            // Load video
            const videoUrl = URL.createObjectURL(videoFile);
            video.src = videoUrl;

            // CRITICAL: Wait for canplaythrough - video is fully buffered
            // This prevents black frames and choppy start
            const handleCanPlayThrough = () => {
                // Remove handler to prevent multiple calls
                video.removeEventListener('canplaythrough', handleCanPlayThrough);

                const duration = video.duration;
                console.log('[CanvasExport] Video ready, duration:', duration, 'currentTime:', video.currentTime);

                // Create scaled settings for text overlay (scale font size with canvas for each layer)
                const scaledSettings: TextOverlaySettings = {
                    ...settings,
                    layers: settings.layers.map(layer => ({
                        ...layer,
                        fontSize: Math.round(layer.fontSize * scaleFactor),
                    })),
                };

                // Function to start recording once video is ready
                const startRecording = () => {
                    console.log('[CanvasExport] Starting recording, currentTime:', video.currentTime);

                    // CRITICAL: Draw first frame to canvas BEFORE starting recorder
                    // This ensures we don't start with a black frame
                    ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
                    this.drawTextOverlay(ctx, scaledSettings, canvasWidth, canvasHeight);

                    // Now start the MediaRecorder (first frame is already on canvas)
                    mediaRecorder.start(100); // Collect data every 100ms
                    console.log('[CanvasExport] MediaRecorder started');

                    // Set up end handler
                    video.onended = () => {
                        console.log('[CanvasExport] Video ended, drawing final frame');
                        // Draw final frame one more time to ensure it's captured
                        ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
                        this.drawTextOverlay(ctx, scaledSettings, canvasWidth, canvasHeight);

                        // Small delay to ensure last frame is captured by MediaRecorder
                        setTimeout(() => {
                            mediaRecorder.stop();
                            URL.revokeObjectURL(videoUrl);
                            console.log('[CanvasExport] MediaRecorder stopped');
                        }, 150);
                    };

                    // Render loop function (uses scaled canvas dimensions)
                    const renderFrame = () => {
                        if (video.ended || video.paused) return;

                        // Draw current video frame at scaled resolution
                        ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

                        // Draw text overlay with scaled settings
                        this.drawTextOverlay(ctx, scaledSettings, canvasWidth, canvasHeight);

                        // Report progress
                        const progress = Math.round((video.currentTime / duration) * 100);
                        onProgress?.(progress);

                        requestAnimationFrame(renderFrame);
                    };

                    // Start playback, then start render loop
                    video.play().then(() => {
                        console.log('[CanvasExport] Video playback started');
                        requestAnimationFrame(renderFrame);
                    }).catch(err => {
                        console.error('[CanvasExport] Failed to play video:', err);
                        mediaRecorder.stop();
                        URL.revokeObjectURL(videoUrl);
                        reject(err);
                    });
                };

                // FIX: If already at start, don't wait for seeked event (it won't fire)
                // Just start recording directly after a small delay to ensure frame is ready
                if (video.currentTime < 0.1) {
                    console.log('[CanvasExport] Already at start, proceeding directly');
                    // Small delay to ensure first frame is decodable
                    setTimeout(startRecording, 50);
                } else {
                    // Need to seek to start
                    console.log('[CanvasExport] Seeking to start...');
                    const handleSeeked = () => {
                        video.removeEventListener('seeked', handleSeeked);
                        console.log('[CanvasExport] Seeked to start');
                        startRecording();
                    };
                    video.addEventListener('seeked', handleSeeked);
                    video.currentTime = 0;
                }
            };

            // Use loadeddata (more reliable than canplaythrough for all formats)
            // with canplaythrough as backup
            let hasStarted = false;

            const startWhenReady = () => {
                if (hasStarted) return;
                hasStarted = true;
                video.removeEventListener('canplaythrough', startWhenReady);
                video.removeEventListener('loadeddata', handleLoadedData);
                handleCanPlayThrough();
            };

            const handleLoadedData = () => {
                // Wait a moment after loadeddata to ensure frames are decodable
                setTimeout(startWhenReady, 100);
            };

            video.addEventListener('loadeddata', handleLoadedData);
            video.addEventListener('canplaythrough', startWhenReady);

            video.onerror = () => {
                URL.revokeObjectURL(videoUrl);
                reject(new Error('Failed to load video'));
            };

            // Trigger load
            video.load();
        });
    }

    /**
     * Extract audio from video using FFmpeg
     */
    private async extractAudio(
        videoFile: File,
        onProgress?: (progress: number) => void
    ): Promise<Uint8Array | null> {
        if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

        console.log('[CanvasExport] Starting audio extraction, file size:', videoFile.size, 'bytes');

        // Write input video to FFmpeg virtual filesystem
        console.log('[CanvasExport] Writing video to FFmpeg FS...');
        const fileData = await fetchFile(videoFile);
        console.log('[CanvasExport] File loaded, writing to FS...');
        await this.ffmpeg.writeFile('input.mp4', fileData);
        console.log('[CanvasExport] File written to FS, extracting audio...');

        // Check if video has audio
        // Try to extract audio - will fail gracefully if no audio
        try {
            await this.ffmpeg.exec([
                '-i', 'input.mp4',
                '-vn',
                '-acodec', 'aac',
                '-b:a', '192k',
                'audio.aac',
            ]);
            console.log('[CanvasExport] Audio extraction command completed');

            const audioData = await this.ffmpeg.readFile('audio.aac') as Uint8Array;
            console.log('[CanvasExport] Audio file read, size:', audioData.byteLength, 'bytes');

            // Clean up
            await this.ffmpeg.deleteFile('input.mp4');
            await this.ffmpeg.deleteFile('audio.aac');

            if (audioData.byteLength > 0) {
                return audioData;
            }
            return null;
        } catch (err) {
            // No audio track or extraction failed - clean up and return null
            console.log('[CanvasExport] Audio extraction failed (may have no audio):', err);
            try {
                await this.ffmpeg.deleteFile('input.mp4');
            } catch {}
            return null;
        }
    }

    /**
     * Merge canvas video with extracted audio using FFmpeg
     */
    private async mergeAudioVideo(
        videoBlob: Blob,
        audioData: Uint8Array | null,
        onProgress?: (progress: number) => void
    ): Promise<Blob> {
        if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

        // Write canvas video (WebM)
        const videoArray = new Uint8Array(await videoBlob.arrayBuffer());
        await this.ffmpeg.writeFile('canvas.webm', videoArray);

        if (audioData && audioData.byteLength > 0) {
            // Write audio
            await this.ffmpeg.writeFile('audio.aac', audioData);

            // Merge video + audio
            // OPTIMIZATION: ultrafast preset, higher CRF, 30fps for much faster encoding
            await this.ffmpeg.exec([
                '-i', 'canvas.webm',
                '-i', 'audio.aac',
                '-c:v', 'libx264',
                '-preset', 'ultrafast',  // Much faster encoding
                '-crf', '28',            // Slightly lower quality but faster
                '-r', '30',              // Force 30fps output
                '-c:a', 'aac',
                '-b:a', '192k',
                '-shortest',
                '-movflags', '+faststart',
                'output.mp4',
            ]);

            // Clean up inputs
            await this.ffmpeg.deleteFile('canvas.webm');
            await this.ffmpeg.deleteFile('audio.aac');
        } else {
            // No audio - just convert WebM to MP4
            // OPTIMIZATION: ultrafast preset, higher CRF, 30fps for much faster encoding
            await this.ffmpeg.exec([
                '-i', 'canvas.webm',
                '-c:v', 'libx264',
                '-preset', 'ultrafast',  // Much faster encoding
                '-crf', '28',            // Slightly lower quality but faster
                '-r', '30',              // Force 30fps output
                '-an',
                '-movflags', '+faststart',
                'output.mp4',
            ]);

            // Clean up
            await this.ffmpeg.deleteFile('canvas.webm');
        }

        // Read output
        const outputData = await this.ffmpeg.readFile('output.mp4') as Uint8Array;
        await this.ffmpeg.deleteFile('output.mp4');

        return new Blob([outputData], { type: 'video/mp4' });
    }

    /**
     * Main export function - orchestrates the full canvas export pipeline
     */
    async exportVideo(options: CanvasExportOptions): Promise<Blob> {
        const { videoFile, settings, videoWidth, videoHeight, onProgress } = options;

        // Request wake lock
        await this.requestWakeLock();

        try {
            // Phase 1: Initialize FFmpeg
            onProgress?.({
                phase: 'initializing',
                progress: 0,
                message: 'Preparing...',
            });

            await this.loadFFmpeg((p) => {
                onProgress?.({
                    phase: 'initializing',
                    progress: p,
                    message: 'Preparing...',
                });
            });

            // Phase 2: Extract audio (do this first while video loads)
            onProgress?.({
                phase: 'extracting-audio',
                progress: 0,
                message: 'Preparing...',
            });

            const audioData = await this.extractAudio(videoFile, (p) => {
                onProgress?.({
                    phase: 'extracting-audio',
                    progress: p,
                    message: 'Preparing...',
                });
            });

            console.log('[CanvasExport] Audio extracted:', audioData ? `${audioData.byteLength} bytes` : 'no audio');

            // Phase 3: Record canvas video
            onProgress?.({
                phase: 'recording',
                progress: 0,
                message: 'Rendering video...',
            });

            const canvasVideo = await this.recordCanvasVideo(
                videoFile,
                settings,
                videoWidth,
                videoHeight,
                (p) => {
                    onProgress?.({
                        phase: 'recording',
                        progress: p,
                        message: 'Rendering video...',
                    });
                }
            );

            console.log('[CanvasExport] Canvas video recorded:', canvasVideo.size, 'bytes');

            // Phase 4: Merge audio and video
            onProgress?.({
                phase: 'merging',
                progress: 0,
                message: 'Finalizing...',
            });

            const finalVideo = await this.mergeAudioVideo(canvasVideo, audioData, (p) => {
                onProgress?.({
                    phase: 'merging',
                    progress: p,
                    message: 'Finalizing...',
                });
            });

            console.log('[CanvasExport] Final video:', finalVideo.size, 'bytes');

            onProgress?.({
                phase: 'completed',
                progress: 100,
                message: 'Complete!',
            });

            return finalVideo;

        } finally {
            await this.releaseWakeLock();
        }
    }

    /**
     * Check if MediaRecorder is supported
     */
    isSupported(): boolean {
        return typeof MediaRecorder !== 'undefined' &&
               MediaRecorder.isTypeSupported('video/webm;codecs=vp9');
    }
}

// Singleton instance
export const canvasExportService = new CanvasExportService();
