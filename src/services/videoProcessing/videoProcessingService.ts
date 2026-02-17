/**
 * Main service for processing videos and generating scripts
 * @module videoProcessingService
 */

import { 
  VideoProcessingRequest,
  VideoProcessingResult,
  ProcessingStage,
  ProcessingStatus
} from './types';
import { getInstagramVideoInfo, downloadInstagramVideo } from './instagramService';
import { getTikTokVideoInfo } from './tiktokService';
import { 
  uploadVideoToAssemblyAI, 
  submitTranscriptionRequest, 
  pollForTranscriptionCompletion 
} from './transcriptionService';
import { generateScripts } from './scriptGenerationService';

/**
 * Processes a video from Instagram and generates scripts
 * @param {VideoProcessingRequest} request - The video processing request
 * @returns {Promise<VideoProcessingResult>} The processing result with transcription and scripts
 */
export const processInstagramVideo = async (
  request: VideoProcessingRequest
): Promise<VideoProcessingResult> => {
  return processInstagramVideoWithStatus(request);
};

/**
 * Processes a video from Instagram with status updates
 * @param {VideoProcessingRequest} request - The video processing request
 * @param {function} updateStatus - Function to call with status updates
 * @returns {Promise<VideoProcessingResult>} The processing result
 */
export const processInstagramVideoWithStatus = async (
  request: VideoProcessingRequest,
  updateStatus?: (stage: ProcessingStage, progress: number, message: string, estimatedTimeRemaining?: number) => void
): Promise<VideoProcessingResult> => {
  try {
    // Default no-op update function if none provided
    const update = updateStatus || (() => {});
    
    // Step 1: Get video info from Instagram
    update('fetching_video_info', 10, 'Fetching video information from Instagram...');
    const videoInfo = await getInstagramVideoInfo(request.videoDetails.url);
    
    // Step 2: Download the video
    update('downloading_video', 20, 'Downloading video from Instagram...');
    const videoData = await downloadInstagramVideo(videoInfo.download_url);
    
    // Step 3: Upload the video to AssemblyAI
    update('uploading_to_transcription_service', 30, 'Uploading video to transcription service...');
    const uploadUrl = await uploadVideoToAssemblyAI(videoData);
    
    // Step 4: Submit transcription request
    update('transcribing_video', 40, 'Starting video transcription...', 60); // Estimate 60 seconds
    const transcriptionId = await submitTranscriptionRequest(uploadUrl, request.language);

    // Step 5: Poll for transcription completion
    update('transcribing_video', 50, 'Transcribing video content...', 45); // Updated estimate
    const transcription = await pollForTranscriptionCompletion(transcriptionId);

    if (!transcription.text) {
      update('error', 0, 'Transcription completed but no text was generated');
      throw new Error('Transcription completed but no text was generated');
    }

    // Step 6: Generate scripts using Claude AI
    update('generating_scripts', 70, 'Generating script variations...', 30);
    const scripts = await generateScripts(
      transcription.text,
      request.storyDetails,
      request.systemPrompt,
      request.apiKey,
      request.language
    );
    
    // Complete
    update('completed', 100, 'Processing complete!');
    
    // Return the result
    return {
      transcription: transcription.text,
      scripts: {
        script_1: scripts.script_1.text,
        script_2: scripts.script_2.text,
        script_3: scripts.script_3.text
      },
      originalVideoUrl: request.videoDetails.url,
      platform: request.videoDetails.platform
    };
  } catch (error) {
    console.error('Error processing Instagram video:', error);
    if (updateStatus) {
      updateStatus('error', 0, error instanceof Error ? error.message : 'Unknown error processing Instagram video');
    }
    throw error;
  }
};

/**
 * Processes a video from TikTok and generates scripts
 * @param {VideoProcessingRequest} request - The video processing request
 * @returns {Promise<VideoProcessingResult>} The processing result with transcription and scripts
 */
export const processTikTokVideo = async (
  request: VideoProcessingRequest
): Promise<VideoProcessingResult> => {
  return processTikTokVideoWithStatus(request);
};

/**
 * Processes a video from TikTok with status updates
 * @param {VideoProcessingRequest} request - The video processing request
 * @param {function} updateStatus - Function to call with status updates
 * @returns {Promise<VideoProcessingResult>} The processing result
 */
