/**
 * Service for handling video transcription using AssemblyAI
 * @module transcriptionService
 */

import { TranscriptionResponse } from './types';

import { API_KEYS, ASSEMBLY_AI_CONFIG } from './config';

/**
 * Uploads a video file to AssemblyAI for processing
 * @param {ArrayBuffer} videoData - The video data to upload
 * @returns {Promise<string>} The upload URL
 */
export const uploadVideoToAssemblyAI = async (videoData: ArrayBuffer): Promise<string> => {
  // Validate API key is configured
  if (!API_KEYS.ASSEMBLY_AI) {
    throw new Error('AssemblyAI API key not configured. Set VITE_ASSEMBLY_AI_API_KEY in .env');
  }

  try {
    console.log('Uploading video to AssemblyAI, size:', videoData.byteLength, 'bytes');
    
    // Create controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ASSEMBLY_AI_CONFIG.UPLOAD_TIMEOUT_MS); // Use config timeout
    
    try {
      const response = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'Authorization': API_KEYS.ASSEMBLY_AI,
          'Content-Type': 'application/octet-stream',
        },
        body: videoData,
        signal: controller.signal
      });
      
      // Clear the timeout since the request completed
      clearTimeout(timeoutId);
      
      // Capture response headers for diagnostics
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log('AssemblyAI upload response headers:', responseHeaders);
      console.log('AssemblyAI upload response status:', response.status);

      // Check for specific HTTP status codes that indicate rate limiting or other issues
      if (response.status === 429) {
        console.error('API RATE LIMIT EXCEEDED - AssemblyAI is rate limiting requests');
        
        // Try to get retry-after header
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) {
          console.log(`Retry-After header suggests waiting ${retryAfter} seconds`);
        }
        
        const errorText = await response.text().catch(() => 'Could not read error response');
        throw new Error(`RATE_LIMIT: AssemblyAI API rate limit exceeded. ${errorText}`);
      } else if (response.status === 401 || response.status === 403) {
        console.error('AUTHENTICATION ERROR - AssemblyAI rejected the API key');
        const errorText = await response.text().catch(() => 'Could not read error response');
        throw new Error(`AUTH_ERROR: Invalid AssemblyAI API key. ${errorText}`);
      } else if (response.status >= 500) {
        console.error(`SERVER ERROR - AssemblyAI returned a ${response.status} error`);
        const errorText = await response.text().catch(() => 'Could not read error response');
        throw new Error(`SERVER_ERROR: AssemblyAI server error (${response.status}). ${errorText}`);
      } else if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error(`HTTP ERROR - AssemblyAI returned a ${response.status} error: ${errorText}`);
        throw new Error(`HTTP_ERROR: Failed to upload video to AssemblyAI (${response.status}). ${errorText}`);
      }

      const data = await response.json();
      if (!data.upload_url) {
        console.error('AssemblyAI upload response missing upload_url:', data);
        throw new Error('INVALID_RESPONSE: Invalid response from AssemblyAI: Missing upload URL');
      }
      return data.upload_url;
    } catch (fetchError: any) {
      // Clear the timeout if it's still active
      clearTimeout(timeoutId);
      
      // Analyze the fetch error to provide more specific diagnostics
      if (fetchError.name === 'AbortError') {
        console.error('REQUEST TIMEOUT - The upload to AssemblyAI took too long to complete');
        throw new Error(`TIMEOUT: AssemblyAI upload request timed out after ${ASSEMBLY_AI_CONFIG.UPLOAD_TIMEOUT_MS / 1000} seconds`);
      } else if (fetchError.message?.includes('NetworkError') || fetchError.message?.includes('network')) {
        console.error('NETWORK ERROR - There was a problem with the network connection to AssemblyAI');
        throw new Error(`NETWORK_ERROR: Network error during AssemblyAI upload: ${fetchError.message}`);
      } else if (fetchError.message?.includes('Failed to fetch')) {
        console.error('FETCH ERROR - The fetch operation to AssemblyAI failed');
        // Try to determine if this is due to CORS, network change, etc.
        if (fetchError.stack?.includes('TypeError: Failed to fetch')) {
          console.error('This appears to be a general fetch failure, possibly due to network changes or CORS issues');
          throw new Error(`FETCH_ERROR: Failed to connect to AssemblyAI API: ${fetchError.message}`);
        }
      }
      
      // If we haven't thrown a more specific error, rethrow the original
      throw fetchError;
    }
  } catch (error: any) {
    // Improved error logging with more details
    const errorDetails = {
      message: error.message || 'Unknown error',
      name: error.name || 'Unknown',
      stack: error.stack,
      type: error.message?.startsWith('RATE_LIMIT:') ? 'RATE_LIMIT' :
            error.message?.startsWith('AUTH_ERROR:') ? 'AUTH_ERROR' :
            error.message?.startsWith('SERVER_ERROR:') ? 'SERVER_ERROR' :
            error.message?.startsWith('HTTP_ERROR:') ? 'HTTP_ERROR' :
            error.message?.startsWith('TIMEOUT:') ? 'TIMEOUT' :
            error.message?.startsWith('NETWORK_ERROR:') ? 'NETWORK_ERROR' :
            error.message?.startsWith('FETCH_ERROR:') ? 'FETCH_ERROR' :
            error.message?.startsWith('INVALID_RESPONSE:') ? 'INVALID_RESPONSE' :
            'UNKNOWN'
    };
    
    console.error('Error uploading video to AssemblyAI:', errorDetails);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // Rethrow with the error type prefix preserved
    throw error;
  }
};

/**
 * Submits a transcription request to AssemblyAI
 * @param {string} audioUrl - The URL of the uploaded audio/video
 * @param {string} [language] - BCP-47 language code (e.g. 'de'). Omit or pass 'auto' for auto-detection.
 * @returns {Promise<string>} The transcription ID
 */
export const submitTranscriptionRequest = async (audioUrl: string, language?: string): Promise<string> => {
  try {
    console.log('Submitting transcription request for:', audioUrl);

    const body: Record<string, unknown> = { audio_url: audioUrl };
    if (!language || language === 'auto') {
      body.language_detection = true;
    } else {
      body.language_code = language;
    }

    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': API_KEYS.ASSEMBLY_AI,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
        'Authorization': API_KEYS.ASSEMBLY_AI,
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
