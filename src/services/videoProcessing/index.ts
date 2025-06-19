/**
 * Video Processing Service
 * 
 * This module provides functionality to process videos from various platforms,
 * transcribe them, and generate new scripts based on the transcription.
 */

// Export types
export * from './types';

// Export services
export { 
  getInstagramVideoInfo, 
  downloadInstagramVideo 
} from './instagramService';

export { 
  getTikTokVideoInfo, 
  downloadTikTokVideo 
} from './tiktokService';

export {
  uploadVideoToAssemblyAI,
  submitTranscriptionRequest,
  getTranscriptionStatus,
  pollForTranscriptionCompletion
} from './transcriptionService';

export {
  generateScripts
} from './scriptGenerationService';

export {
  processVideo,
  processInstagramVideo
} from './videoProcessingService';
