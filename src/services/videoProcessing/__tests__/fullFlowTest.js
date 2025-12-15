/**
 * Full Flow Test for Instagram Video Processing
 * This script tests the entire video processing flow with detailed logging
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

// Step 1: Get Instagram video info
async function getInstagramVideoInfo(url) {
  console.log('\n=== STEP 1: GET INSTAGRAM VIDEO INFO ===');
  console.log(`URL: ${url}`);
  
  try {
    const apiUrl = `https://fastsaverapi.com/get-info?url=${encodeURIComponent(url)}&token=${apiToken}`;
    console.log(`API URL: ${apiUrl}`);
    
    console.log('Making API request...');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    console.log('Response headers:', response.headers);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Instagram video info: ${response.status} ${response.statusText}`);
    }
    
    console.log('Parsing response JSON...');
    const data = await response.json();
    
    console.log('Validating response data...');
    if (!data || !data.download_url) {
      throw new Error('Invalid response from FastSaver API: Missing download URL');
    }
    
    console.log('Video info retrieved successfully!');
    console.log(`Download URL: ${data.download_url.substring(0, 50)}...`);
    
    return data;
  } catch (error) {
    console.error('Error in getInstagramVideoInfo:', error);
    throw error;
  }
}

// Step 2: Download Instagram video
async function downloadInstagramVideo(downloadUrl) {
  console.log('\n=== STEP 2: DOWNLOAD INSTAGRAM VIDEO ===');
  console.log(`Download URL: ${downloadUrl.substring(0, 50)}...`);
  
  try {
    console.log('Starting download...');
    
    const startTime = Date.now();
    const response = await fetch(downloadUrl, {
      method: 'GET',
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      throw new Error(`Failed to download Instagram video: ${response.status} ${response.statusText}`);
    }
    
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
}

// Step 3: Mock upload to AssemblyAI (we'll just simulate this)
async function mockUploadToAssemblyAI(videoData) {
  console.log('\n=== STEP 3: UPLOAD TO ASSEMBLY AI (MOCK) ===');
  console.log(`Video data size: ${videoData.byteLength} bytes`);
  
  try {
    console.log('Simulating upload to AssemblyAI...');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUploadUrl = 'https://example.com/mock-upload-url';
    console.log(`Mock upload successful! Upload URL: ${mockUploadUrl}`);
    
    return mockUploadUrl;
  } catch (error) {
    console.error('Error in mockUploadToAssemblyAI:', error);
    throw error;
  }
}

// Step 4: Mock submit transcription request
async function mockSubmitTranscriptionRequest(uploadUrl) {
  console.log('\n=== STEP 4: SUBMIT TRANSCRIPTION REQUEST (MOCK) ===');
  console.log(`Upload URL: ${uploadUrl}`);
  
  try {
    console.log('Simulating transcription request submission...');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockTranscriptionId = 'mock-transcription-id-123456';
    console.log(`Mock transcription request submitted! ID: ${mockTranscriptionId}`);
    
    return mockTranscriptionId;
  } catch (error) {
    console.error('Error in mockSubmitTranscriptionRequest:', error);
    throw error;
  }
}

// Step 5: Mock poll for transcription completion
async function mockPollForTranscriptionCompletion(transcriptionId) {
  console.log('\n=== STEP 5: POLL FOR TRANSCRIPTION COMPLETION (MOCK) ===');
  console.log(`Transcription ID: ${transcriptionId}`);
  
  try {
    console.log('Simulating polling for transcription completion...');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const mockTranscription = {
      text: 'This is a mock transcription of the Instagram video. It would contain the actual speech from the video.',
      status: 'completed'
    };
    
    console.log('Mock transcription completed!');
    console.log(`Transcription text: "${mockTranscription.text.substring(0, 50)}..."`);
    
    return mockTranscription;
  } catch (error) {
    console.error('Error in mockPollForTranscriptionCompletion:', error);
    throw error;
  }
}

// Step 6: Mock generate scripts
async function mockGenerateScripts(transcriptionText) {
  console.log('\n=== STEP 6: GENERATE SCRIPTS (MOCK) ===');
  console.log(`Transcription text: "${transcriptionText.substring(0, 50)}..."`);
  
  try {
    console.log('Simulating script generation...');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const mockScripts = {
      script_1: { text: 'This is mock script 1 based on the transcription.' },
      script_2: { text: 'This is mock script 2 with a different approach.' },
      script_3: { text: 'This is mock script 3 with yet another variation.' }
    };
    
    console.log('Mock scripts generated!');
    console.log('Script 1:', mockScripts.script_1.text);
    console.log('Script 2:', mockScripts.script_2.text);
    console.log('Script 3:', mockScripts.script_3.text);
    
    return mockScripts;
  } catch (error) {
    console.error('Error in mockGenerateScripts:', error);
    throw error;
  }
}

// Main function to run the full flow
async function runFullFlow() {
  console.log('=== STARTING FULL FLOW TEST FOR INSTAGRAM VIDEO PROCESSING ===');
  console.log(`Instagram URL: ${instagramUrl}`);
  console.log('Time:', new Date().toISOString());
  
  try {
    // Step 1: Get Instagram video info
    const videoInfo = await getInstagramVideoInfo(instagramUrl);
    
    // Step 2: Download the video
    const videoData = await downloadInstagramVideo(videoInfo.download_url);
    
    // Step 3: Upload to AssemblyAI (mock)
    const uploadUrl = await mockUploadToAssemblyAI(videoData);
    
    // Step 4: Submit transcription request (mock)
    const transcriptionId = await mockSubmitTranscriptionRequest(uploadUrl);
    
    // Step 5: Poll for transcription completion (mock)
    const transcription = await mockPollForTranscriptionCompletion(transcriptionId);
    
    // Step 6: Generate scripts (mock)
    const scripts = await mockGenerateScripts(transcription.text);
    
    // Final result
    console.log('\n=== FULL FLOW TEST COMPLETED SUCCESSFULLY ===');
    console.log('Result:', {
      transcription: transcription.text,
      scripts: {
        script_1: scripts.script_1.text,
        script_2: scripts.script_2.text,
        script_3: scripts.script_3.text
      },
      originalVideoUrl: instagramUrl,
      platform: 'instagram'
    });
    
    return true;
  } catch (error) {
    console.error('\n=== FULL FLOW TEST FAILED ===');
    console.error('Error:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return false;
  }
}

// Run the full flow test
runFullFlow()
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
