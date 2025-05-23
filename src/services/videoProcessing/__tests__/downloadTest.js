/**
 * Test script for downloading Instagram video
 * This script tests the direct download of an Instagram video using the URL from the API
 */

// The download URL from our previous API test
const downloadUrl = "https://instagram.fsgn20-1.fna.fbcdn.net/o1/v/t16/f2/m86/AQMyST6La3pWMcOMVGhktsRaJ97OjiL7jB0dd7JsKJXN42ezsvZO6ENjCoOf3UgPA4v4mU_ZxOxI8x1RoGLh18AUkVWhEfuC14KUhcI.mp4?stp=dst-mp4&efg=eyJxZV9ncm91cHMiOiJbXCJpZ193ZWJfZGVsaXZlcnlfdnRzX290ZlwiXSIsInZlbmNvZGVfdGFnIjoidnRzX3ZvZF91cmxnZW4uY2xpcHMuYzIuNzIwLmJhc2VsaW5lIn0&_nc_cat=100&vs=688711243762404_1318983873&_nc_vs=HBksFQIYUmlnX3hwdl9yZWVsc19wZXJtYW5lbnRfc3JfcHJvZC84RDREQjAyMjI0NTZEMUIzMDdFNzM3ODI5NDk1OURBN192aWRlb19kYXNoaW5pdC5tcDQVAALIAQAVAhg6cGFzc3Rocm91Z2hfZXZlcnN0b3JlL0dKTVVyeDJjSFBpUW9uOERBTXJWTERrSmtwTXpicV9FQUFBRhUCAsgBACgAGAAbABUAACaSt4fb%2BZe6PxUCKAJDMywXQEbEOVgQYk4YEmRhc2hfYmFzZWxpbmVfMV92MREAdf4HZeadAQA%3D&ccb=9-4&oh=00_AfKfWi_8rmQN5QMT9sSY4GkELutPPx6UtpW5JJr4EdSV9w&oe=682F403E&_nc_sid=10d13b";

console.log('=== TESTING INSTAGRAM VIDEO DOWNLOAD ===');
console.log(`Download URL: ${downloadUrl.substring(0, 50)}...`);

/**
 * Function to download the video
 */
async function downloadVideo() {
  try {
    console.log('Starting download...');
    
    // Make the fetch request
    const startTime = Date.now();
    const response = await fetch(downloadUrl, {
      method: 'GET',
    });
    
    // Check response status
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }
    
    // Get the video data as ArrayBuffer
    const videoData = await response.arrayBuffer();
    const downloadTime = Date.now() - startTime;
    
    // Log success
    console.log(`Download successful!`);
    console.log(`Video size: ${(videoData.byteLength / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Download time: ${downloadTime / 1000} seconds`);
    
    // Check if the video data looks valid
    console.log(`Video data type: ${videoData.constructor.name}`);
    console.log(`Video data length: ${videoData.byteLength} bytes`);
    
    return true;
  } catch (error) {
    console.error('Download failed:', error);
    
    // Try to extract more details from the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return false;
  }
}

// Run the test
downloadVideo()
  .then(success => {
    if (success) {
      console.log('\n=== DOWNLOAD TEST COMPLETED SUCCESSFULLY ===');
    } else {
      console.error('\n=== DOWNLOAD TEST FAILED ===');
    }
  })
  .catch(error => {
    console.error('\n=== UNEXPECTED ERROR IN TEST ===');
    console.error('Error:', error);
  });
