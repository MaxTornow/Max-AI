/**
 * Simple test script for Instagram API
 * Run with: npx tsx src/services/videoProcessing/__tests__/testInstagramApi.ts
 */

// Mock the Vite environment variables
// This needs to be done before importing the service
declare global {
  namespace NodeJS {
    interface Global {
      import: any;
    }
  }
}

// @ts-ignore - Ignoring TypeScript errors for test mocking
if (!globalThis.import) {
  globalThis.import = { meta: { env: {} } };
}

// @ts-ignore
if (!import.meta) {
  import.meta = { env: {} };
}

// @ts-ignore
if (!import.meta.env) {
  import.meta.env = {};
}

// Set the API token from environment (no hardcoded fallback for security)
const apiToken = process.env.VITE_FASTSAVER_API_TOKEN;
if (!apiToken) {
  console.error('ERROR: VITE_FASTSAVER_API_TOKEN not set in environment');
  console.error('Please set it in your .env file before running this test');
  process.exit(1);
}
// @ts-ignore
import.meta.env.VITE_FASTSAVER_API_TOKEN = apiToken;

// Import the functions directly using relative path
import { getInstagramVideoInfo, downloadInstagramVideo } from '../instagramService';

/**
 * Test the Instagram API response format
 */
async function testInstagramApi() {
  console.log('=== TESTING INSTAGRAM API ===');
  
  try {
    // Test URL - using the same one from the error
    const instagramUrl = 'https://www.instagram.com/p/DJ381YSAZVJ/';
    console.log(`Testing with URL: ${instagramUrl}`);
    
    // Test getInstagramVideoInfo
    console.log('\n1. Testing getInstagramVideoInfo function:');
    const videoInfo = await getInstagramVideoInfo(instagramUrl);
    
    // Log the entire response for analysis
    console.log('\nAPI Response:');
    console.log(JSON.stringify(videoInfo, null, 2));
    
    // Check for expected properties
    console.log('\nResponse Properties:');
    console.log('- Has download_url:', !!videoInfo.download_url);
    
    // Log all properties in the response
    console.log('\nAll properties in response:');
    Object.keys(videoInfo).forEach(key => {
      const value = videoInfo[key];
      const valueDisplay = value !== null && typeof value === 'object' 
        ? '(object/array)' 
        : `= ${value}`;
      console.log(`- ${key}: ${typeof value} ${valueDisplay}`);
    });
    
    // Test downloadInstagramVideo if download_url exists
    if (videoInfo.download_url) {
      console.log('\n2. Testing downloadInstagramVideo function:');
      console.log(`Using download URL: ${videoInfo.download_url}`);
      
      const videoData = await downloadInstagramVideo(videoInfo.download_url);
      console.log(`Video data received, size: ${videoData.byteLength} bytes`);
    } else {
      console.log('\nSkipping downloadInstagramVideo test - no download_url available');
    }
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('\n=== TEST FAILED ===');
    console.error('Error:', error);
    
    // Try to extract more details from the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

// Run the test
testInstagramApi();
