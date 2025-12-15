/**
 * Full integration test for AssemblyAI API
 * This script tests all AssemblyAI API functions:
 * 1. Upload a test audio file
 * 2. Submit a transcription request
 * 3. Poll for transcription completion
 */

// Get the API key from environment (no fallback for security)
const ASSEMBLY_AI_API_KEY = process.env.VITE_ASSEMBLY_AI_API_KEY;

if (!ASSEMBLY_AI_API_KEY) {
  console.error('ERROR: VITE_ASSEMBLY_AI_API_KEY not set in environment');
  console.error('Please set it in your .env file before running this test');
  process.exit(1);
}

console.log('=== TESTING ASSEMBLY AI FULL INTEGRATION ===');
console.log(`Using API key: ${ASSEMBLY_AI_API_KEY.substring(0, 5)}...${ASSEMBLY_AI_API_KEY.substring(ASSEMBLY_AI_API_KEY.length - 5)}`);

// Create a small test audio buffer (1 second of silence)
// This is a minimal WAV file with 1 second of silence
const createTestAudioBuffer = () => {
  // WAV header for 1 second of silence (44.1kHz, 16-bit, mono)
  const header = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x24, 0x00, 0x00, 0x00, // Chunk size (36 + data size)
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    0x66, 0x6d, 0x74, 0x20, // "fmt "
    0x10, 0x00, 0x00, 0x00, // Subchunk1 size (16 bytes)
    0x01, 0x00,             // Audio format (1 = PCM)
    0x01, 0x00,             // Number of channels (1 = mono)
    0x44, 0xac, 0x00, 0x00, // Sample rate (44100 Hz)
    0x88, 0x58, 0x01, 0x00, // Byte rate (sample rate * channels * bits per sample / 8)
    0x02, 0x00,             // Block align (channels * bits per sample / 8)
    0x10, 0x00,             // Bits per sample (16)
    0x64, 0x61, 0x74, 0x61, // "data"
    0x00, 0x00, 0x00, 0x00  // Subchunk2 size (0 bytes of audio data)
  ]);
  
  // Create a small amount of silent audio data (1 second)
  const sampleRate = 44100;
  const numSamples = sampleRate; // 1 second
  const audioData = new Int16Array(numSamples);
  
  // Fill with silence (zeros)
  for (let i = 0; i < numSamples; i++) {
    audioData[i] = 0;
  }
  
  // Convert to bytes
  const audioBytes = new Uint8Array(audioData.buffer);
  
  // Update the data size in the header
  const dataSize = audioBytes.byteLength;
  const view = new DataView(header.buffer);
  view.setUint32(4, 36 + dataSize, true); // Update RIFF chunk size
  view.setUint32(40, dataSize, true);     // Update data chunk size
  
  // Combine header and audio data
  const combinedBuffer = new Uint8Array(header.byteLength + audioBytes.byteLength);
  combinedBuffer.set(header);
  combinedBuffer.set(audioBytes, header.byteLength);
  
  return combinedBuffer.buffer;
};

/**
 * Test uploading an audio file to AssemblyAI
 */
