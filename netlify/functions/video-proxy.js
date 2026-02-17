exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  try {
    // Get the video URL from query parameters (not path)
    const params = event.queryStringParameters || {};
    let videoUrl = params.url;

    if (!videoUrl) {
      // Fallback: try to extract from path for backwards compatibility
      const path = event.path.replace('/api/video-proxy/', '').replace('/.netlify/functions/video-proxy/', '');
      if (path && path.startsWith('http')) {
        videoUrl = decodeURIComponent(path);
      }
    }

    if (!videoUrl) {
      console.error('No video URL provided');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing url parameter' })
      };
    }

    console.log('Proxying video URL:', videoUrl.substring(0, 100) + '...');

    // Set referer based on the video source domain
    const isTikWM = videoUrl.includes('tikwm.com');
    const isTikTok = videoUrl.includes('tiktok') || videoUrl.includes('tiktokv.com') || videoUrl.includes('tiktokcdn.com');
    const referer = isTikWM ? 'https://tikwm.com/' : isTikTok ? 'https://www.tiktok.com/' : 'https://www.instagram.com/';

    // Fetch the video from the original URL
    const response = await fetch(videoUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'identity', // Don't ask for compressed response
        'Referer': referer
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch video:', response.status, response.statusText);
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: `Failed to fetch video: ${response.status} ${response.statusText}` })
      };
    }

    // Get the video data as an array buffer
    const videoBuffer = await response.arrayBuffer();
    const videoSize = videoBuffer.byteLength;

    console.log('Video fetched successfully, size:', (videoSize / 1024 / 1024).toFixed(2), 'MB');

    // Netlify Functions have a 6MB response limit
    // Base64 encoding increases size by ~33%, so max raw size is ~4.5MB
    const MAX_SIZE = 4.5 * 1024 * 1024;

    if (videoSize > MAX_SIZE) {
      console.error('Video too large for proxy:', (videoSize / 1024 / 1024).toFixed(2), 'MB');
      return {
        statusCode: 413,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Video too large for proxy',
          size: videoSize,
          maxSize: MAX_SIZE,
          directUrl: videoUrl
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
        'Content-Length': String(videoSize),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600'
      },
      body: Buffer.from(videoBuffer).toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error in video proxy:', error.message || error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
};
