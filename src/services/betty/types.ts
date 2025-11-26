/**
 * BETTY - AI Video Editor Types
 * Batch Editing Tool for Trending YouTube videos
 */

/** Submagic processing status values */
export type SubmagicStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** Request body for POST /v1/projects */
export interface SubmagicCreateProjectRequest {
  title: string;
  language: string;  // e.g., "en", "es", "fr"
  videoUrl: string;  // Signed URL to uploaded video
  templateName: string;  // e.g., "Hormozi 4", "Sara"
  webhookUrl?: string;  // Optional webhook for completion notification
  dictionary?: string[];  // Custom words for transcription accuracy
  magicZooms: boolean;
  magicBrolls: boolean;
  magicBrollsPercentage: number;  // 0-100
}

/** Response from POST /v1/projects */
export interface SubmagicCreateProjectResponse {
  id: string;  // Project ID for polling
  status: SubmagicStatus;
  createdAt: string;
}

/** Response from GET /v1/projects/:id */
export interface SubmagicProjectResponse {
  id: string;
  status: SubmagicStatus;
  title: string;
  language: string;
  templateName: string;
  downloadUrl?: string;  // Present when status = "completed" (expires in hours)
  transcript?: SubmagicTranscript;
  errorMessage?: string;  // Present when status = "failed"
  createdAt: string;
  updatedAt: string;
}

/** Transcript with timing data */
export interface SubmagicTranscript {
  text: string;
  segments: {
    start: number;  // seconds
    end: number;
    text: string;
  }[];
}

/** Local video record (maps to Supabase videos table) */
export interface Video {
  id: string;
  user_id: string;
  title: string;
  original_filename: string;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  original_storage_path: string;
  processed_storage_path: string | null;
  submagic_project_id: string | null;
  submagic_status: SubmagicStatus;
  submagic_download_url: string | null;
  template_name: string;
  language: string;
  magic_zooms: boolean;
  magic_brolls: boolean;
  magic_brolls_percentage: number;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
}

/** Template definition */
export interface BettyTemplate {
  key: string;
  name: string;
  submagicTemplateName: string;
  description: string;
  previewColor: string;  // For UI display
  defaults: {
    magicZooms: boolean;
    magicBrolls: boolean;
    magicBrollsPercentage: number;
  };
}

/** Upload state for progress tracking */
export type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; progress: number; filename: string }
  | { status: 'uploaded'; videoId: string; storagePath: string }
  | { status: 'error'; message: string };

/** Processing state for tracking */
export type ProcessingState =
  | { status: 'idle' }
  | { status: 'creating'; message: string }
  | { status: 'processing'; projectId: string; progress: number }
  | { status: 'downloading'; message: string }
  | { status: 'completed'; videoId: string }
  | { status: 'error'; message: string; retryable: boolean };

/** Supported video MIME types */
export const ACCEPTED_VIDEO_TYPES = {
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/webm': ['.webm'],
};

/** Maximum file size (2GB in bytes) */
export const MAX_FILE_SIZE = 2147483648;

/** Supported language options */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'ru', label: 'Russian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
] as const;
