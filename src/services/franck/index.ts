import { supabase } from '../supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * FRANCK API response interface
 */
export interface FranckResponse {
  output: string;
  conversation_id: string;
  search_results?: {
    title: string;
    url: string;
    description: string;
  }[];
}

/**
 * FRANCK API request interface
 */
export interface FranckRequest {
  message: string;
  style: {
    name: string;
    niche: string;
    target_audience: string;
    pain_points: string[];
    communication_style: string;
    hero_story: string;
  };
  conversation_id?: string;
}

/**
 * Message interface for FRANCK chat
 */
export interface FranckMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  search_results?: {
    title: string;
    url: string;
    description: string;
  }[];
}

// Note: API URL, authentication and style formatting functions removed as they're no longer needed with placeholder implementation

/**
 * Get an initial greeting from the FRANCK agent
 * 
 * This function now returns a placeholder response since the agent is being rebuilt.
 * 
 * @param user - The authenticated user
 * @param style - The style to use (not used in placeholder)
 * @param retries - Number of retries to attempt (not used in placeholder)
 * @param retryDelay - Delay between retries in ms (not used in placeholder)
 * @returns Promise with a placeholder FRANCK response
 */
export const getInitialGreeting = async (
  user: User | null
): Promise<FranckResponse> => {
  console.log('FRANCK agent is being rebuilt - returning placeholder greeting');
  
  // If no user, throw authentication error
  if (!user) {
    throw new Error('Authentication required. Please log in to continue.');
  }
  
  // Return a placeholder response
  return {
    output: 'Welcome to FRANCK! The Facebook Relevent Niche Content Kreator.',
    conversation_id: crypto.randomUUID()
  };
};

/**
 * Check if the FRANCK agent is available
 * @returns Promise that resolves to false as the agent is being rebuilt
 */
export const checkFranckHealth = async (): Promise<boolean> => {
  console.log('FRANCK agent is being rebuilt - health check returning false');
  return false;
};

/**
 * Send a message to the FRANCK agent
 * 
 * This function sends the message and style information to the n8n webhook
 * and returns the actual response from the webhook.
 * 
 * @param message - The message to send
 * @param user - The authenticated user
 * @param conversationId - Optional conversation ID for continuing a conversation
 * @param style - Optional style to use
 * @returns Promise with the FRANCK response
 */
export const sendMessage = async (
  message: string,
  user: User | null,
  conversationId?: string,
  style?: any
): Promise<FranckResponse> => {
  console.log('Sending message to FRANCK webhook', { messageLength: message?.length || 0, style });
  
  if (!user) {
    throw new Error('Authentication required. Please log in to continue.');
  }
  
  // Generate a conversation ID if not provided
  const convoId = conversationId || crypto.randomUUID();
  
  try {
    // Get the webhook URL from environment variables
    const webhookUrl = import.meta.env.VITE_FRANCK_WEBHOOK_URL;
    
    if (!webhookUrl) {
      throw new Error('FRANCK webhook URL not configured. Please check environment variables.');
    }
    
    console.log(`Sending message to webhook: ${webhookUrl}`);
    
    // Prepare the payload
    const payload = {
      message,
      style: style ? {
        id: style.id,
        name: style.name,
        niche: style.niche,
        target_audience: style.target_audience,
        pain_points: style.pain_points,
        communication_style: style.communication_style,
        hero_story: style.hero_story
      } : null,
      user_id: user.id,
      conversation_id: convoId,
      timestamp: new Date().toISOString()
    };
    
    // Send the POST request to the webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook request failed with status: ${response.status}`);
    }
    
    // Parse the webhook response
    let webhookResponseData;
    try {
      const responseText = await response.text();
      console.log('Raw webhook response:', responseText);
      
      // Try to parse the response as JSON
      try {
        webhookResponseData = JSON.parse(responseText);
      } catch (parseError) {
        // If the response is already a string (not JSON), use it directly
        console.log('Response is not valid JSON, using as plain text');
        return {
          output: responseText,
          conversation_id: convoId
        };
      }
      
      console.log('Parsed webhook response:', webhookResponseData);
      
      // Handle different response formats
      
      // Case 1: Response has a 'response' field (n8n format)
      if (webhookResponseData && webhookResponseData.response) {
        console.log('Response format: Object with response field');
        return {
          output: webhookResponseData.response,
          conversation_id: convoId
        };
      }
      
      // Case 2: Response is an array with objects containing 'output' field
      if (Array.isArray(webhookResponseData) && webhookResponseData.length > 0) {
        console.log('Response format: Array');
        
        // Check for output field
        if (webhookResponseData[0].output) {
          return {
            output: webhookResponseData[0].output,
            conversation_id: convoId
          };
        }
        
        // Check for response field
        if (webhookResponseData[0].response) {
          return {
            output: webhookResponseData[0].response,
            conversation_id: convoId
          };
        }
      }
      
      // Case 3: Response is a string (JSON stringified)
      if (typeof webhookResponseData === 'string') {
        console.log('Response format: String');
        try {
          // Try to parse it again in case it's a stringified JSON
          const parsedAgain = JSON.parse(webhookResponseData);
          
          // Check for response field
          if (parsedAgain && parsedAgain.response) {
            return {
              output: parsedAgain.response,
              conversation_id: convoId
            };
          }
          
          // Check for array with response field
          if (Array.isArray(parsedAgain) && parsedAgain.length > 0) {
            if (parsedAgain[0].response) {
              return {
                output: parsedAgain[0].response,
                conversation_id: convoId
              };
            }
            if (parsedAgain[0].output) {
              return {
                output: parsedAgain[0].output,
                conversation_id: convoId
              };
            }
          }
          
          // If it's just a string, use it as the output
          return {
            output: webhookResponseData,
            conversation_id: convoId
          };
        } catch (e) {
          // If parsing fails, use the string as is
          return {
            output: webhookResponseData,
            conversation_id: convoId
          };
        }
      }
      
      // Case 4: Response is an object with 'output' field
      if (webhookResponseData && webhookResponseData.output) {
        console.log('Response format: Object with output field');
        return {
          output: webhookResponseData.output,
          conversation_id: convoId
        };
      }
      
      // If we get here, the format is unexpected
      console.log('Unexpected response format, returning raw data');
      return {
        output: JSON.stringify(webhookResponseData, null, 2),
        conversation_id: convoId
      };
    } catch (error) {
      console.error('Error parsing webhook response:', error);
      const parseError = error as Error;
      return {
        output: "There was an error processing the response from FRANCK. Technical details: " + parseError.message,
        conversation_id: convoId
      };
    }
  } catch (error) {
    console.error('Error sending message to webhook or processing response:', error);
    
    // Return an error response for the UI
    return {
      output: "There was an error processing your request. Please try again later.",
      conversation_id: convoId
    };
  }
};