async function testUploadToAssemblyAI() {
  try {
    console.log('\n--- Step 1: Upload Audio File ---');
    console.log('Creating test audio buffer...');
    
    // Create a test audio buffer
    const audioBuffer = createTestAudioBuffer();
    console.log(`Test audio buffer created, size: ${audioBuffer.byteLength} bytes`);
    
    console.log('Uploading to AssemblyAI...');
    const startTime = Date.now();
    
    // Make the upload request
    const response = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLY_AI_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: audioBuffer,
    });
    
    const uploadTime = Date.now() - startTime;
    console.log(`Upload request completed in ${uploadTime}ms`);
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('API key is invalid. Authentication failed.');
        return null;
      }
      
      const errorText = await response.text().catch(() => 'Could not read error response');
      console.error(`Upload failed with status ${response.status}: ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log('Upload successful!');
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (!data.upload_url) {
      console.error('Upload succeeded but no upload_url was returned');
      return null;
    }
    
    console.log(`Upload URL: ${data.upload_url}`);
    return data.upload_url;
  } catch (error) {
    console.error('Error uploading to AssemblyAI:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

/**
 * Test submitting a transcription request
 */
async function testSubmitTranscriptionRequest(uploadUrl) {
  try {
    console.log('\n--- Step 2: Submit Transcription Request ---');
    console.log(`Using upload URL: ${uploadUrl}`);
    
    console.log('Submitting transcription request...');
    const startTime = Date.now();
    
    // Make the transcription request
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLY_AI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio_url: uploadUrl }),
    });
    
    const requestTime = Date.now() - startTime;
    console.log(`Request completed in ${requestTime}ms`);
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      console.error(`Transcription request failed with status ${response.status}: ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log('Transcription request successful!');
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (!data.id) {
      console.error('Transcription request succeeded but no id was returned');
      return null;
    }
    
    console.log(`Transcription ID: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('Error submitting transcription request:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

/**
 * Test polling for transcription completion
 */
async function testPollForTranscriptionCompletion(transcriptionId) {
  try {
    console.log('\n--- Step 3: Poll for Transcription Completion ---');
    console.log(`Using transcription ID: ${transcriptionId}`);
    
    // Poll for completion (max 10 attempts, 2 second interval)
    const maxAttempts = 10;
    const interval = 2000; // 2 seconds
    let attempts = 0;
    
    const poll = async () => {
      attempts++;
      console.log(`Polling attempt ${attempts}/${maxAttempts}...`);
      
      const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptionId}`, {
        method: 'GET',
        headers: {
          'Authorization': ASSEMBLY_AI_API_KEY,
        },
      });
      
      console.log(`Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error(`Polling failed with status ${response.status}: ${errorText}`);
        return null;
      }
      
      const data = await response.json();
      console.log('Polling response:', JSON.stringify(data, null, 2));
      
      if (data.status === 'completed') {
        console.log('Transcription completed!');
        return data;
      } else if (data.status === 'error') {
        console.error('Transcription failed with error:', data.error);
        return null;
      } else if (attempts >= maxAttempts) {
        console.error('Polling timed out after maximum attempts');
        return null;
      }
      
      console.log(`Transcription status: ${data.status}. Waiting ${interval/1000} seconds before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, interval));
      return poll();
    };
    
    return await poll();
  } catch (error) {
    console.error('Error polling for transcription completion:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}

/**
 * Run the full test
 */
async function runFullTest() {
  try {
    // Step 1: Upload audio file
    const uploadUrl = await testUploadToAssemblyAI();
    if (!uploadUrl) {
      console.error('\n=== TEST FAILED AT STEP 1: UPLOAD ===');
      return false;
    }
    
    // Step 2: Submit transcription request
    const transcriptionId = await testSubmitTranscriptionRequest(uploadUrl);
    if (!transcriptionId) {
      console.error('\n=== TEST FAILED AT STEP 2: TRANSCRIPTION REQUEST ===');
      return false;
    }
    
    // Step 3: Poll for transcription completion
    const transcription = await testPollForTranscriptionCompletion(transcriptionId);
    if (!transcription) {
      console.error('\n=== TEST FAILED AT STEP 3: POLLING ===');
      return false;
    }
    
    console.log('\n=== ALL TESTS PASSED ===');
    return true;
  } catch (error) {
    console.error('\n=== UNEXPECTED ERROR IN TEST ===');
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return false;
  }
}

// Run the full test
runFullTest()
  .then(success => {
    if (success) {
      console.log('\n=== FULL ASSEMBLY AI INTEGRATION TEST COMPLETED SUCCESSFULLY ===');
    } else {
      console.error('\n=== FULL ASSEMBLY AI INTEGRATION TEST FAILED ===');
    }
  })
  .catch(error => {
    console.error('\n=== UNEXPECTED ERROR IN TEST RUNNER ===');
    console.error('Error:', error);
  });
