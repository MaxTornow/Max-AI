/**
 * TYLER - Simple Text Overlay Types
 * Browser-based video text overlay with ffmpeg.wasm
 */

/** Text alignment options */
export type TextAlignment = 'left' | 'center' | 'right';

/** Layer identifier */
export type LayerId = 'headline' | 'body';

/** Available font options */
export interface FontOption {
    name: string;          // Display name: "Montserrat"
    file: string;          // TTF filename: "Montserrat/static/Montserrat-Bold.ttf"
    style: string;         // Description: "Modern, clean"
}

/** Individual text layer configuration */
export interface TextLayer {
    id: LayerId;
    enabled: boolean;
    text: string;
    fontSize: number;           // 20-120 pixels
    textColor: string;          // Hex: "#FFFFFF"
    yPositionPercent: number;   // 0-100, vertical position
    alignment: TextAlignment;
}

/** Text overlay settings - supports multiple layers sharing a font */
export interface TextOverlaySettings {
    fontName: string;           // Shared across all layers
    layers: TextLayer[];        // Array of layer configurations
}

/** OLD format for migration detection - DO NOT USE for new code */
export interface LegacyTextOverlaySettings {
    text: string;
    fontName: string;
    fontSize: number;
    textColor: string;
    yPositionPercent: number;
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
