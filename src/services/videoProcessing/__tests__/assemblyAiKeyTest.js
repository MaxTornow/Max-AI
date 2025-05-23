/**
 * Test script to verify AssemblyAI API key is working
 * This script makes a simple API call to check if the key is valid
 */

// Get the API key from environment or use the fallback
const ASSEMBLY_AI_API_KEY = process.env.VITE_ASSEMBLY_AI_API_KEY || '8430d0e7333846f296be6a868d3adb2a';

console.log('=== TESTING ASSEMBLY AI API KEY ===');
console.log(`Using API key: ${ASSEMBLY_AI_API_KEY.substring(0, 5)}...${ASSEMBLY_AI_API_KEY.substring(ASSEMBLY_AI_API_KEY.length - 5)}`);

/**
 * Test the API key by making a simple request to the AssemblyAI API
 */
async function testApiKey() {
  try {
    console.log('Making request to AssemblyAI API...');
    
    // Make a simple request to the /v2/transcript endpoint
    // This endpoint requires authentication but doesn't need any data
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'GET',
      headers: {
        'Authorization': ASSEMBLY_AI_API_KEY,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    console.log('Response headers:', JSON.stringify(Object.fromEntries([...response.headers]), null, 2));
    
    if (response.status === 401) {
      console.error('\n=== API KEY IS INVALID ===');
      console.error('The API key was rejected by AssemblyAI. Please check your key and try again.');
      return false;
    }
    
    if (!response.ok) {
      console.warn('\n=== API RETURNED AN ERROR, BUT KEY MAY BE VALID ===');
      console.warn(`The API returned status ${response.status}, but this might be due to the endpoint used, not the key itself.`);
      
      // Even with a 404 or other error, if we didn't get a 401, the key is probably valid
      if (response.status !== 401) {
        console.log('Since we did not get a 401 Unauthorized, the API key is likely valid.');
        return true;
      }
      
      return false;
    }
    
    const data = await response.json();
    console.log('\nAPI Response:', JSON.stringify(data, null, 2));
    
    console.log('\n=== API KEY IS VALID ===');
    return true;
  } catch (error) {
    console.error('\n=== TEST FAILED ===');
    console.error('Error:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return false;
  }
}

// Run the test
testApiKey()
  .then(isValid => {
    if (isValid) {
      console.log('\n=== TEST COMPLETED SUCCESSFULLY: API KEY IS VALID ===');
    } else {
      console.error('\n=== TEST FAILED: API KEY IS INVALID ===');
    }
  })
  .catch(error => {
    console.error('\n=== UNEXPECTED ERROR IN TEST ===');
    console.error('Error:', error);
  });
