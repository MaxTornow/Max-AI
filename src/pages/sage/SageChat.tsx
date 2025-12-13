import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@context/AuthContext';
import { useStyles } from '@context/StylesContext';
import { FiSend, FiClipboard, FiCheckCircle } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import { sendMessage, SageMessage, getInitialGreeting } from '@services/sage';
import type { Style } from '@services/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * SAGE Chat component - Script Analysis & Grading Engine
 * @returns {JSX.Element} SAGE Chat page
 */
const SageChat: React.FC = () => {
  const { user } = useAuth();
  const { styles, isLoading: stylesLoading } = useStyles();

  const [messages, setMessages] = useState<SageMessage[]>(() => {
    try {
      const savedMessages = localStorage.getItem('sage_messages');
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        return parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (e) {
      console.error('Error loading messages from localStorage:', e);
      localStorage.removeItem('sage_messages');
    }
    return [];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [conversationId, setConversationId] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem('sage_conversation_id') || undefined;
    } catch (e) {
      console.error('Error loading conversation ID from localStorage:', e);
      return undefined;
    }
  });

  const [selectedStyleId, setSelectedStyleId] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem('sage_selected_style_id') || undefined;
    } catch (e) {
      console.error('Error loading selected style from localStorage:', e);
      return undefined;
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem('sage_messages', JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving messages to localStorage:', e);
    }
  }, [messages]);

  useEffect(() => {
    try {
      if (conversationId) {
        localStorage.setItem('sage_conversation_id', conversationId);
      } else {
        localStorage.removeItem('sage_conversation_id');
      }
    } catch (e) {
      console.error('Error saving conversation ID to localStorage:', e);
    }
  }, [conversationId]);

  useEffect(() => {
    try {
      if (selectedStyleId) {
        localStorage.setItem('sage_selected_style_id', selectedStyleId);
      } else {
        localStorage.removeItem('sage_selected_style_id');
      }
    } catch (e) {
      console.error('Error saving selected style to localStorage:', e);
    }
  }, [selectedStyleId]);

  const selectedStyle = selectedStyleId ? styles.find(s => s.id === selectedStyleId) : undefined;

  useEffect(() => {
    const loadInitialGreeting = async () => {
      if (messages.length === 0 && user) {
        try {
          setIsLoading(true);
          const response = await getInitialGreeting(user);

          const greetingMessage: SageMessage = {
            id: uuidv4(),
            content: response.output,
            role: 'assistant',
            timestamp: new Date(),
          };

          setMessages([greetingMessage]);
          setConversationId(response.conversation_id);
        } catch (error) {
          console.error('Error loading initial greeting:', error);

          const fallbackMessage: SageMessage = {
            id: uuidv4(),
            content: 'Welcome to SAGE! Paste your video script and I\'ll analyze it for virality potential.',
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
  }, [messages.length, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: SageMessage = {
      id: uuidv4(),
      content: input,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await sendMessage(
        input,
        user,
        conversationId,
        selectedStyle
      );

      const assistantMessage: SageMessage = {
        id: uuidv4(),
        content: response.output,
        role: 'assistant',
        timestamp: new Date(),
        search_results: response.search_results,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.conversation_id !== conversationId) {
        setConversationId(response.conversation_id);
      }
    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage: SageMessage = {
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

  const handleQuickAction = async (message: string) => {
    if (isLoading) return;

    const userMessage: SageMessage = {
      id: uuidv4(),
      content: message,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendMessage(
        message,
        user,
        conversationId,
        selectedStyle
      );

      const assistantMessage: SageMessage = {
        id: uuidv4(),
        content: response.output,
        role: 'assistant',
        timestamp: new Date(),
        search_results: response.search_results,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.conversation_id !== conversationId) {
        setConversationId(response.conversation_id);
      }
    } catch (error) {
      console.error('Error sending quick action:', error);

      const errorMessage: SageMessage = {
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

  const clearConversation = () => {
    setMessages([]);
    setConversationId(undefined);
    setSelectedStyleId(undefined);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(prev => prev + text);

      // Auto-resize textarea after paste
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SAGE</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Script Analysis & Grading Engine
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Style selector */}
            <select
              value={selectedStyleId || ''}
              onChange={(e) => setSelectedStyleId(e.target.value || undefined)}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-2 focus:ring-primary-500 dark:text-white"
              disabled={isLoading || stylesLoading}
            >
              <option value="">Select a style (optional)</option>
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
              onClick={() => handleQuickAction("Grade my script for virality")}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
            >
              <FiCheckCircle size={16} />
              <span>Grade My Script</span>
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
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-1"
            title="Paste from clipboard"
          >
            <FiClipboard size={20} />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            placeholder="Paste your video script here..."
            className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-primary-500 dark:text-white resize-none min-h-[44px] max-h-[200px]"
            disabled={isLoading}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-full mb-1 ${
              !input.trim() || isLoading
                ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            <FiSend size={20} />
          </button>
        </form>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default SageChat;
