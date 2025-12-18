/**
 * TYLER - Text Utilities for FFmpeg
 */

/**
 * Escape text for FFmpeg drawtext filter
 * Special chars: backslash, single quote, colon, newline, brackets
 */
export function escapeTextForFFmpeg(text: string): string {
    return text
        .replace(/\\/g, '\\\\\\\\')
        .replace(/'/g, "'\\''")
        .replace(/:/g, '\\:')
        .replace(/\n/g, '\\n')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]');
}

/**
 * Calculate appropriate font size based on video dimensions
 * Returns size that fits well for typical vertical video (1080x1920)
 */
export function calculateFontSize(videoWidth: number, videoHeight: number): number {
    // Base size for 1080 width, scale proportionally
    const baseSize = 60;
    const scaleFactor = videoWidth / 1080;
    return Math.round(baseSize * scaleFactor);
}

/**
 * Get CSS font family for preview (maps font name to CSS)
 */
export function getCssFontFamily(fontName: string): string {
    // Map our font names to CSS-safe names
    const fontMap: Record<string, string> = {
        'Montserrat': "'Montserrat', sans-serif",
        'Bebas Neue': "'Bebas Neue', sans-serif",
        'Poppins': "'Poppins', sans-serif",
        'Oswald': "'Oswald', sans-serif",
        'Roboto': "'Roboto', sans-serif",
        'Open Sans': "'Open Sans', sans-serif",
        'Lato': "'Lato', sans-serif",
        'Anton': "'Anton', sans-serif",
        'Inter': "'Inter', sans-serif",
    };
    return fontMap[fontName] || 'sans-serif';
}
