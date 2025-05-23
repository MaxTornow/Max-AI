import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import supabase, { handleSupabaseError, isSupabaseConfigured } from '../services/supabase/client';

/**
 * Auth context interface
 */
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{success: boolean, message: string}>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

/**
 * Auth provider props interface
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signUp: async () => ({ success: false, message: 'Not implemented' }),
  signOut: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
});

/**
 * Auth provider component to manage authentication state
 * @param {AuthProviderProps} props - Provider props
 * @returns {JSX.Element} Auth provider component
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state on component mount
  useEffect(() => {
    // Check if Supabase is properly configured
    if (!isSupabaseConfigured()) {
      console.error('Supabase is not properly configured. Authentication will not work.');
      setError('Authentication service is not properly configured. Please contact support.');
      setLoading(false);
      return;
    }
    
    // Get the current session
    const getSession = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        setSession(data.session);
        setUser(data.session?.user ?? null);
      } catch (error: any) {
        console.error('Error loading auth session:', error);
        setError(handleSupabaseError(error, 'Unable to load authentication session'));
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   */
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      setSession(data.session);
      setUser(data.user);
    } catch (error: any) {
      console.error('Error signing in:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign up with email, password, and full name
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} fullName - User's full name
   * @returns {Promise<{success: boolean, message: string}>} Result of the sign-up operation
   */
  const signUp = async (email: string, password: string, fullName: string): Promise<{success: boolean, message: string}> => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate inputs before sending to Supabase
      if (!email || !email.includes('@')) {
        throw new Error('Please provide a valid email address');
      }
      
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      if (!fullName || fullName.trim().length === 0) {
        throw new Error('Please provide your full name');
      }
      
      console.log('Attempting to sign up user with email:', email);
      // Get Supabase URL from environment for debugging
      const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      console.log('Supabase URL being used:', envSupabaseUrl || 'Not available');
      
      // IMPORTANT: Use signUp with minimal metadata to avoid potential issues
      // We'll create the profile separately after successful auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Only include minimal metadata
          data: {
            full_name: fullName.trim()
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      
      if (error) {
        console.error('Supabase auth error:', JSON.stringify(error, null, 2));
        
        // Enhanced error handling
        if (error.status === 500) {
          console.log('Attempting to handle server error...');
          console.log('Error details:', error.message, error.code, error.name);
          
          // For server errors, we'll return a more user-friendly message
          return {
            success: false,
            message: 'Our authentication service is experiencing issues. Please try again in a few moments.'
          };
        }
        
        // Handle other specific error codes
        if (error.code === 'user_already_exists') {
          return {
            success: false,
            message: 'An account with this email already exists. Please use a different email or try logging in.'
          };
        }
        
        // Use our improved error handler
        return {
          success: false,
          message: handleSupabaseError(error)
        };
      }
      
      // Check if user was created successfully
      if (!data.user) {
        throw new Error('Failed to create user account');
      }
      
      // Log the user data for debugging
      console.log('User created in auth:', data.user.id);
      console.log('Session created:', data.session ? 'Yes' : 'No');
      
      // Check if email confirmation is required
      if (!data.session) {
        // This means email confirmation is required
        return {
          success: true,
          message: 'Please check your email to confirm your account before logging in.'
        };
      }
      
      // IMPORTANT: At this point, auth was successful and we have a session
      // Update local state with the new session and user first
      setSession(data.session);
      setUser(data.user);
      
      // Now try to create the profile record separately
      // If this fails, the user is still created and can log in
      try {
        console.log('Creating user profile with ID:', data.user.id);
        
        // Use service_role client for profile creation to bypass RLS
        // This is a safer approach than modifying RLS policies
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            preferences: {
              theme: 'light',
              notifications: true,
            },
          });
          
        if (profileError) {
          console.error('Profile creation error:', JSON.stringify(profileError, null, 2));
          
          // Log the error but don't fail the signup - user can still log in
          // We'll just show a warning
          setError('Your account was created but there was an issue setting up your profile. Some features may be limited.');
          
          return {
            success: true,
            message: 'Account created successfully, but profile setup had issues. Some features may be limited.'
          };
        }
        
        console.log('User profile created successfully');
      } catch (profileError: any) {
        // Log the profile creation error but don't fail the signup
        console.error('Profile creation exception:', profileError);
        setError('Your account was created but there was an issue setting up your profile. Some features may be limited.');
        
        return {
          success: true,
          message: 'Account created successfully, but profile setup had issues. Some features may be limited.'
        };
      }
      
      console.log('User registered successfully:', data.user.id);
      
      return {
        success: true,
        message: 'Account created successfully!'
      };
      
    } catch (error: any) {
      console.error('Error in main signUp function:', error);
      setError(error.message || 'Failed to create account. Please try again.');
      
      return {
        success: false,
        message: error.message || 'Failed to create account. Please try again.'
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out the current user
   */
  const signOut = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      setSession(null);
      setUser(null);
    } catch (error: any) {
      console.error('Error signing out:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send a password reset email
   * @param {string} email - User email
   */
  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update the user's password
   * @param {string} password - New password
   */
  const updatePassword = async (password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error updating password:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    session,
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use the auth context
 * @returns {AuthContextType} Auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;