/**
 * Configuration for video processing services
 * @module config
 */

// Environment variables with fallbacks (SECURITY: No hardcoded keys)
export const API_KEYS = {
  FASTSAVER: import.meta.env.VITE_FASTSAVER_API_TOKEN || '',
  TIKTOK: import.meta.env.VITE_TIKTOK_API_TOKEN || '',
  ASSEMBLY_AI: import.meta.env.VITE_ASSEMBLY_AI_API_KEY || '',
  CLAUDE: import.meta.env.VITE_CLAUDE_API_KEY || ''
};

// API Endpoints
export const API_ENDPOINTS = {
  FASTSAVER: 'https://api.fastsaver.io/v1',
  TIKTOK: 'https://tiktok-video-no-watermark2.p.rapidapi.com/'
};

// FastSaver API configuration
export const FASTSAVER_CONFIG = {
  BASE_URL: 'https://api.fastsaver.io/v1',
  ENDPOINTS: {
    FETCH: '/fetch'
  },
  TIMEOUT_MS: 15000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000
};

// TikTok API configuration
export const TIKTOK_CONFIG = {
  TIMEOUT_MS: 15000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000
};

// AssemblyAI configuration
export const ASSEMBLY_AI_CONFIG = {
  UPLOAD_TIMEOUT_MS: 120000, // 2 minutes for uploads (increased for slow connections)
  TRANSCRIPTION_TIMEOUT_MS: 120000, // 2 minutes for transcription requests
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  POLL_INTERVAL_MS: 2000, // 2 seconds between polling attempts
  MAX_POLL_ATTEMPTS: 30, // Maximum 30 polling attempts (1 minute total)
  CLEANUP_INTERVAL_MS: 3600000 // 1 hour for cleaning up stale requests
};

// Claude AI configuration
export const CLAUDE_CONFIG = {
  MODEL: 'claude-sonnet-4-5-20250929',
  MAX_TOKENS: 8020,
  TEMPERATURE: 0.6,
  TIMEOUT_MS: 180000, // 3 minutes for script generation
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 2000,
  CLEANUP_INTERVAL_MS: 3600000 // 1 hour for cleaning up stale requests
};

// Cache configuration
export const CACHE_CONFIG = {
  MAX_CACHE_SIZE: 50, // Maximum number of items to cache
  CACHE_TTL_MS: 3600000, // Cache TTL: 1 hour
  CLEANUP_INTERVAL_MS: 300000 // Run cache cleanup every 5 minutes
};

// General API configuration
export const API_CONFIG = {
  DEFAULT_TIMEOUT_MS: 30000, // 30 seconds default timeout
  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_RETRY_DELAY_MS: 1000,
  LOG_REDACTED_FIELDS: ['token', 'key', 'password', 'secret'] // Fields to redact in logs
};
