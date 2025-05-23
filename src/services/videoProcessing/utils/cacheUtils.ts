/**
 * Cache utilities for video processing
 * @module cacheUtils
 */

import { CACHE_CONFIG } from '../config';
import { formatErrorForLogging } from './apiUtils';

/**
 * Simple LRU cache implementation
 */
export class LRUCache<T> {
  private cache: Map<string, { data: T; timestamp: number }>;
  private maxSize: number;
  private ttl: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Create a new LRU cache
   * @param maxSize - Maximum number of items to store
   * @param ttl - Time to live in milliseconds
   * @param cleanupIntervalMs - Interval for automatic cleanup in milliseconds
   */
  constructor(
    maxSize = CACHE_CONFIG.MAX_CACHE_SIZE, 
    ttl = CACHE_CONFIG.CACHE_TTL_MS,
    cleanupIntervalMs = CACHE_CONFIG.CLEANUP_INTERVAL_MS
  ) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    
    // Start automatic cleanup if interval is provided
    if (cleanupIntervalMs > 0) {
      this.startCleanupInterval(cleanupIntervalMs);
    }
  }
  
  /**
   * Start automatic cleanup of expired items
   * @param intervalMs - Cleanup interval in milliseconds
   */
  private startCleanupInterval(intervalMs: number): void {
    // Clear any existing interval
    this.stopCleanupInterval();
    
    // Set new interval
    this.cleanupInterval = setInterval(() => {
      try {
        this.removeExpiredItems();
      } catch (error) {
        console.error('Error during cache cleanup:', formatErrorForLogging(error));
      }
    }, intervalMs);
  }
  
  /**
   * Stop automatic cleanup
   */
  public stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get an item from the cache
   * @param key - Cache key
   * @returns Cached item or undefined if not found or expired
   */
  get(key: string): T | undefined {
    try {
      // Ensure key is a string
      const safeKey = this.sanitizeKey(key);
      
      const item = this.cache.get(safeKey);
      
      if (!item) {
        return undefined;
      }
      
      // Check if the item has expired
      if (this.isExpired(item.timestamp)) {
        this.cache.delete(safeKey);
        return undefined;
      }
      
      // Move to the end (most recently used)
      this.cache.delete(safeKey);
      this.cache.set(safeKey, item);
      
      return item.data;
    } catch (error) {
      console.error('Error getting item from cache:', formatErrorForLogging(error));
      return undefined;
    }
  }
  
  /**
   * Check if a timestamp has expired
   * @param timestamp - Timestamp to check
   * @returns True if expired
   */
  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.ttl;
  }
  
  /**
   * Sanitize a cache key
   * @param key - Key to sanitize
   * @returns Sanitized key
   */
  private sanitizeKey(key: string | undefined): string {
    if (key === undefined || key === null) {
      return 'undefined_key';
    }
    return String(key).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  }

  /**
   * Set an item in the cache
   * @param key - Cache key
   * @param data - Data to cache
   * @returns True if successful, false otherwise
   */
  set(key: string, data: T): boolean {
    try {
      // Ensure key is a string
      const safeKey = this.sanitizeKey(key);
      
      // If the cache is full, remove the oldest item (first in the Map)
      if (this.cache.size >= this.maxSize) {
        this.removeOldestItem();
      }
      
      // Add the new item
      this.cache.set(safeKey, { data, timestamp: Date.now() });
      return true;
    } catch (error) {
      console.error('Error setting item in cache:', formatErrorForLogging(error));
      return false;
    }
  }
  
  /**
   * Remove the oldest item from the cache
   */
  private removeOldestItem(): void {
    if (this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Check if an item exists in the cache and is not expired
   * @param key - Cache key
   * @returns True if the item exists and is not expired
   */
  has(key: string): boolean {
    try {
      // Ensure key is a string
      const safeKey = this.sanitizeKey(key);
      
      const item = this.cache.get(safeKey);
      
      if (!item) {
        return false;
      }
      
      // Check if the item has expired
      if (this.isExpired(item.timestamp)) {
        this.cache.delete(safeKey);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking cache:', formatErrorForLogging(error));
      return false;
    }
  }

  /**
   * Remove an item from the cache
   * @param key - Cache key
   * @returns True if the item was deleted, false otherwise
   */
  delete(key: string): boolean {
    try {
      // Ensure key is a string
      const safeKey = this.sanitizeKey(key);
      return this.cache.delete(safeKey);
    } catch (error) {
      console.error('Error deleting from cache:', formatErrorForLogging(error));
      return false;
    }
  }

  /**
   * Clear the cache
   */
  clear(): void {
    try {
      this.cache.clear();
    } catch (error) {
      console.error('Error clearing cache:', formatErrorForLogging(error));
    }
  }
  
  /**
   * Remove all expired items from the cache
   * @returns Number of items removed
   */
  removeExpiredItems(): number {
    try {
      let removedCount = 0;
      const now = Date.now();
      
      for (const [key, item] of this.cache.entries()) {
        if (now - item.timestamp > this.ttl) {
          this.cache.delete(key);
          removedCount++;
        }
      }
      
      return removedCount;
    } catch (error) {
      console.error('Error removing expired items:', formatErrorForLogging(error));
      return 0;
    }
  }

  /**
   * Get the number of items in the cache
   */
  get size(): number {
    return this.cache.size;
  }
}

// Create video info cache instance with type definition
export interface VideoInfo {
  url: string;
  download_url: string;
  title?: string;
  author?: string;
  thumbnail?: string;
  duration?: number;
  [key: string]: any; // Allow for additional properties
}

export const videoInfoCache = new LRUCache<VideoInfo>();

// Create video data cache instance
export const videoDataCache = new LRUCache<ArrayBuffer>();

// Create transcription cache instance
export interface TranscriptionCacheItem {
  transcriptionId: string;
  text: string;
  completed: Date;
}

export const transcriptionCache = new LRUCache<TranscriptionCacheItem>();

// Create script generation cache instance
export interface ScriptCacheItem {
  requestId: string;
  scripts: {
    script_1: { text: string };
    script_2: { text: string };
    script_3: { text: string };
    [key: string]: { text: string };
  };
  generated: Date;
}

export const scriptCache = new LRUCache<ScriptCacheItem>();

/**
 * Ensure cache keys are always strings and properly formatted
 * @param key - Key to sanitize
 * @returns Sanitized key
 */
export const ensureCacheKey = (key: string | undefined): string => {
  if (key === undefined || key === null) {
    return 'undefined_key';
  }
  
  // Remove any characters that might cause issues in cache keys
  return String(key).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
};

/**
 * Generate a cache key from a URL
 * @param url - URL to generate key from
 * @returns Cache key
 */
export const generateCacheKeyFromUrl = (url: string | undefined): string => {
  if (!url) {
    return ensureCacheKey('undefined_url');
  }
  
  try {
    // Extract domain and path from URL
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname;
    
    // Create a key from domain and path
    return ensureCacheKey(`${domain}${path}`);
  } catch (error) {
    // If URL parsing fails, use the URL directly
    console.error('Error generating cache key from URL:', formatErrorForLogging(error));
    return ensureCacheKey(url);
  }
};
