/**
 * Tests for Instagram video processing service
 * @module instagramService.test
 */

import { getInstagramVideoInfo, downloadInstagramVideo } from '../instagramService';

// Add proper TypeScript type for the API response
type ApiResponse = Record<string, any>;


/**
 * Test for getInstagramVideoInfo function
 * This test makes a real API call to FastSaver to check the actual response format
 */
const testGetInstagramVideoInfo = async (): Promise<ApiResponse | null> => {
  try {
    // Test with a real Instagram post URL
    const instagramUrl = 'https://www.instagram.com/p/DJ381YSAZVJ/';
    console.log(`Testing getInstagramVideoInfo with URL: ${instagramUrl}`);
    
    // Call the function
    const result = await getInstagramVideoInfo(instagramUrl);
    
    // Log the entire response for analysis
    console.log('API Response:', JSON.stringify(result, null, 2));
    
    // Check for expected properties
    console.log('Response has download_url:', !!result.download_url);
    if (result.download_url) {
      console.log('download_url value:', result.download_url);
    }
    
    // Log all properties in the response
    console.log('All properties in response:');
    Object.keys(result).forEach(key => {
      const value = result[key];
      console.log(`- ${key}: ${typeof value}`, value !== null && typeof value === 'object' ? '(object/array)' : `= ${value}`);
    });
    
    console.log('Test getInstagramVideoInfo: SUCCESS');
    return result as ApiResponse;
  } catch (error) {
    console.error('Test getInstagramVideoInfo FAILED:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return null;
  }
};

/**
 * Test for downloadInstagramVideo function
 * This test will only run if getInstagramVideoInfo succeeds and returns a download_url
 */
const testDownloadInstagramVideo = async (downloadUrl: string) => {
  try {
    console.log(`Testing downloadInstagramVideo with URL: ${downloadUrl}`);
    
    // Call the function
    const videoData = await downloadInstagramVideo(downloadUrl);
    
    // Check the response
    console.log('Video data received, size:', videoData.byteLength, 'bytes');
    console.log('Test downloadInstagramVideo: SUCCESS');
    return true;
  } catch (error) {
    console.error('Test downloadInstagramVideo FAILED:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return false;
  }
};

/**
 * Run all tests
 */
const runTests = async () => {
  console.log('=== STARTING INSTAGRAM SERVICE TESTS ===');
  
  try {
    // Test getInstagramVideoInfo
    const videoInfo = await testGetInstagramVideoInfo();
    
    // Test downloadInstagramVideo if the first test succeeded
    if (videoInfo && videoInfo.download_url) {
      await testDownloadInstagramVideo(videoInfo.download_url);
    } else {
      console.log('Skipping downloadInstagramVideo test due to missing download_url');
    }
    
    console.log('=== ALL TESTS COMPLETED ===');
  } catch (error) {
    console.error('=== TESTS FAILED ===');
  }
};

// Run the tests
runTests();
