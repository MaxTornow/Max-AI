exports.handler = async (event, context) => {
  try {
    // Extract the video URL from the path
    const path = event.path.replace('/api/video-proxy/', '');
    const videoUrl = decodeURIComponent(path);
    
    console.log('Proxying video URL:', videoUrl);
    
    // Fetch the video from the original URL
    const response = await fetch(videoUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch video:', response.status, response.statusText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Failed to fetch video: ${response.statusText}` })
      };
    }
    
    // Get the video data as an array buffer
    const videoBuffer = await response.arrayBuffer();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
        'Content-Length': response.headers.get('Content-Length'),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: Buffer.from(videoBuffer).toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Error in video proxy:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