/**
 * Save a conversation to the database
 * @param conversationId - The conversation ID
 * @param messages - The messages in the conversation
 * @param user - The authenticated user
 * @returns Promise with the saved conversation
 */
export const saveConversation = async (
  conversationId: string,
  messages: FranckMessage[],
  user: User | null
): Promise<void> => {
  if (!user) {
    throw new Error('Authentication required. Please log in to continue.');
  }
  
  try {
    console.log(`Saving conversation ${conversationId} with ${messages.length} messages`);
    
    const { error } = await supabase
      .from('conversations')
      .upsert({
        id: conversationId,
        user_id: user.id,
        messages: messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp.toISOString(),
          search_results: msg.search_results || null,
        })),
        updated_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
    
    console.log('Conversation saved successfully');
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw new Error('Failed to save conversation. Please try again.');
  }
};

/**
 * Get a conversation from the database
 * @param conversationId - The conversation ID
 * @param user - The authenticated user
 * @returns Promise with the conversation messages
 */
export const getConversation = async (
  conversationId: string,
  user: User | null
): Promise<FranckMessage[]> => {
  if (!user) {
    throw new Error('Authentication required. Please log in to continue.');
  }
  
  try {
    console.log(`Getting conversation: ${conversationId}`);
    
    const { data, error } = await supabase
      .from('conversations')
      .select('messages')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
    
    console.log(`Retrieved conversation with ${data?.messages?.length || 0} messages`);
    
    // Convert the messages to FranckMessage objects
    return (data?.messages || []).map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      role: msg.role,
      timestamp: new Date(msg.timestamp),
      search_results: msg.search_results || undefined,
    }));
  } catch (error) {
    console.error('Error getting conversation:', error);
    throw new Error('Failed to load conversation. Please try again.');
  }
};

/**
 * Get all conversations for a user
 * @param user - The authenticated user
 * @returns Promise with the conversations
 */
export const getConversations = async (
  user: User | null
): Promise<{ id: string; updated_at: string }[]> => {
  if (!user) {
    throw new Error('Authentication required. Please log in to continue.');
  }
  
  try {
    console.log('Getting all conversations for user:', user.id);
    
    const { data, error } = await supabase
      .from('conversations')
      .select('id, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} conversations`);
    return data || [];
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw new Error('Failed to load conversations. Please try again.');
  }
};

/**
 * Delete a conversation
 * @param conversationId - The conversation ID
 * @param user - The authenticated user
 */
export const deleteConversation = async (
  conversationId: string,
  user: User | null
): Promise<void> => {
  if (!user) {
    throw new Error('Authentication required. Please log in to continue.');
  }
  
  try {
    console.log(`Deleting conversation: ${conversationId}`);
    
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
    
    console.log('Conversation deleted successfully');
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw new Error('Failed to delete conversation. Please try again.');
  }
};