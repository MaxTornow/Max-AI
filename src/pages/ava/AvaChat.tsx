import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@context/AuthContext';
import { useStyles } from '@context/StylesContext';
import { FiSend, FiPaperclip, FiZap } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import { sendMessage, AvaMessage, getInitialGreeting } from '@services/ava';
import type { Style } from '@services/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * AVA Chat component
 * @returns {JSX.Element} AVA Chat page
 */
const AvaChat: React.FC = () => {
  // Get user info and styles
  const { user } = useAuth();
  const { styles, isLoading: stylesLoading } = useStyles();
  
  // State for messages, input, loading, and conversation
  const [messages, setMessages] = useState<AvaMessage[]>(() => {
    try {
      // Try to load messages from localStorage
      const savedMessages = localStorage.getItem('ava_messages');
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
      localStorage.removeItem('ava_messages');
    }
    return [];
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [conversationId, setConversationId] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem('ava_conversation_id') || undefined;
    } catch (e) {
      console.error('Error loading conversation ID from localStorage:', e);
      return undefined;
    }
  });
  
  const [selectedStyleId, setSelectedStyleId] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem('ava_selected_style_id') || undefined;
    } catch (e) {
      console.error('Error loading selected style ID from localStorage:', e);
      return undefined;
    }
  });
  
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set the first style as selected when styles are loaded
  useEffect(() => {
    if (styles.length > 0 && !selectedStyleId) {
      setSelectedStyleId(styles[0].id);
    }
  }, [styles, selectedStyleId]);

  // Load initial greeting when component mounts
  useEffect(() => {
    const loadInitialGreeting = async () => {
      // If we already have messages, don't load the greeting
      if (messages.length > 0) {
        return;
      }
      
      if (user && !stylesLoading) {
        try {
          setIsLoading(true);
          
          // Get initial greeting
          const greeting = await getInitialGreeting(user);
          
          // Create a new conversation ID if we don't have one
          const convoId = conversationId || greeting.conversation_id || uuidv4();
          setConversationId(convoId);
          
          // Add the greeting as a message
          const assistantMessage: AvaMessage = {
            id: uuidv4(),
            content: greeting.output,
            role: 'assistant',
            timestamp: new Date(),
          };
          
          setMessages([assistantMessage]);
        } catch (error) {
          console.error('Error loading initial greeting:', error);
          
          // Add a fallback greeting
          const fallbackGreeting: AvaMessage = {
            id: uuidv4(),
            content: 'Welcome to AVA! The Advanced Viral Automator is currently being rebuilt with improved capabilities. Please check back later for an enhanced content creation experience.',
            role: 'assistant',
            timestamp: new Date(),
          };
          
          setMessages([fallbackGreeting]);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadInitialGreeting();
  }, [user, stylesLoading, messages.length, conversationId]);
  
  // Save messages to localStorage when they change
  useEffect(() => {
    try {
      const messagesToSave = messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString()
      }));
      localStorage.setItem('ava_messages', JSON.stringify(messagesToSave));
    } catch (e) {
      console.error('Error saving messages to localStorage:', e);
    }
  }, [messages]);

  // Save conversation ID to localStorage when it changes
  useEffect(() => {
    try {
      if (conversationId) {
        localStorage.setItem('ava_conversation_id', conversationId);
      } else {
        localStorage.removeItem('ava_conversation_id');
      }
    } catch (e) {
      console.error('Error saving conversation ID to localStorage:', e);
    }
  }, [conversationId]);

  // Save selected style ID to localStorage when it changes
  useEffect(() => {
    try {
      if (selectedStyleId) {
        localStorage.setItem('ava_selected_style_id', selectedStyleId);
      } else {
        localStorage.removeItem('ava_selected_style_id');
      }
    } catch (e) {
      console.error('Error saving selected style ID to localStorage:', e);
    }
  }, [selectedStyleId]);

  /**
   * Get the selected style
   * @returns The selected style or undefined
   */
  const getSelectedStyle = (): Style | undefined => {
    if (!selectedStyleId) return undefined;
    return styles.find(s => s.id === selectedStyleId);
  };

  /**
   * Handle sending a message
   * @param e - Form submit event
   */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't send empty messages
    if (!input.trim()) return;
    
    // Don't send if loading
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      // Add user message to the chat
      const userMessage: AvaMessage = {
        id: uuidv4(),
        content: input,
        role: 'user',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Clear input
      setInput('');
      
      // Get the selected style
      const selectedStyle = getSelectedStyle();
      
      // Send the message to the AVA agent with the selected style
      const response = await sendMessage(input, user, conversationId, selectedStyle);
      
      console.log('Received response from AVA:', {
        outputLength: response.output.length,
        conversationId: response.conversation_id,
        selectedStyle: selectedStyle?.name
      });
      
      // Update conversation ID if needed
      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }
      
      // Add assistant message to the chat
      const assistantMessage: AvaMessage = {
        id: uuidv4(),
        content: response.output,
        role: 'assistant',
        timestamp: new Date(),
        search_results: response.search_results,
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: AvaMessage = {
        id: uuidv4(),
        content: 'Sorry, there was an error processing your request. Please try again later.',
        role: 'assistant',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Handle the "Make me 10 Viral Scripts" button click
   */
  const handleMakeViralScripts = () => {
    setInput('Create 10 viral scripts for my business');
    // Trigger form submission
    const form = document.querySelector('form');
    form?.dispatchEvent(new Event('submit', { cancelable: true }));
  };
  
  /**
   * Clear the conversation and start a new one
   */
  const clearConversation = () => {
    // Clear messages
    setMessages([]);
    
    // Generate a new conversation ID
    setConversationId(uuidv4());
    
    // Clear localStorage
    localStorage.removeItem('ava_messages');
    localStorage.removeItem('ava_conversation_id');
  };

  /**
   * Render a message
   * @param message - The message to render
   * @returns JSX element
   */
  const renderMessage = (message: AvaMessage) => {
    // Render user message
    if (message.role === 'user') {
      return (
        <div className="flex justify-end mb-4">
          <div className="bg-primary-100 dark:bg-primary-900 rounded-lg p-3 max-w-[80%]">
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        </div>
      );
    }
    
    // Render assistant message
    return (
      <div className="flex justify-start mb-4">
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 max-w-[80%]">
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
          
          {/* Render search results if available */}
          {message.search_results && message.search_results.length > 0 && (
            <div className="mt-2 p-2 bg-gray-200 dark:bg-gray-600 rounded-md text-sm">
              <p className="font-semibold mb-1">Search Results</p>
              <div className="text-xs text-gray-600 dark:text-gray-300">
                {message.search_results[0].description}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // If styles are loading, show loading spinner
  if (stylesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Chat header */}
      <div className="bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">AVA Chat</h2>
        </div>
        
        {/* Header controls */}
        <div className="flex items-center space-x-3">
          {/* Clear Chat button */}
          <button
            type="button"
            onClick={clearConversation}
            className="text-sm bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400 px-3 py-1 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
          >
            Clear Chat
          </button>
          
          {/* Style selector */}
          <div className="relative">
            <div className="flex items-center">
              {getSelectedStyle() && (
                <div className="mr-3 text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Style:</span> {getSelectedStyle()?.name}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowStyleSelector(!showStyleSelector)}
                className="text-sm bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400 px-3 py-1 rounded-md hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
              >
                {showStyleSelector ? 'Hide Styles' : 'Select Style'}
              </button>
            </div>
            
            {/* Style selector dropdown */}
            {showStyleSelector && (
              <div className="absolute top-8 right-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 z-10">
                <div className="p-3 border-b dark:border-gray-700">
                  <h3 className="font-medium text-gray-800 dark:text-white">Select Style</h3>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {styles.map(style => (
                    <button
                      key={style.id}
                      className={`w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 ${style.id === selectedStyleId ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                      onClick={() => {
                        setSelectedStyleId(style.id);
                        setShowStyleSelector(false);
                      }}
                    >
                      <div className="font-medium text-gray-800 dark:text-white">{style.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{style.niche}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Chat content area begins here */}
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id}>
            {renderMessage(msg)}
          </div>
        ))}
        
        {/* "Make me 10 Viral Scripts" button */}
        {!isLoading && messages.length > 0 && messages.length < 3 && (
          <div className="flex justify-center my-8">
            <button
              onClick={handleMakeViralScripts}
              disabled={isLoading}
              className={`flex items-center px-6 py-3 rounded-full shadow-md transition-all ${
                isLoading
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg'
              }`}
            >
              <FiZap className="mr-2" size={20} />
              Make me 10 Viral Scripts
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
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiPaperclip size={20} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 border-0 rounded-full focus:ring-2 focus:ring-primary-500 dark:text-white"
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

export default AvaChat;