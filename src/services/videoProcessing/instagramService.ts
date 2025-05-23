/**
 * Service for handling Instagram video processing
 * @module instagramService
 */

import { InstagramVideoInfo } from './types';

// FastSaver API token from environment variables
const FASTSAVER_API_TOKEN = import.meta.env.VITE_FASTSAVER_API_TOKEN || '5NyVIfAQAfByOWLzZVZboVz6';

/**
 * Fetches information about an Instagram video
 * @param {string} url - The Instagram video URL
 * @returns {Promise<InstagramVideoInfo>} Video information including download URL
 */
export const getInstagramVideoInfo = async (url: string): Promise<InstagramVideoInfo> => {
  console.log('[DEBUG] getInstagramVideoInfo - Starting with URL:', url);
  try {
    console.log('[DEBUG] getInstagramVideoInfo - Fetching Instagram video info for:', url);
    
    // Using proxy to avoid CORS issues
    const apiUrl = `/api/fastsaver/get-info?url=${encodeURIComponent(url)}&token=${FASTSAVER_API_TOKEN}`;
    console.log('[DEBUG] getInstagramVideoInfo - API URL:', apiUrl);
    
    console.log('[DEBUG] getInstagramVideoInfo - Making API request...');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('[DEBUG] getInstagramVideoInfo - Response status:', response.status, response.statusText);
    console.log('[DEBUG] getInstagramVideoInfo - Response headers:', JSON.stringify(Object.fromEntries([...response.headers])));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Instagram video info: ${response.status} ${response.statusText}`);
    }

    console.log('[DEBUG] getInstagramVideoInfo - Parsing response JSON...');
    const data = await response.json();
    console.log('[DEBUG] getInstagramVideoInfo - Response data:', JSON.stringify(data, null, 2));
    
    // Validate the response data
    console.log('[DEBUG] getInstagramVideoInfo - Validating response data...');
    console.log('[DEBUG] getInstagramVideoInfo - Has data:', !!data);
    console.log('[DEBUG] getInstagramVideoInfo - Has download_url:', data && !!data.download_url);
    
    if (!data || !data.download_url) {
      throw new Error('Invalid response from FastSaver API: Missing download URL');
    }
    
    console.log('[DEBUG] getInstagramVideoInfo - Validation successful, returning data');
    return data as InstagramVideoInfo;
  } catch (error) {
    console.error('[DEBUG] getInstagramVideoInfo - Error:', error);
    if (error instanceof Error) {
      console.error('[DEBUG] getInstagramVideoInfo - Error type:', error.constructor.name);
      console.error('[DEBUG] getInstagramVideoInfo - Error message:', error.message);
      console.error('[DEBUG] getInstagramVideoInfo - Error stack:', error.stack);
    } else {
      console.error('[DEBUG] getInstagramVideoInfo - Unknown error type:', typeof error);
    }
    console.error('Error fetching Instagram video info:', error);
    throw new Error('Failed to fetch Instagram video info. Please check the URL and try again.');
  }
};

/**
 * Downloads an Instagram video from the provided URL
 * @param {string} downloadUrl - The URL to download the video from
 * @returns {Promise<ArrayBuffer>} The video data as an ArrayBuffer
 */
export const downloadInstagramVideo = async (downloadUrl: string): Promise<ArrayBuffer> => {
  console.log('[DEBUG] downloadInstagramVideo - Starting with URL:', downloadUrl.substring(0, 50) + '...');
  try {
    console.log('[DEBUG] downloadInstagramVideo - Downloading Instagram video from:', downloadUrl.substring(0, 50) + '...');
    
    console.log('[DEBUG] downloadInstagramVideo - Making download request...');
    const startTime = Date.now();
    const response = await fetch(downloadUrl, {
      method: 'GET',
    });

    // Fixed: Corrected the debug log prefix from getInstagramVideoInfo to downloadInstagramVideo
    console.log('[DEBUG] downloadInstagramVideo - Response status:', response.status, response.statusText);
    console.log('[DEBUG] downloadInstagramVideo - Response headers:', JSON.stringify(Object.fromEntries([...response.headers])));
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      console.error(`[DEBUG] downloadInstagramVideo - Failed with status ${response.status}: ${errorText}`);
      throw new Error(`Failed to download Instagram video: ${response.status} ${response.statusText}`);
    }

    console.log('[DEBUG] downloadInstagramVideo - Getting response as ArrayBuffer...');
    const videoData = await response.arrayBuffer();
    
    // Validate video data
    if (!videoData || videoData.byteLength === 0) {
      console.error('[DEBUG] downloadInstagramVideo - Received empty video data');
      throw new Error('Received empty video data from Instagram');
    }
    
    const downloadTime = Date.now() - startTime;
    
    console.log('[DEBUG] downloadInstagramVideo - Download successful!');
    console.log('[DEBUG] downloadInstagramVideo - Video size:', (videoData.byteLength / 1024 / 1024).toFixed(2), 'MB');
    console.log('[DEBUG] downloadInstagramVideo - Download time:', downloadTime / 1000, 'seconds');
    
    return videoData;
  } catch (error) {
    // Create a structured error object with all available details
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error,
      url: downloadUrl.substring(0, 50) + '...' // Only include part of the URL for privacy
    };
    
    console.error('[DEBUG] downloadInstagramVideo - Error details:', JSON.stringify(errorDetails, null, 2));
    console.error('Error downloading Instagram video:', errorDetails);
    
    // Rethrow with original error to preserve stack trace
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Failed to download Instagram video. Please check your internet connection and try again.');
    }
  }
};
