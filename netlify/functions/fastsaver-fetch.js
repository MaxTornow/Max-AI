exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept'
      },
      body: ''
    };
  }

  try {
    // Get the video URL from query parameters
    const params = event.queryStringParameters || {};
    const videoUrl = params.url;

    if (!videoUrl) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing url parameter' })
      };
    }

    // Get API key from environment variable
    const apiKey = process.env.FASTSAVER_API_TOKEN;

    if (!apiKey) {
      console.error('FASTSAVER_API_TOKEN not configured');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'API configuration error' })
      };
    }

    console.log('Fetching video info for:', videoUrl);

    // Call FastSaver API
    const apiUrl = `https://api.fastsaver.io/v1/fetch?url=${encodeURIComponent(videoUrl)}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Api-Key': apiKey
      }
    });

    console.log('FastSaver API response status:', response.status);

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Error in fastsaver-fetch:', error);
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
