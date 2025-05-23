/**
 * Custom hook for video processing functionality
 * @module useVideoProcessing
 */

import { useState } from 'react';
import { useMutation } from 'react-query';
import { 
  VideoProcessingRequest, 
  VideoProcessingResult,
  processVideo 
} from '../services/videoProcessing';

/**
 * Hook for handling video processing operations
 * @returns {Object} Video processing state and functions
 */
export const useVideoProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  // Use React Query for mutation
  const mutation = useMutation<VideoProcessingResult, Error, VideoProcessingRequest>(
    async (request: VideoProcessingRequest) => {
      try {
        setIsProcessing(true);
        setProgress(10); // Started
        
        // Process the video
        const result = await processVideo(request);
        
        setProgress(100); // Completed
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error occurred'));
        throw err;
      } finally {
        setIsProcessing(false);
      }
    }
  );

  /**
   * Process a video and generate scripts
   * @param {VideoProcessingRequest} request - The video processing request
   * @returns {Promise<VideoProcessingResult>} The processing result
   */
  const processVideoWithProgress = async (request: VideoProcessingRequest): Promise<VideoProcessingResult> => {
    setError(null);
    return mutation.mutateAsync(request);
  };

  return {
    processVideo: processVideoWithProgress,
    isProcessing,
    progress,
    error,
    result: mutation.data,
    reset: () => {
      mutation.reset();
      setError(null);
      setProgress(0);
    }
  };
};

export default useVideoProcessing;
