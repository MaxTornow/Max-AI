/**
 * Types for video processing service
 */

export interface VideoDetails {
  url: string;
  platform: string;
}

export interface StoryDetails {
  niche: string;
  targetAudience: string;
  painPoints: string;
  communicationStyle: string;
  heroStory?: string;
}

export interface VideoProcessingRequest {
  videoDetails: VideoDetails;
  storyDetails: StoryDetails;
  systemPrompt?: string;
  language?: string; // BCP-47 code e.g. 'de', or undefined = auto-detect
}

export interface InstagramVideoInfo {
  download_url: string;
  [key: string]: any;
}

export interface TranscriptionResponse {
  id: string;
  status: string;
  text?: string;
  [key: string]: any;
}

export interface ScriptGenerationResponse {
  original_transcription: {
    text: string;
  };
  script_1: {
    text: string;
  };
  script_2: {
    text: string;
  };
  script_3: {
    text: string;
  };
}

export type ProcessingStage = 
  | 'initializing'
  | 'fetching_video_info'
  | 'downloading_video'
  | 'uploading_to_transcription_service'
  | 'transcribing_video'
  | 'generating_scripts'
  | 'completed'
  | 'error';

export interface ProcessingStatus {
  stage: ProcessingStage;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // in seconds
}

export interface VideoProcessingResult {
  transcription: string;
  scripts: {
    script_1: string;
    script_2: string;
    script_3: string;
  };
  originalVideoUrl: string;
  platform: string;
}
