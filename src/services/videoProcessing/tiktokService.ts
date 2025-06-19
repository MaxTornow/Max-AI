/**
 * Service for handling TikTok video processing
 * @module tiktokService
 */

import { InstagramVideoInfo } from './types';

// TikTok API token from environment variables
const TIKTOK_API_TOKEN = import.meta.env.VITE_TIKTOK_API_TOKEN || 'default_token';

/**
 * Fetches information about a TikTok video
 * @param {string} url - The TikTok video URL
 * @returns {Promise<InstagramVideoInfo>} Video information including download URL
 */
export const getTikTokVideoInfo = async (url: string): Promise<InstagramVideoInfo> => {
  try {
    console.log('Fetching TikTok video info for:', url);
    
    // TikTok videos can also be fetched using the FastSaver API
    const apiUrl = `/api/fastsaver/get-info?url=${encodeURIComponent(url)}&token=${TIKTOK_API_TOKEN}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch TikTok video info: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Validate the response data
    if (!data || !data.download_url) {
      throw new Error('Invalid response from FastSaver API: Missing download URL');
    }
    
    return data as InstagramVideoInfo;
  } catch (error) {
    console.error('Error fetching TikTok video info:', error);
    throw new Error('Failed to fetch TikTok video info. Please check the URL and try again.');
  }
};

/**
 * Downloads a TikTok video from the provided URL
 * @param {string} downloadUrl - The URL to download the video from
 * @returns {Promise<ArrayBuffer>} The video data as an ArrayBuffer
 */
export const downloadTikTokVideo = async (downloadUrl: string): Promise<ArrayBuffer> => {
  try {
    console.log('Downloading TikTok video from:', downloadUrl);
    
    const response = await fetch(downloadUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to download TikTok video: ${response.status} ${response.statusText}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('Error downloading TikTok video:', error);
    throw new Error('Failed to download TikTok video. Please check your internet connection and try again.');
  }
};
