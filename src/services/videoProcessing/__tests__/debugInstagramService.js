/**
 * Debug script for Instagram video processing
 * This script adds console logs to trace the execution flow and identify issues
 */

// Instagram URL to test
const instagramUrl = 'https://www.instagram.com/p/DJ381YSAZVJ/';
// API token from the code
const apiToken = '5NyVIfAQAfByOWLzZVZboVz6';

// Debug wrapper for fetch to log all network requests
const debugFetch = async (url, options = {}) => {
  console.log(`[DEBUG] Fetch request to: ${url.substring(0, 100)}...`);
  console.log(`[DEBUG] Fetch options:`, JSON.stringify(options, null, 2));
  
  try {
    const response = await fetch(url, options);
    
    console.log(`[DEBUG] Fetch response status: ${response.status} ${response.statusText}`);
    console.log(`[DEBUG] Fetch response headers:`, Object.fromEntries([...response.headers]));
    
    // Clone the response to avoid consuming it
    const clonedResponse = response.clone();
    
    try {
      // Try to parse as JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const jsonData = await clonedResponse.json();
        console.log(`[DEBUG] Response JSON data:`, JSON.stringify(jsonData, null, 2));
      }
    } catch (e) {
      console.log(`[DEBUG] Response is not JSON or already consumed`);
    }
    
    return response;
  } catch (error) {
    console.error(`[DEBUG] Fetch error:`, error);
    throw error;
  }
};

// Debug version of getInstagramVideoInfo
const debugGetInstagramVideoInfo = async (url) => {
  console.log('\n=== DEBUG: getInstagramVideoInfo ===');
  console.log(`URL: ${url}`);
  
  try {
    const apiUrl = `https://fastsaverapi.com/get-info?url=${encodeURIComponent(url)}&token=${apiToken}`;
    console.log(`API URL: ${apiUrl}`);
    
    // Use debug fetch
    const response = await debugFetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Instagram video info: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate the response data
    console.log('Validating response data:');
    console.log('- Has data:', !!data);
    console.log('- Has download_url:', data && !!data.download_url);
    
    if (!data || !data.download_url) {
      throw new Error('Invalid response from FastSaver API: Missing download URL');
    }
    
    console.log('Video info retrieved successfully!');
    if (data.download_url) {
      console.log(`Download URL: ${data.download_url.substring(0, 50)}...`);
    }
    
    return data;
  } catch (error) {
    console.error('Error in getInstagramVideoInfo:', error);
    throw error;
  }
};

// Debug version of downloadInstagramVideo
const debugDownloadInstagramVideo = async (downloadUrl) => {
  console.log('\n=== DEBUG: downloadInstagramVideo ===');
  console.log(`Download URL: ${downloadUrl.substring(0, 50)}...`);
  
  try {
    console.log('Starting download...');
    
    const startTime = Date.now();
    // Use debug fetch
    const response = await debugFetch(downloadUrl, {
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download Instagram video: ${response.status} ${response.statusText}`);
    }
    
    console.log('Getting response as ArrayBuffer...');
    const videoData = await response.arrayBuffer();
    const downloadTime = Date.now() - startTime;
    
    console.log('Download successful!');
    console.log(`Video size: ${(videoData.byteLength / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Download time: ${downloadTime / 1000} seconds`);
    
    return videoData;
  } catch (error) {
    console.error('Error in downloadInstagramVideo:', error);
    throw error;
  }
};

// Main function to run the debug test
async function runDebugTest() {
  console.log('=== STARTING INSTAGRAM SERVICE DEBUG TEST ===');
  console.log(`Instagram URL: ${instagramUrl}`);
  console.log('Time:', new Date().toISOString());
  
  try {
    // Step 1: Get Instagram video info with detailed logging
    console.log('\n--- STEP 1: Get Instagram Video Info ---');
    const videoInfo = await debugGetInstagramVideoInfo(instagramUrl);
    
    // Step 2: Download the video with detailed logging
    console.log('\n--- STEP 2: Download Instagram Video ---');
    if (videoInfo && videoInfo.download_url) {
      await debugDownloadInstagramVideo(videoInfo.download_url);
    } else {
      console.log('Skipping download step - no download_url available');
    }
    
    console.log('\n=== DEBUG TEST COMPLETED SUCCESSFULLY ===');
    return true;
  } catch (error) {
    console.error('\n=== DEBUG TEST FAILED ===');
    console.error('Error:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return false;
  }
}

// Run the debug test
runDebugTest()
  .then(success => {
    if (success) {
      console.log('\nTest completed successfully!');
    } else {
      console.error('\nTest failed!');
    }
  })
  .catch(error => {
    console.error('\nUnexpected error in test runner:', error);
  });
