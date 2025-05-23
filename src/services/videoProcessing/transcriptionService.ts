/**
 * Service for handling video transcription using AssemblyAI
 * @module transcriptionService
 */

import { TranscriptionResponse } from './types';

// AssemblyAI API key from environment variables
const ASSEMBLY_AI_API_KEY = import.meta.env.VITE_ASSEMBLY_AI_API_KEY || '8430d0e7333846f296be6a868d3adb2a';

/**
 * Uploads a video file to AssemblyAI for processing
 * @param {ArrayBuffer} videoData - The video data to upload
 * @returns {Promise<string>} The upload URL
 */
export const uploadVideoToAssemblyAI = async (videoData: ArrayBuffer): Promise<string> => {
  try {
    console.log('Uploading video to AssemblyAI, size:', videoData.byteLength, 'bytes');
    
    const response = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLY_AI_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: videoData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      console.error(`AssemblyAI upload failed with status ${response.status}: ${errorText}`);
      throw new Error(`Failed to upload video to AssemblyAI: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.upload_url) {
      console.error('AssemblyAI upload response missing upload_url:', data);
      throw new Error('Invalid response from AssemblyAI: Missing upload URL');
    }
    return data.upload_url;
  } catch (error) {
    // Improved error logging with more details
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    };
    console.error('Error uploading video to AssemblyAI:', errorDetails);
    
    // Rethrow with original error to preserve stack trace
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Failed to upload video to AssemblyAI. Please try again later.');
    }
  }
};

/**
 * Submits a transcription request to AssemblyAI
 * @param {string} audioUrl - The URL of the uploaded audio/video
 * @returns {Promise<string>} The transcription ID
 */
export const submitTranscriptionRequest = async (audioUrl: string): Promise<string> => {
  try {
    console.log('Submitting transcription request for:', audioUrl);
    
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLY_AI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio_url: audioUrl }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      console.error(`AssemblyAI transcription request failed with status ${response.status}: ${errorText}`);
      throw new Error(`Failed to submit transcription request: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.id) {
      console.error('AssemblyAI transcription response missing id:', data);
      throw new Error('Invalid response from AssemblyAI: Missing transcription ID');
    }
    return data.id;
  } catch (error) {
    // Improved error logging with more details
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    };
    console.error('Error submitting transcription request:', errorDetails);
    
    // Rethrow with original error to preserve stack trace
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Failed to submit transcription request. Please try again later.');
    }
  }
};

/**
 * Checks the status of a transcription
 * @param {string} transcriptionId - The ID of the transcription to check
 * @returns {Promise<TranscriptionResponse>} The transcription response
 */
export const getTranscriptionStatus = async (transcriptionId: string): Promise<TranscriptionResponse> => {
  try {
    console.log('Getting transcription status for ID:', transcriptionId);
    
    const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': ASSEMBLY_AI_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      console.error(`AssemblyAI status check failed with status ${response.status}: ${errorText}`);
      throw new Error(`Failed to get transcription status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Improved error logging with more details
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      transcriptionId
    };
    console.error('Error getting transcription status:', errorDetails);
    
    // Rethrow the original error to preserve stack trace
    throw error;
  }
};

/**
 * Polls for transcription completion
 * @param {string} transcriptionId - The ID of the transcription to poll
 * @param {number} maxAttempts - Maximum number of polling attempts
 * @param {number} interval - Polling interval in milliseconds
 * @returns {Promise<TranscriptionResponse>} The completed transcription
 */
export const pollForTranscriptionCompletion = async (
  transcriptionId: string,
  maxAttempts = 30,
  interval = 2000
): Promise<TranscriptionResponse> => {
  console.log('Polling for transcription completion, ID:', transcriptionId);
  
  let attempts = 0;

  const poll = async (): Promise<TranscriptionResponse> => {
    attempts++;
    const transcription = await getTranscriptionStatus(transcriptionId);

    if (transcription.status === 'completed') {
      return transcription;
    } else if (transcription.status === 'error') {
      throw new Error(`Transcription failed: ${transcription.status}`);
    } else if (attempts >= maxAttempts) {
      throw new Error('Transcription timed out');
    }

    return new Promise((resolve) => {
      setTimeout(() => resolve(poll()), interval);
    });
  };

  return poll();
};
