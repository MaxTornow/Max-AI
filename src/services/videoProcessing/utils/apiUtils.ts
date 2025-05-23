/**
 * Utility functions for API calls
 * @module apiUtils
 */

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  status?: number;
  statusText?: string;
  responseBody?: string;
  url?: string;
  declare cause?: Error; // Explicitly declare cause property

  constructor(message: string, options: {
    status?: number;
    statusText?: string;
    responseBody?: string;
    url?: string;
    cause?: Error;
  } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.statusText = options.statusText;
    this.responseBody = options.responseBody;
    this.url = options.url;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Network error class for connection issues
 */
export class NetworkError extends Error {
  url?: string;
  declare cause?: Error; // Explicitly declare cause property

  constructor(message: string, url?: string, cause?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.url = url;
    if (cause) {
      this.cause = cause;
    }
  }
}

/**
 * Timeout error class
 */
export class TimeoutError extends Error {
  url?: string;
  timeoutMs: number;

  constructor(message: string, url?: string, timeoutMs = 30000) {
    super(message);
    this.name = 'TimeoutError';
    this.url = url;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Fetch with timeout, retry logic, and improved error handling
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param retries - Number of retries
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise with the fetch response
 */
export const fetchWithRetry = async (
  url: string, 
  options: RequestInit = {}, 
  retries = 3, 
  timeoutMs = 30000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    // Handle HTTP errors
    if (!response.ok) {
      let responseBody = '';
      try {
        responseBody = await response.text();
      } catch (e) {
        // Ignore error when trying to read response body
      }
      
      throw new ApiError(`API request failed with status ${response.status}`, {
        status: response.status,
        statusText: response.statusText,
        responseBody,
        url
      });
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle abort errors (timeouts)
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TimeoutError(`Request timed out after ${timeoutMs}ms`, url, timeoutMs);
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('network')) {
      throw new NetworkError('Network error occurred', url, error);
    }
    
    // If we have retries left and it's a potentially recoverable error
    if (
      retries > 1 && 
      (error instanceof NetworkError || 
       (error instanceof ApiError && [408, 429, 500, 502, 503, 504].includes(error.status || 0)))
    ) {
      // Exponential backoff with jitter
      const delay = 1000 * Math.pow(2, 4 - retries) * (0.5 + Math.random() * 0.5);
      console.log(`Retrying request to ${url} in ${delay}ms. Retries left: ${retries - 1}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, timeoutMs);
    }
    
    throw error;
  }
};

/**
 * Safely parse JSON with error handling
 * @param text - JSON text to parse
 * @returns Parsed JSON object
 */
export const safeJsonParse = <T>(text: string): T => {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${(error as Error).message}\nText: ${text.substring(0, 100)}...`);
  }
};

/**
 * Format error for logging
 * @param error - Error object
 * @returns Object suitable for console.error
 */
export const formatErrorForLogging = (error: unknown): Record<string, unknown> => {
  if (error instanceof ApiError) {
    return {
      name: error.name,
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      responseBody: error.responseBody?.substring(0, 500),
      stack: error.stack
    };
  }
  
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause ? formatErrorForLogging(error.cause) : undefined
    };
  }
  
  return { error: String(error) };
};
