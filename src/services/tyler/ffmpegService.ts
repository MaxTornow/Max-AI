/**
 * TYLER - FFmpeg Service
 * Browser-based video processing with ffmpeg.wasm
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { FONTS } from './constants';
import { escapeTextForFFmpeg } from './textUtils';
import type { TextOverlaySettings, TextPosition, TextAlignment } from './types';

// CRITICAL: Load from unpkg CDN for proper SharedArrayBuffer support
const BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

class FFmpegService {
    private ffmpeg: FFmpeg;
    private loaded = false;
    private fontsLoaded = false;
    private wakeLock: WakeLockSentinel | null = null;

    constructor() {
        this.ffmpeg = new FFmpeg();
    }

    /**
     * Request a screen wake lock to prevent browser throttling during export
     * Falls back gracefully if not supported
     */
    private async requestWakeLock(): Promise<void> {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake lock acquired for video processing');
            }
        } catch (err) {
            console.warn('Wake lock not available:', err);
        }
    }

    /**
     * Release the wake lock after processing
     */
    private async releaseWakeLock(): Promise<void> {
        if (this.wakeLock) {
            try {
                await this.wakeLock.release();
                this.wakeLock = null;
                console.log('Wake lock released');
            } catch (err) {
                console.warn('Failed to release wake lock:', err);
            }
        }
    }

    async load(onProgress?: (progress: number) => void): Promise<void> {
        if (this.loaded) return;

        // PATTERN: Progress callback for UI feedback
        this.ffmpeg.on('progress', ({ progress }) => {
            onProgress?.(Math.round(progress * 100));
        });

        // CRITICAL: Use toBlobURL to bypass CORS
        await this.ffmpeg.load({
            coreURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        this.loaded = true;
    }

    private async loadFonts(): Promise<void> {
        if (this.fontsLoaded) return;

        // CRITICAL: Create /fonts directory in virtual filesystem first
        try {
            await this.ffmpeg.createDir('/fonts');
        } catch {
            // Directory may already exist
        }

        // CRITICAL: Load all fonts into virtual filesystem
        // Use flat filenames to avoid nested directory issues
        for (const font of FONTS) {
            try {
                const fontData = await fetchFile(`/fonts/${font.file}`);
                // Extract just the filename for FFmpeg's virtual FS (avoid nested dirs)
                const flatFileName = font.file.split('/').pop() || font.file;
                await this.ffmpeg.writeFile(
                    `/fonts/${flatFileName}`,
                    fontData
                );
            } catch (error) {
                console.warn(`Failed to load font ${font.name}:`, error);
            }
        }

        this.fontsLoaded = true;
    }

    async processVideo(
        videoFile: File,
        settings: TextOverlaySettings,
        videoWidth: number,
        videoHeight: number,
        onProgress?: (progress: number) => void
    ): Promise<Blob> {
        if (!this.loaded) {
            throw new Error('FFmpeg not loaded. Call load() first.');
        }

        // Request wake lock to prevent browser throttling when tab is backgrounded
        await this.requestWakeLock();

        try {
            // Set up progress listener
            this.ffmpeg.on('progress', ({ progress }) => {
                onProgress?.(Math.round(progress * 100));
            });

            await this.loadFonts();

            // Write input video to virtual filesystem
            const inputName = 'input.mp4';
            const outputName = 'output.mp4';
            await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

            // Build drawtext filter for each line
            const fontFilePath = FONTS.find(f => f.name === settings.fontName)?.file || FONTS[0].file;
            const fontFile = fontFilePath.split('/').pop() || fontFilePath;
            const fontColor = settings.textColor.replace('#', '');

            // Split text into lines and create a drawtext filter for each
            const lines = settings.text.split('\n').filter(line => line.trim());
            const lineHeight = settings.fontSize * 1.3; // Line spacing
            const totalTextHeight = lines.length * lineHeight;

            // Calculate base Y position for the text block
            const baseY = this.getBaseYPosition(settings.position, videoHeight, totalTextHeight);

            // Build filter chain with one drawtext per line
            const drawtextFilters = lines.map((line, index) => {
                const escapedLine = this.escapeForDrawtext(line);
                const lineY = Math.round(baseY + (index * lineHeight));
                const xPos = this.getXPositionExpr(settings.alignment);

                return `drawtext=text='${escapedLine}':fontfile=/fonts/${fontFile}:fontsize=${settings.fontSize}:fontcolor=${fontColor}:${xPos}:y=${lineY}:shadowcolor=black@0.7:shadowx=2:shadowy=2`;
            });

            // Join all drawtext filters
            const filterComplex = drawtextFilters.join(',');

            // Execute ffmpeg command
            await this.ffmpeg.exec([
                '-i', inputName,
                '-vf', filterComplex,
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-c:a', 'copy',
                '-movflags', '+faststart',
                outputName,
            ]);

            // Read output file
            const data = await this.ffmpeg.readFile(outputName);

            // Clean up
            await this.ffmpeg.deleteFile(inputName);
            await this.ffmpeg.deleteFile(outputName);

            return new Blob([data], { type: 'video/mp4' });
        } finally {
            // Always release wake lock when done
            await this.releaseWakeLock();
        }
    }

    /**
     * Escape text for FFmpeg drawtext filter
     */
    private escapeForDrawtext(text: string): string {
        return text
            .replace(/\\/g, '\\\\\\\\')
            .replace(/'/g, "'\\''")
            .replace(/:/g, '\\:')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]');
    }

    /**
     * Calculate base Y position in pixels for the text block
     */
    private getBaseYPosition(position: TextPosition, videoHeight: number, totalTextHeight: number): number {
        switch (position) {
            case 'top':
                return Math.round(videoHeight * 0.10);
            case 'middle':
                return Math.round((videoHeight - totalTextHeight) / 2);
            case 'bottom':
                return Math.round(videoHeight * 0.85 - totalTextHeight);
        }
    }

    /**
     * Get X position expression for FFmpeg (uses text_w for centering)
     */
    private getXPositionExpr(alignment: TextAlignment): string {
        switch (alignment) {
            case 'left': return 'x=w*0.05';
            case 'center': return 'x=(w-text_w)/2';
            case 'right': return 'x=w*0.95-text_w';
        }
    }

    private getYPosition(position: TextPosition): string {
        switch (position) {
            case 'top': return 'y=h*0.15';
            case 'middle': return 'y=(h-text_h)/2';
            case 'bottom': return 'y=h*0.85-text_h';
        }
    }

    private getXPosition(alignment: TextAlignment): string {
        switch (alignment) {
            case 'left': return 'x=w*0.05';
            case 'center': return 'x=(w-text_w)/2';
            case 'right': return 'x=w*0.95-text_w';
        }
    }

    isLoaded(): boolean {
        return this.loaded;
    }
}

// Singleton instance
export const ffmpegService = new FFmpegService();
