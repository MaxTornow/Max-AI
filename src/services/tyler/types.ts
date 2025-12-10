/**
 * TYLER - Simple Text Overlay Types
 * Browser-based video text overlay with ffmpeg.wasm
 */

/** Text overlay position zones */
export type TextPosition = 'top' | 'middle' | 'bottom';

/** Text alignment options */
export type TextAlignment = 'left' | 'center' | 'right';

/** Available font options */
export interface FontOption {
    name: string;          // Display name: "Montserrat"
    file: string;          // TTF filename: "Montserrat/static/Montserrat-Bold.ttf"
    style: string;         // Description: "Modern, clean"
}

/** Text overlay settings */
export interface TextOverlaySettings {
    text: string;
    fontName: string;
    fontSize: number;       // 20-120 pixels
    textColor: string;      // Hex: "#FFFFFF"
    position: TextPosition;
    alignment: TextAlignment;
}

/** FFmpeg loading state */
export type FFmpegLoadState =
    | { status: 'idle' }
    | { status: 'loading'; progress: number }
    | { status: 'loaded' }
    | { status: 'error'; message: string };

/** Video processing state */
export type ProcessingState =
    | { status: 'idle' }
    | { status: 'processing'; progress: number }
    | { status: 'completed'; blobUrl: string }
    | { status: 'error'; message: string };

/** Main editor state */
export interface EditorState {
    videoFile: File | null;
    videoUrl: string | null;  // Object URL for preview
    videoDuration: number;
    videoWidth: number;
    videoHeight: number;
    settings: TextOverlaySettings;
    ffmpegState: FFmpegLoadState;
    processingState: ProcessingState;
}
