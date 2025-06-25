import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@context/AuthContext';
import { useStyles } from '@context/StylesContext';
import { FiSend, FiPaperclip, FiZap } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import { sendMessage, FranckMessage, getInitialGreeting } from '@services/franck';
import type { Style } from '@services/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Franck Chat component
 * @returns {JSX.Element} Franck Chat page
 */
const FranckChat: React.FC = () => {
  // Get user info and styles
  const { user } = useAuth();
  const { styles, isLoading: stylesLoading } = useStyles();
  
  // State for messages, input, loading, and conversation
  const [messages, setMessages] = useState<FranckMessage[]>(() => {
    try {
      // Try to load messages from localStorage
      const savedMessages = localStorage.getItem('franck_messages');
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
      localStorage.removeItem('franck_messages');
    }
    return [];
  });
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [conversationId, setConversationId] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem('franck_conversation_id') || undefined;
    } catch (e) {
      console.error('Error loading conversation ID from localStorage:', e);
      return undefined;
    }
  });
  
  const [selectedStyleId, setSelectedStyleId] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem('franck_selected_style_id') || undefined;
    } catch (e) {
      console.error('Error loading selected style from localStorage:', e);
      return undefined;
    }
  });
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('franck_messages', JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving messages to localStorage:', e);
    }
  }, [messages]);
  
  // Save conversation ID to localStorage whenever it changes
  useEffect(() => {
    try {
      if (conversationId) {
        localStorage.setItem('franck_conversation_id', conversationId);
      } else {
        localStorage.removeItem('franck_conversation_id');
      }
    } catch (e) {
      console.error('Error saving conversation ID to localStorage:', e);
    }
  }, [conversationId]);
  
  // Save selected style ID to localStorage whenever it changes
  useEffect(() => {
    try {
      if (selectedStyleId) {
        localStorage.setItem('franck_selected_style_id', selectedStyleId);
      } else {
        localStorage.removeItem('franck_selected_style_id');
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
      if (messages.length === 0 && user) {
        try {
          setIsLoading(true);
          const response = await getInitialGreeting(user);
          
          const greetingMessage: FranckMessage = {
            id: uuidv4(),
            content: response.output,
            role: 'assistant',
            timestamp: new Date(),
            search_results: response.search_results
          };
          
          setMessages([greetingMessage]);
          setConversationId(response.conversation_id);
        } catch (error) {
          console.error('Error loading initial greeting:', error);
          // Add a fallback greeting
          const fallbackMessage: FranckMessage = {
            id: uuidv4(),
            content: 'Welcome to FRANCK Chat! How can I help you create viral content today?',
            role: 'assistant',
            timestamp: new Date()
          };
          setMessages([fallbackMessage]);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadInitialGreeting();
  }, [user, messages.length]);
  
  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading || !user) return;
    
    const messageText = input.trim();
    setInput('');
    
    // Add user message to the conversation
    const userMessage: FranckMessage = {
      id: uuidv4(),
      content: messageText,
      role: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      // Send message to Franck
      const response = await sendMessage(
        messageText,
        user,
        conversationId,
        selectedStyle
      );
      
      // Add Franck's response to the conversation
      const assistantMessage: FranckMessage = {
        id: uuidv4(),
        content: response.output,
        role: 'assistant',
        timestamp: new Date(),
        search_results: response.search_results
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update conversation ID if it changed
      if (response.conversation_id !== conversationId) {
        setConversationId(response.conversation_id);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to conversation
      const errorMessage: FranckMessage = {
        id: uuidv4(),
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle quick action
  const handleQuickAction = async (message: string) => {
    if (isLoading || !user) return;
    
    // Add user message to the conversation
    const userMessage: FranckMessage = {
      id: uuidv4(),
      content: message,
      role: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      // Send message to Franck
      const response = await sendMessage(
        message,
        user,
        conversationId,
        selectedStyle
      );
      
      // Add Franck's response to the conversation
      const assistantMessage: FranckMessage = {
        id: uuidv4(),
        content: response.output,
        role: 'assistant',
        timestamp: new Date(),
        search_results: response.search_results
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update conversation ID if it changed
      if (response.conversation_id !== conversationId) {
        setConversationId(response.conversation_id);
      }
      
    } catch (error) {
      console.error('Error sending quick action:', error);
      
      // Add error message to conversation
      const errorMessage: FranckMessage = {
        id: uuidv4(),
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    setConversationId(undefined);
    localStorage.removeItem('franck_messages');
    localStorage.removeItem('franck_conversation_id');
  };
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FRANCK Chat</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedStyle ? `Using style: ${selectedStyle.name}` : 'No style selected'}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Style selector */}
            <select
              value={selectedStyleId || ''}
              onChange={(e) => setSelectedStyleId(e.target.value || undefined)}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-primary-500 dark:text-white"
              disabled={stylesLoading}
            >
              <option value="">Select a style</option>
              {styles.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.name}
                </option>
              ))}
            </select>
            
            {/* Clear conversation button */}
            <button
              onClick={clearConversation}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
              
              <div className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {/* Quick actions */}
        {messages.length <= 1 && !isLoading && (
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => handleQuickAction('Lets create a viral script')}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
            >
              <FiZap size={16} />
              <span>Lets create a viral script</span>
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

export default FranckChat;