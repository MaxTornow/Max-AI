/**
 * Service for handling Instagram video processing
 * @module instagramService
 */

import { InstagramVideoInfo } from './types';
import { API_KEYS } from './config';

/**
 * Response type for new FastSaver API
 */
interface FastSaverResponse {
  ok: boolean;
  id: string;
  source: string;
  type: string;
  download_url: string;
  thumbnail_url: string;
  width?: number;
  height?: number;
  duration?: number;
  caption?: string;
}

/**
 * Maps new FastSaver API response to existing InstagramVideoInfo type
 * Preserves backward compatibility with existing code
 */
const mapFastSaverResponse = (response: FastSaverResponse): InstagramVideoInfo => ({
  error: !response.ok,
  hosting: response.source?.replace('.com', '') || 'unknown',
  shortcode: response.id,
  download_url: response.download_url,
  thumbnail: response.thumbnail_url,
  caption: response.caption || '',
  // Include new fields (InstagramVideoInfo allows any via [key: string]: any)
  type: response.type,
  width: response.width,
  height: response.height,
  duration: response.duration,
});

/**
 * Fetches information about an Instagram video
 * @param {string} url - The Instagram video URL
 * @returns {Promise<InstagramVideoInfo>} Video information including download URL
 */
export const getInstagramVideoInfo = async (url: string): Promise<InstagramVideoInfo> => {
  console.log('[DEBUG] getInstagramVideoInfo - Starting with URL:', url);

  // Validate API key is configured
  if (!API_KEYS.FASTSAVER) {
    console.error('[DEBUG] getInstagramVideoInfo - API key not configured');
    throw new Error('FastSaver API key not configured. Set VITE_FASTSAVER_API_TOKEN in .env');
  }

  try {
    console.log('[DEBUG] getInstagramVideoInfo - Fetching Instagram video info for:', url);

    // NEW: Using /fetch endpoint, auth handled by proxy via X-Api-Key header
    const apiUrl = `/api/fastsaver/fetch?url=${encodeURIComponent(url)}`;
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
    const data: FastSaverResponse = await response.json();
    console.log('[DEBUG] getInstagramVideoInfo - Response data:', JSON.stringify(data, null, 2));

    // NEW: Validate using 'ok' field instead of checking for 'error'
    console.log('[DEBUG] getInstagramVideoInfo - Validating response data...');
    console.log('[DEBUG] getInstagramVideoInfo - Has data:', !!data);
    console.log('[DEBUG] getInstagramVideoInfo - ok field:', data?.ok);
    console.log('[DEBUG] getInstagramVideoInfo - Has download_url:', data && !!data.download_url);

    if (!data || !data.ok || !data.download_url) {
      throw new Error('Invalid response from FastSaver API: Missing download URL or request failed');
    }

    // Map to existing interface for backward compatibility
    const mappedData = mapFastSaverResponse(data);
    console.log('[DEBUG] getInstagramVideoInfo - Mapped data:', JSON.stringify(mappedData, null, 2));
    console.log('[DEBUG] getInstagramVideoInfo - Validation successful, returning data');

    return mappedData;
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
 * Uses direct fetch (like the original working version) instead of proxy
 * @param {string} downloadUrl - The URL to download the video from
 * @returns {Promise<ArrayBuffer>} The video data as an ArrayBuffer
 */
export const downloadInstagramVideo = async (downloadUrl: string): Promise<ArrayBuffer> => {
  console.log('[DEBUG] downloadInstagramVideo - Starting with URL:', downloadUrl.substring(0, 50) + '...');
  try {
    console.log('[DEBUG] downloadInstagramVideo - Downloading Instagram video from:', downloadUrl.substring(0, 50) + '...');

    console.log('[DEBUG] downloadInstagramVideo - Making direct download request...');
    const startTime = Date.now();

    // Direct fetch to Instagram CDN (original working approach)
    const response = await fetch(downloadUrl, {
      method: 'GET',
    });

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
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error,
      url: downloadUrl.substring(0, 50) + '...'
    };

    console.error('[DEBUG] downloadInstagramVideo - Error details:', JSON.stringify(errorDetails, null, 2));
    console.error('Error downloading Instagram video:', errorDetails);

    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Failed to download Instagram video. Please check your internet connection and try again.');
    }
  }
};
