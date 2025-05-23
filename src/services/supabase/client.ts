import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';

// These environment variables will be replaced by actual values during build
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check for missing environment variables and log a more helpful error message
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ CRITICAL ERROR: Missing Supabase environment variables!');
  console.error('Please ensure you have the following in your .env file:');
  console.error('VITE_SUPABASE_URL=your_supabase_url');
  console.error('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  
  // In development, provide more guidance
  if (import.meta.env.DEV) {
    console.error('\nTo fix this issue:');
    console.error('1. Create or edit your .env.local or .env.development file');
    console.error('2. Add the required Supabase variables');
    console.error('3. Restart the development server');
    console.error('\nYou can find these values in your Supabase project settings.');
  }
} else {
  // Log the configured values (partial, for security)
  console.log('Supabase URL configured:', supabaseUrl);
  console.log('Supabase Anon Key configured:', supabaseAnonKey.substring(0, 10) + '...');
}

/**
 * Create a Supabase client with retry capability
 */
const createSupabaseClient = (): SupabaseClient<Database> => {
  console.log('Creating Supabase client...');
  const client = createClient<Database>(
    supabaseUrl || 'https://placeholder-url.supabase.co',  // Fallback to prevent crashes
    supabaseAnonKey || 'placeholder-key'  // Fallback to prevent crashes
  );
  
  // Test the connection
  setTimeout(async () => {
    try {
      const { error } = await client.auth.getSession();
      if (error) {
        console.error('Supabase connection test failed:', error);
      } else {
        console.log('✅ Supabase connection successful!');
      }
    } catch (err) {
      console.error('Error testing Supabase connection:', err);
    }
  }, 1000);
  
  return client;
};

/**
 * Supabase client instance for database operations
 */
export const supabase = createSupabaseClient();

/**
 * Utility function to handle Supabase errors consistently
 * @param error - The error object from Supabase
 * @param customMessage - Optional custom message to display
 * @returns Formatted error message
 */
export const handleSupabaseError = (error: any, customMessage?: string): string => {
  console.error('Supabase error:', error);
  
  // Provide more specific error messages based on error codes
  if (error.status === 500) {
    return 'The authentication service is currently unavailable. Please try again later.';
  }
  
  if (error.code === 'invalid_credentials') {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  
  if (error.code === 'user_already_exists') {
    return 'An account with this email already exists. Please use a different email or try logging in.';
  }
  
  return customMessage || error.message || 'An unexpected error occurred';
};

/**
 * Utility to check if Supabase is properly configured
 * @returns {boolean} Whether Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  return !!supabaseUrl && !!supabaseAnonKey && 
    supabaseUrl !== 'https://placeholder-url.supabase.co' && 
    supabaseAnonKey !== 'placeholder-key';
};

export default supabase;