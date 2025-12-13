import { supabase } from '../supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * SAGE API response interface
 */
export interface SageResponse {
  output: string;
  conversation_id: string;
  search_results?: {
    title: string;
    url: string;
    description: string;
  }[];
}

/**
 * SAGE API request interface
 */
export interface SageRequest {
  message: string;
  style?: {
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
 * Message interface for SAGE chat
 */
export interface SageMessage {
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

/**
 * Get an initial greeting from the SAGE agent
 *
 * @param user - The authenticated user
 * @returns Promise with a SAGE response
 */
export const getInitialGreeting = async (
  user: User | null
): Promise<SageResponse> => {
  console.log('SAGE: Getting initial greeting');

  if (!user) {
    throw new Error('Authentication required. Please log in to continue.');
  }

  return {
    output: `Welcome to SAGE - Script Analysis & Grading Engine!

I'll help you analyze and improve your video scripts for maximum virality.

**What I evaluate:**
- **Hook Quality** - First 3-5 seconds, visual & audio hooks, power words
- **Content Efficiency** - Trimming the fat, economy of words
- **Stakes & Curiosity** - Does it make viewers want to see how it ends?
- **Payoff** - Does it deliver on the hook's promise?
- **Share-ability** - Is it valuable, relatable, or entertaining?

**Paste your script below** and I'll grade it with specific improvement suggestions!`,
    conversation_id: crypto.randomUUID()
  };
};

/**
 * Check if the SAGE agent is available
 * @returns Promise that resolves to true if available
 */
export const checkSageHealth = async (): Promise<boolean> => {
  console.log('SAGE: Health check');
  return true;
};

/**
 * Send a message to the SAGE agent
 *
 * @param message - The message/script to analyze
 * @param user - The authenticated user
 * @param conversationId - Optional conversation ID for continuing a conversation
 * @param style - Optional style to use
 * @returns Promise with the SAGE response
 */
export const sendMessage = async (
  message: string,
  user: User | null,
  conversationId?: string,
  style?: any
): Promise<SageResponse> => {
  console.log('Sending message to SAGE webhook', { messageLength: message?.length || 0, style });

  if (!user) {
    throw new Error('Authentication required. Please log in to continue.');
  }

  const convoId = conversationId || crypto.randomUUID();

  try {
    const webhookUrl = import.meta.env.VITE_SAGE_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('SAGE webhook URL not configured. Please check environment variables.');
    }

    console.log(`Sending message to webhook: ${webhookUrl}`);

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

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from SAGE webhook:', errorText);
      throw new Error(`SAGE webhook returned error: ${response.status} ${response.statusText}`);
    }

    let webhookResponseData;
    try {
      const responseText = await response.text();
      console.log('Raw webhook response:', responseText);

      try {
        webhookResponseData = JSON.parse(responseText);
      } catch (parseError) {
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
          conversation_id: convoId,
          search_results: webhookResponseData.search_results
        };
      }

      // Case 2: Response is an array with objects containing 'output' field
      if (Array.isArray(webhookResponseData) && webhookResponseData.length > 0) {
        console.log('Response format: Array');

        if (webhookResponseData[0].output) {
          return {
            output: webhookResponseData[0].output,
            conversation_id: convoId,
            search_results: webhookResponseData[0].search_results
          };
        }

        if (webhookResponseData[0].response) {
          return {
            output: webhookResponseData[0].response,
            conversation_id: convoId,
            search_results: webhookResponseData[0].search_results
          };
        }
      }

      // Case 3: Response is a string (JSON stringified)
      if (typeof webhookResponseData === 'string') {
        console.log('Response format: String');
        try {
          const parsedAgain = JSON.parse(webhookResponseData);

          if (parsedAgain && parsedAgain.response) {
            return {
              output: parsedAgain.response,
              conversation_id: convoId,
              search_results: parsedAgain.search_results
            };
          }

          if (Array.isArray(parsedAgain) && parsedAgain.length > 0) {
            if (parsedAgain[0].response) {
              return {
                output: parsedAgain[0].response,
                conversation_id: convoId,
                search_results: parsedAgain[0].search_results
              };
            }
            if (parsedAgain[0].output) {
              return {
                output: parsedAgain[0].output,
                conversation_id: convoId,
                search_results: parsedAgain[0].search_results
              };
            }
          }

          return {
            output: webhookResponseData,
            conversation_id: convoId
          };
        } catch (e) {
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
          conversation_id: convoId,
          search_results: webhookResponseData.search_results
        };
      }

      // Unexpected format
      console.log('Unexpected response format, returning raw data');
      return {
        output: JSON.stringify(webhookResponseData, null, 2),
        conversation_id: convoId
      };
    } catch (error) {
      console.error('Error parsing webhook response:', error);
      const parseError = error as Error;
      return {
        output: "There was an error processing the response from SAGE. Technical details: " + parseError.message,
        conversation_id: convoId
      };
    }
  } catch (error: any) {
    console.error('Error sending message to SAGE webhook:', error);

    if (error.message.includes('Failed to fetch') || error.message.includes('Network request failed')) {
      return {
        output: 'Sorry, the SAGE service is currently unavailable. Please try again later.',
        conversation_id: convoId
      };
    }

    if (error.message.includes('JSON')) {
      return {
        output: "There was an error processing the response from SAGE. Technical details: " + error.message,
        conversation_id: convoId
      };
    }

    return {
      output: `Error: ${error.message || 'Unknown error occurred'}`,
      conversation_id: convoId
    };
  }
};

/**
 * Save a conversation to the database
 * @param conversationId - The conversation ID
 * @param messages - The messages in the conversation
 * @param user - The authenticated user
 */
export const saveConversation = async (
  conversationId: string,
  messages: SageMessage[],
  user: User | null
): Promise<void> => {
  if (!user) {
    throw new Error('Authentication required. Please log in to continue.');
  }

  try {
    console.log(`Saving conversation ${conversationId} with ${messages.length} messages`);

    try {
      localStorage.setItem('sage_messages', JSON.stringify(messages));
      localStorage.setItem('sage_conversation_id', conversationId);
    } catch (localStorageError) {
      console.warn('Could not save to localStorage:', localStorageError);
    }

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
      console.error('Error saving conversation to Supabase:', error);
    } else {
      console.log('Conversation saved successfully to Supabase');
    }
  } catch (error) {
    console.error('Error in saveConversation:', error);
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
): Promise<SageMessage[]> => {
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
