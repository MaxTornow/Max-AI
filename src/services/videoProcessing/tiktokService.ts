/**
 * Service for handling TikTok video processing
 * @module tiktokService
 */

import { InstagramVideoInfo } from './types';

interface TikWMResponse {
  code: number;
  msg: string;
  data: {
    id: string;
    title: string;
    play: string;       // standard quality, no watermark
    hdplay: string;     // HD quality, no watermark
    wmplay: string;     // watermarked
    cover: string;
    duration: number;
    width: number;
    height: number;
  };
}

/**
 * Fetches information about a TikTok video using tikwm.com API.
 * Returns a tikwm.com CDN URL that is publicly accessible (no IP locking).
 * @param {string} url - The TikTok video URL
 * @returns {Promise<InstagramVideoInfo>} Video information including download URL
 */
export const getTikTokVideoInfo = async (url: string): Promise<InstagramVideoInfo> => {
  console.log('[DEBUG] getTikTokVideoInfo - Starting with URL:', url);

  try {
    const apiUrl = `/api/tikwm?url=${encodeURIComponent(url)}`;
    console.log('[DEBUG] getTikTokVideoInfo - API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    console.log('[DEBUG] getTikTokVideoInfo - Response status:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`Failed to fetch TikTok video info: ${response.status} ${response.statusText}`);
    }

    const data: TikWMResponse = await response.json();
    console.log('[DEBUG] getTikTokVideoInfo - Response data:', JSON.stringify(data, null, 2));

    if (!data || data.code !== 0 || !data.data?.play) {
      throw new Error(`tikwm.com API error: ${data?.msg || 'Missing video URL'}`);
    }

    // Prefer hdplay (higher quality) for better transcription, fall back to play
    const videoUrl = data.data.hdplay || data.data.play;

    return {
      error: false,
      hosting: 'tiktok',
      shortcode: data.data.id,
      download_url: videoUrl,
      thumbnail: data.data.cover,
      caption: data.data.title || '',
      duration: data.data.duration,
      width: data.data.width,
      height: data.data.height,
    };
  } catch (error) {
    console.error('[DEBUG] getTikTokVideoInfo - Error:', error);
    throw new Error('Failed to fetch TikTok video info. Please check the URL and try again.');
  }
};
