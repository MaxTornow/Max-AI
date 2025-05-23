/**
 * Service for generating video scripts using Claude AI
 * @module scriptGenerationService
 */

import { ScriptGenerationResponse, StoryDetails } from './types';

// Claude API key from environment variables
const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY || 'your-claude-api-key-placeholder';

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
    const claudeApiKey = apiKey || CLAUDE_API_KEY;
    
    // Debug logging for API key (mask most of it for security)
    if (claudeApiKey === 'your-claude-api-key-placeholder') {
      console.error('[DEBUG] Claude API key is using the placeholder value. Environment variable may not be loaded.');
    } else {
      const maskedKey = claudeApiKey.substring(0, 10) + '...' + claudeApiKey.substring(claudeApiKey.length - 5);
      console.log('[DEBUG] Using Claude API key:', maskedKey);
    }
    
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
- Follow original transcript's ending style exactly
- Match abruptness level of original
- If original has CTA, adapt it (don't add if absent)
- Stick to ONE CTA maximum if present in original

## Examples:

### Proper JSON Response Format:

{
  "original_transcription": {
    "text": "Sample text 1"
  },
  "script_1": {
    "text": "Sample text 2"
  },
  "script_2": {
    "text": "Sample text 3"
  },
  "script_3": {
    "text": "Sample text 4"
  }
}
## Notes:

### What to Avoid:
- Starting with "hello everyone" or similar greetings unless present in original
- Adding elements absent from original transcript
- Changing the structural flow of the original
- Including multiple CTAs when original has one or none

### What TO do:
- Stay true to original's authentic voice and structure
- Adapt only language and examples for target audience
- Preserve original's natural progression and pacing
- Mirror original's level of directness and engagement

### Output Requirements:
**CRITICAL:** Return ONLY the raw JSON object without any markdown formatting, code blocks, or explanations. Do not wrap the JSON in tags. Do not include any text before or after the JSON. The response should start with { and end with } and be valid JSON that can be directly parsed.`;

    // Using proxy to avoid CORS issues
    // Instead of direct API call, we route through our local proxy
    console.log('[DEBUG] Making request to Claude API via proxy');
    
    const response = await fetch('/api/claude/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      }, // Consider updating to '2024-06-01' if needed for Claude 3.7
      // Note: If this API version doesn't work with Claude 3.7, you may need to update to a newer version
      // Using Claude 3.7 Sonnet with appropriate token limits (4000 max)
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        temperature: 0.6,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    console.log('[DEBUG] Claude API response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      console.error('[DEBUG] Claude API error response:', errorText);
      throw new Error(`Failed to generate scripts: ${response.status} ${response.statusText}`);
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
      throw new Error('Failed to parse Claude response as JSON. The response may not be in the expected format.');
    }
  } catch (error) {
    console.error('[DEBUG] Error generating scripts:', error);
    if (error instanceof Error) {
      console.error('[DEBUG] Error type:', error.constructor.name);
      console.error('[DEBUG] Error message:', error.message);
      console.error('[DEBUG] Error stack:', error.stack);
    } else {
      console.error('[DEBUG] Unknown error type:', typeof error);
    }
    throw new Error('Failed to generate scripts. Please check your API key and try again later.');
  }
};
