/**
 * Service for generating video scripts using Claude AI
 * @module scriptGenerationService
 */

import { ScriptGenerationResponse, StoryDetails } from './types';
import { API_KEYS, CLAUDE_CONFIG } from './config';

/**
 * Generates video scripts using Claude AI based on transcription and story details
 * @param {string} transcription - The video transcription
 * @param {StoryDetails} storyDetails - Details about the story, audience, etc.
 * @param {string} systemPrompt - Optional additional system prompt
 * @param {string} apiKey - Optional API key (defaults to environment variable)
 * @returns {Promise<ScriptGenerationResponse>} Generated scripts
 */
export const generateScripts = async (
  transcription: string,
  storyDetails: StoryDetails,
  systemPrompt?: string,
  apiKey?: string
): Promise<ScriptGenerationResponse> => {
  try {
    console.log('Generating scripts for transcription:', transcription.substring(0, 50) + '...');
    console.log('Story details:', storyDetails);
    
    // Use provided API key or default to environment variable
    const claudeApiKey = apiKey || API_KEYS.CLAUDE;

    // Validate API key is configured
    if (!claudeApiKey) {
      console.error('[DEBUG] Claude API key not configured');
      throw new Error('Claude API key not configured. Set VITE_CLAUDE_API_KEY in .env');
    }

    // Debug logging for API key (mask most of it for security)
    const maskedKey = claudeApiKey.substring(0, 10) + '...' + claudeApiKey.substring(claudeApiKey.length - 5);
    console.log('[DEBUG] Using Claude API key:', maskedKey);
    console.log('[DEBUG] Using model:', CLAUDE_CONFIG.MODEL);
    
    const prompt = `## Role:
You are a master content marketer specializing in video script creation. Your expertise lies in adapting existing content while maintaining its original structure and authenticity.

## Task:
Create three video scripts based on the provided transcription, adapting the content for the specified niche and target audience while preserving the original transcript's structure, flow, and elements exactly as they appear.

## Context:
**Source Material:**

Transcription: ${transcription} 


**Adaptation Parameters:**
- **Niche:** ${storyDetails.niche}
- **Target Audience:** ${storyDetails.targetAudience}
- **Pain Points:** ${storyDetails.painPoints}
- **Communication Style:** ${storyDetails.communicationStyle}
- **Hero Story:** ${storyDetails.heroStory || ''}
- **Additional Guidelines:** ${systemPrompt || ''}

## Specifics:

### Critical Constraints:
- **Mirror the original transcript's structure and elements exactly**
- If the original has no CTA, don't add one
- If the original doesn't mention specific topics, don't introduce them
- Maintain the same flow, pacing, and natural progression as the original
- Keep the same type of opening, middle, and ending as the transcript
- Only adapt language, examples, and references to fit the target audience and niche
- Do not add elements that weren't present in the original transcript

### Hook Requirements (First 3 Seconds):
- Mirror the original transcript's opening approach
- Keep clear, short (3 seconds max) and engaging
- **Visual Hook Options:** Camera action, movement, facial expression, holding objects
- **Headline Hook:** Minimal words, include 1 "power word" if original style allows ("secret", "counterintuitive", "weird", "brainwashing")

### Content Structure Guidelines:
- "Trim the fat" - Remove boring, repetitive, or unnecessary content while maintaining core message
- No repetition
- Match original's directness level
- Preserve original's stakes and curiosity elements
- Maintain natural flow and progression from source

### Payoff & Resolution:
- Mirror how original transcript resolves main points
- Maintain same conclusion and ending style
- Only include CTAs or follow-ups if they exist in original transcript

### Share-ability Standards:
Adapt original's tone to be:
- Extremely valuable, OR
- Very relatable, OR  
- Very funny
(Match the original's approach)

### Ending Requirements:
- Keep original ending style (abrupt vs. gradual)
- Only include CTAs if original has them
- Maintain same closing tone and energy

## Output Format:
Provide the scripts in the following JSON format:
\`\`\`json
{
  "script_1": {
    "title": "Title for Script 1",
    "text": "Full script text here..."
  },
  "script_2": {
    "title": "Title for Script 2",
    "text": "Full script text here..."
  },
  "script_3": {
    "title": "Title for Script 3",
    "text": "Full script text here..."
  }
}
\`\`\``;

    // Create controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for Claude API
    
    try {
      console.log('[DEBUG] Making request to Claude API via proxy');
      
      // Using proxy to avoid CORS issues
      const response = await fetch('/api/claude/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: CLAUDE_CONFIG.MODEL,
          max_tokens: CLAUDE_CONFIG.MAX_TOKENS,
          temperature: CLAUDE_CONFIG.TEMPERATURE,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
        signal: controller.signal
      });
      
      // Clear the timeout since the request completed
      clearTimeout(timeoutId);

      console.log('[DEBUG] Claude API response status:', response.status, response.statusText);
      
      // Capture response headers for diagnostics
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log('[DEBUG] Claude API response headers:', responseHeaders);
      
      // Check for specific HTTP status codes that indicate rate limiting or other issues
      if (response.status === 429) {
        console.error('[DEBUG] API RATE LIMIT EXCEEDED - Claude API is rate limiting requests');
        
        // Try to get retry-after header
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) {
          console.log(`[DEBUG] Retry-After header suggests waiting ${retryAfter} seconds`);
        }
        
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error('[DEBUG] Rate limit error details:', errorText);
        throw new Error(`RATE_LIMIT: Claude API rate limit exceeded. ${errorText}`);
      } else if (response.status === 401 || response.status === 403) {
        console.error('[DEBUG] AUTHENTICATION ERROR - Claude API rejected the API key');
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error('[DEBUG] Authentication error details:', errorText);
        throw new Error(`AUTH_ERROR: Invalid Claude API key. ${errorText}`);
      } else if (response.status >= 500) {
        console.error(`[DEBUG] SERVER ERROR - Claude API returned a ${response.status} error`);
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error('[DEBUG] Server error details:', errorText);
        throw new Error(`SERVER_ERROR: Claude API server error (${response.status}). ${errorText}`);
      } else if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        console.error(`[DEBUG] HTTP ERROR - Claude API returned a ${response.status} error: ${errorText}`);
        throw new Error(`HTTP_ERROR: Failed to generate scripts (${response.status}). ${errorText}`);
      }

      const data = await response.json();
      
      // Parse the response content as JSON
      const contentText = data.content[0].text;
      
      // Clean up markdown formatting if present
      let jsonText = contentText;
      
      console.log('[DEBUG] Raw response from Claude:', jsonText.substring(0, 100) + '...');
      
      // Check if the response is wrapped in a markdown code block
      if (jsonText.includes('```json') || jsonText.includes('```')) {
        console.log('[DEBUG] Detected markdown code block in Claude response');
        // Extract JSON from markdown code blocks
        const jsonMatch = jsonText.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          jsonText = jsonMatch[1];
          console.log('[DEBUG] Extracted JSON from markdown code block');
        } else {
          console.warn('[DEBUG] Markdown code block detected but couldn\'t extract JSON content');
        }
      }
      
      // Additional cleanup for any remaining markdown or text
      // Remove any explanatory text before or after the JSON
      if (jsonText.includes('{') && jsonText.includes('}')) {
        const startIndex = jsonText.indexOf('{');
        const endIndex = jsonText.lastIndexOf('}') + 1;
        if (startIndex >= 0 && endIndex > startIndex) {
          const potentialJson = jsonText.substring(startIndex, endIndex);
          try {
            // Verify this is valid JSON
            JSON.parse(potentialJson);
            jsonText = potentialJson;
            console.log('[DEBUG] Extracted JSON object from mixed content');
          } catch (e) {
            // If parsing fails, we'll continue with the previous jsonText
            console.warn('[DEBUG] Failed to extract clean JSON object, continuing with previous cleaning');
          }
        }
      }
      
      console.log('[DEBUG] Cleaned JSON text (first 100 chars):', jsonText.substring(0, 100) + '...');
      
      try {
        return JSON.parse(jsonText) as ScriptGenerationResponse;
      } catch (jsonError) {
        console.error('[DEBUG] Error parsing cleaned JSON:', jsonError);
        console.error('[DEBUG] Attempted to parse text:', jsonText.substring(0, 200) + '...');
        throw new Error('PARSE_ERROR: Failed to parse Claude response as JSON. The response may not be in the expected format.');
      }
    } catch (fetchError: any) {
      // Clear the timeout if it's still active
      clearTimeout(timeoutId);
      
      // Analyze the fetch error to provide more specific diagnostics
      if (fetchError.name === 'AbortError') {
        console.error('[DEBUG] REQUEST TIMEOUT - The request to Claude API took too long to complete');
        throw new Error('TIMEOUT: Claude API request timed out after 120 seconds');
      } else if (fetchError.message?.includes('NetworkError') || fetchError.message?.includes('network')) {
        console.error('[DEBUG] NETWORK ERROR - There was a problem with the network connection to Claude API');
        throw new Error(`NETWORK_ERROR: Network error during Claude API request: ${fetchError.message}`);
      } else if (fetchError.message?.includes('Failed to fetch')) {
        console.error('[DEBUG] FETCH ERROR - The fetch operation to Claude API failed');
        // Try to determine if this is due to CORS, network change, etc.
        if (fetchError.stack?.includes('TypeError: Failed to fetch')) {
          console.error('[DEBUG] This appears to be a general fetch failure, possibly due to network changes or CORS issues');
          throw new Error(`FETCH_ERROR: Failed to connect to Claude API: ${fetchError.message}`);
        }
      }
      
      // If we haven't thrown a more specific error, rethrow the original
      throw fetchError;
    }
  } catch (error: any) {
    console.error('[DEBUG] Error generating scripts:', error);
    
    // Improved error logging with more details
    const errorDetails = {
      message: error.message || 'Unknown error',
      name: error.name || 'Unknown',
      stack: error.stack,
      type: error.message?.startsWith('RATE_LIMIT:') ? 'RATE_LIMIT' :
            error.message?.startsWith('AUTH_ERROR:') ? 'AUTH_ERROR' :
            error.message?.startsWith('SERVER_ERROR:') ? 'SERVER_ERROR' :
            error.message?.startsWith('HTTP_ERROR:') ? 'HTTP_ERROR' :
            error.message?.startsWith('TIMEOUT:') ? 'TIMEOUT' :
            error.message?.startsWith('NETWORK_ERROR:') ? 'NETWORK_ERROR' :
            error.message?.startsWith('FETCH_ERROR:') ? 'FETCH_ERROR' :
            error.message?.startsWith('PARSE_ERROR:') ? 'PARSE_ERROR' :
            'UNKNOWN'
    };
    
    console.error('[DEBUG] Error type:', errorDetails.type);
    console.error('[DEBUG] Error message:', errorDetails.message);
    console.error('[DEBUG] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // Rethrow with the error type prefix preserved
    throw error;
  }
};
