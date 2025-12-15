/**
 * Direct API test for FastSaver Instagram API
 * This script makes a direct call to the FastSaver API to check the response format
 */

// Instagram URL to test
const instagramUrl = 'https://www.instagram.com/p/DJ381YSAZVJ/';
// API token from environment (no fallback for security)
const apiToken = process.env.VITE_FASTSAVER_API_TOKEN;

if (!apiToken) {
  console.error('ERROR: VITE_FASTSAVER_API_TOKEN not set in environment');
  console.error('Please set it in your .env file before running this test');
  process.exit(1);
}

// API URL
const apiUrl = `https://fastsaverapi.com/get-info?url=${encodeURIComponent(instagramUrl)}&token=${apiToken}`;

console.log('=== TESTING FASTSAVER API DIRECTLY ===');
console.log(`Testing with URL: ${instagramUrl}`);
console.log(`API URL: ${apiUrl}`);

// Make the API call
fetch(apiUrl, {
  method: 'GET',
  headers: {
    'Accept': 'application/json',
  },
})
.then(response => {
  console.log(`Response status: ${response.status} ${response.statusText}`);
  console.log('Response headers:', response.headers);
  return response.json();
})
.then(data => {
  console.log('\nAPI Response:');
  console.log(JSON.stringify(data, null, 2));
  
  // Check for download_url
  console.log('\nResponse Properties:');
  console.log('- Has download_url:', !!data.download_url);
  
  // Log all properties in the response
  console.log('\nAll properties in response:');
  Object.keys(data).forEach(key => {
    const value = data[key];
    const valueDisplay = value !== null && typeof value === 'object' 
      ? '(object/array)' 
      : `= ${value}`;
    console.log(`- ${key}: ${typeof value} ${valueDisplay}`);
  });
  
  console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
})
.catch(error => {
  console.error('\n=== TEST FAILED ===');
  console.error('Error:', error);
  
  // Try to extract more details from the error
  if (error instanceof Error) {
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
});
