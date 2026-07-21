import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@context/AuthContext';
import { useStyles } from '@context/StylesContext';
import { FiSend, FiZap } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import {
  sendMessage,
  AIMaxMessage,
  getInitialGreeting,
  saveMessage,
  getLatestConversation,
  getConversationMessages,
  deleteConversation,
} from '@services/aiMax';
import type { Style } from '@services/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * AI Max Chat component
 * @returns {JSX.Element} AI Max Chat page
 */
const AIMaxChat: React.FC = () => {
  // Get user info and styles
  const { user } = useAuth();
  const { styles, isLoading: stylesLoading } = useStyles();

  // State for messages, input, loading, and conversation
  const [messages, setMessages] = useState<AIMaxMessage[]>(() => {
    try {
      // Try to load messages from localStorage
      const savedMessages = localStorage.getItem('aimax_messages');
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        // Convert string timestamps back to Date objects
        return parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (e) {
      console.error('Error loading messages from localStorage:', e);
      // Clear potentially corrupted data
      localStorage.removeItem('aimax_messages');
    }
    return [];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [conversationId, setConversationId] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem('aimax_conversation_id') || undefined;
    } catch (e) {
      console.error('Error loading conversation ID from localStorage:', e);
      return undefined;
    }
  });

  const [selectedStyleId, setSelectedStyleId] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem('aimax_selected_style_id') || undefined;
    } catch (e) {
      console.error('Error loading selected style from localStorage:', e);
      return undefined;
    }
  });

  const [historyChecked, setHistoryChecked] = useState(false);

  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Try to resume the user's saved conversation from Supabase before falling
  // back to a fresh greeting, so chats follow the client across devices.
  useEffect(() => {
    const loadRemoteHistory = async () => {
      if (!user || historyChecked) return;
      try {
        const latest = await getLatestConversation(user);
        if (latest) {
          const remoteMessages = await getConversationMessages(latest.id, user);
          if (remoteMessages.length > 0) {
            setMessages(remoteMessages);
            setConversationId(latest.id);
          }
        }
      } catch (error) {
        console.error('Error loading conversation history from Supabase:', error);
      } finally {
        setHistoryChecked(true);
      }
    };

    loadRemoteHistory();
  }, [user, historyChecked]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('aimax_messages', JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving messages to localStorage:', e);
    }
  }, [messages]);

  // Save conversation ID to localStorage whenever it changes
  useEffect(() => {
    try {
      if (conversationId) {
        localStorage.setItem('aimax_conversation_id', conversationId);
      } else {
        localStorage.removeItem('aimax_conversation_id');
      }
    } catch (e) {
      console.error('Error saving conversation ID to localStorage:', e);
    }
  }, [conversationId]);

  // Save selected style ID to localStorage whenever it changes
  useEffect(() => {
    try {
      if (selectedStyleId) {
        localStorage.setItem('aimax_selected_style_id', selectedStyleId);
      } else {
        localStorage.removeItem('aimax_selected_style_id');
      }
    } catch (e) {
      console.error('Error saving selected style to localStorage:', e);
    }
  }, [selectedStyleId]);

  // Get the selected style object
  const selectedStyle = selectedStyleId ? styles.find(s => s.id === selectedStyleId) : undefined;

  // Load initial greeting if no messages exist
  useEffect(() => {
    const loadInitialGreeting = async () => {
      if (messages.length === 0 && user && historyChecked) {
        try {
          setIsLoading(true);
          const response = await getInitialGreeting(user);

          const greetingMessage: AIMaxMessage = {
            id: uuidv4(),
            content: response.output,
            role: 'assistant',
            timestamp: new Date(),
          };

          setMessages([greetingMessage]);
          setConversationId(response.conversation_id);
          saveMessage(response.conversation_id, greetingMessage, user).catch(err =>
            console.error('Error saving greeting to Supabase:', err)
          );
        } catch (error) {
          console.error('Error loading initial greeting:', error);

          // Fallback greeting if API fails
          const fallbackMessage: AIMaxMessage = {
            id: uuidv4(),
            content: 'Welcome to AI Max! How can I help you with the VGA course?',
            role: 'assistant',
            timestamp: new Date(),
          };

          setMessages([fallbackMessage]);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadInitialGreeting();
  }, [messages.length, user, historyChecked]);

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const convoId = conversationId || uuidv4();
    if (!conversationId) {
      setConversationId(convoId);
    }

    const userMessage: AIMaxMessage = {
      id: uuidv4(),
      content: input,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    saveMessage(convoId, userMessage, user).catch(err =>
      console.error('Error saving user message to Supabase:', err)
    );
    setInput('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await sendMessage(
        input,
        user,
        convoId,
        selectedStyle
      );

      const assistantMessage: AIMaxMessage = {
        id: uuidv4(),
        content: response.output,
        role: 'assistant',
        timestamp: new Date(),
        search_results: response.search_results,
      };

      setMessages(prev => [...prev, assistantMessage]);
      saveMessage(convoId, assistantMessage, user).catch(err =>
        console.error('Error saving assistant message to Supabase:', err)
      );
    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage: AIMaxMessage = {
        id: uuidv4(),
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quick action
  const handleQuickAction = async (message: string) => {
    if (isLoading) return;

    const convoId = conversationId || uuidv4();
    if (!conversationId) {
      setConversationId(convoId);
    }

    const userMessage: AIMaxMessage = {
      id: uuidv4(),
      content: message,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    saveMessage(convoId, userMessage, user).catch(err =>
      console.error('Error saving user message to Supabase:', err)
    );
    setIsLoading(true);

    try {
      const response = await sendMessage(
        message,
        user,
        convoId,
        selectedStyle
      );

      const assistantMessage: AIMaxMessage = {
        id: uuidv4(),
        content: response.output,
        role: 'assistant',
        timestamp: new Date(),
        search_results: response.search_results,
      };

      setMessages(prev => [...prev, assistantMessage]);
      saveMessage(convoId, assistantMessage, user).catch(err =>
        console.error('Error saving assistant message to Supabase:', err)
      );
    } catch (error) {
      console.error('Error sending quick action:', error);

      const errorMessage: AIMaxMessage = {
        id: uuidv4(),
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        role: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear conversation
  const clearConversation = () => {
    const previousConversationId = conversationId;
    setMessages([]);
    setConversationId(undefined);
    setSelectedStyleId(undefined);

    if (previousConversationId && user) {
      deleteConversation(previousConversationId, user).catch(err =>
        console.error('Error deleting conversation from Supabase:', err)
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Max Viral Coach</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your VGA program knowledge base - get video links & timestamps
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Clear conversation button */}
            <button
              onClick={clearConversation}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              disabled={isLoading || messages.length === 0}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 border dark:border-gray-700 dark:text-white'
              }`}
            >
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Open all links in new tab
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>

              {/* Search results */}
              {message.search_results && message.search_results.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">
                    Related sources:
                  </p>
                  <div className="space-y-2">
                    {message.search_results.map((result, index) => (
                      <a
                        key={index}
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 bg-white dark:bg-gray-800 rounded border text-xs hover:bg-gray-50 dark:hover:bg-gray-750"
                      >
                        <div className="font-medium text-primary-600 dark:text-primary-400">
                          {result.title}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400 mt-1">
                          {result.description}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="hidden">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Quick actions */}
        {messages.length <= 1 && !isLoading && (
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => handleQuickAction("I have questions about the VGA program")}
              className="flex items-center space-x-2 px-4 py-2 bg-amber-400 dark:bg-amber-500 text-amber-900 dark:text-amber-900 rounded-lg hover:bg-amber-500 dark:hover:bg-amber-400 transition-colors font-medium"
            >
              <FiZap size={16} />
              <span>I have questions about the VGA program</span>
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat input */}
      <div className="bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e as unknown as React.FormEvent);
              }
            }}
            placeholder="Ask AI Max about the VGA course..."
            rows={1}
            className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 border-0 rounded-2xl focus:ring-2 focus:ring-primary-500 dark:text-white resize-none max-h-40 overflow-y-auto"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-full ${
              !input.trim() || isLoading
                ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            <FiSend size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIMaxChat;