export const processTikTokVideoWithStatus = async (
  request: VideoProcessingRequest,
  updateStatus?: (stage: ProcessingStage, progress: number, message: string, estimatedTimeRemaining?: number) => void
): Promise<VideoProcessingResult> => {
  try {
    // Default no-op update function if none provided
    const update = updateStatus || (() => {});
    
    // Step 1: Get video info from TikTok (returns a tikwm.com CDN URL, publicly accessible)
    update('fetching_video_info', 10, 'Fetching video information from TikTok...');
    const videoInfo = await getTikTokVideoInfo(request.videoDetails.url);

    // Step 2: Submit URL directly to AssemblyAI — tikwm.com CDN URLs are publicly
    // accessible so AssemblyAI can fetch the video itself. This avoids downloading
    // the file through our server, which fails for IP-locked TikTok CDN URLs.
    update('uploading_to_transcription_service', 30, 'Submitting video to transcription service...');
    const transcriptionId = await submitTranscriptionRequest(videoInfo.download_url, request.language);

    // Step 5: Poll for transcription completion
    update('transcribing_video', 50, 'Transcribing video content...', 45); // Updated estimate
    const transcription = await pollForTranscriptionCompletion(transcriptionId);

    if (!transcription.text) {
      update('error', 0, 'Transcription completed but no text was generated');
      throw new Error('Transcription completed but no text was generated');
    }

    // Step 6: Generate scripts using Claude AI
    update('generating_scripts', 70, 'Generating script variations...', 30);
    const scripts = await generateScripts(
      transcription.text,
      request.storyDetails,
      request.systemPrompt,
      request.apiKey,
      request.language
    );
    
    // Complete
    update('completed', 100, 'Processing complete!');
    
    // Return the result
    return {
      transcription: transcription.text,
      scripts: {
        script_1: scripts.script_1.text,
        script_2: scripts.script_2.text,
        script_3: scripts.script_3.text
      },
      originalVideoUrl: request.videoDetails.url,
      platform: request.videoDetails.platform
    };
  } catch (error) {
    console.error('Error processing TikTok video:', error);
    if (updateStatus) {
      updateStatus('error', 0, error instanceof Error ? error.message : 'Unknown error processing TikTok video');
    }
    throw error;
  }
};

/**
 * Main entry point for processing videos from different platforms
 * @param {VideoProcessingRequest} request - The video processing request
 * @param {function} onStatusUpdate - Optional callback for status updates
 * @returns {Promise<VideoProcessingResult>} The processing result
 */
export const processVideo = async (
  request: VideoProcessingRequest,
  onStatusUpdate?: (status: ProcessingStatus) => void
): Promise<VideoProcessingResult> => {
  // Helper function to update status
  const updateStatus = (stage: ProcessingStage, progress: number, message: string, estimatedTimeRemaining?: number) => {
    if (onStatusUpdate) {
      onStatusUpdate({
        stage,
        progress,
        message,
        estimatedTimeRemaining
      });
    }
  };

  try {
    // Validate the request
    updateStatus('initializing', 0, 'Validating request...');
    
    if (!request.videoDetails || !request.videoDetails.url || !request.videoDetails.platform) {
      updateStatus('error', 0, 'Invalid request: Missing video details');
      throw new Error('Invalid request: Missing video details');
    }
    
    if (!request.storyDetails) {
      updateStatus('error', 0, 'Invalid request: Missing story details');
      throw new Error('Invalid request: Missing story details');
    }
    
    // Process based on platform
    switch (request.videoDetails.platform.toLowerCase()) {
      case 'instagram':
        return await processInstagramVideoWithStatus(request, updateStatus);
      case 'tiktok':
        return await processTikTokVideoWithStatus(request, updateStatus);
      // Add support for other platforms here
      default:
        updateStatus('error', 0, `Unsupported platform: ${request.videoDetails.platform}`);
        throw new Error(`Unsupported platform: ${request.videoDetails.platform}`);
    }
  } catch (error) {
    updateStatus('error', 0, error instanceof Error ? error.message : 'Unknown error occurred');
    throw error;
  }
};
