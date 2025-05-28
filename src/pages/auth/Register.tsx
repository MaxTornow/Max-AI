import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { FiMail, FiLock, FiUser, FiAlertCircle, FiCheck } from 'react-icons/fi';
import supabase from '../../services/supabase/client';

/**
 * Register page component
 * @returns {JSX.Element} Register page
 */
const Register: React.FC = () => {
  const { signUp, error, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isInvitation, setIsInvitation] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [processingToken, setProcessingToken] = useState(false);
  
  // Password validation states
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false
  });
  
  // No need for base64 decoding function as we're using Supabase's verifyOtp method
  
  // Check for invitation token and email in URL
  useEffect(() => {
    const checkForInvitation = async () => {
      // Check for invitation_token and email in query params
      const searchParams = new URLSearchParams(location.search);
      const token = searchParams.get('invitation_token');
      const urlEmail = searchParams.get('email');
      
      if (token) {
        console.log('Found invitation token:', token);
        setInviteToken(token);
        setIsInvitation(true);
        setProcessingToken(true);
        
        try {
          // Check if email is provided in the URL
          if (urlEmail) {
            console.log('Using email from URL:', urlEmail);
            setEmail(urlEmail);
            setSuccessMessage('Please complete your registration by setting your name and password.');
            setProcessingToken(false);
            return;
          }
          
          // Since we don't have the email and verifyOtp doesn't work with the token,
          // we'll need to modify our email template to include the email
          console.log('No email found in URL. Please update your email template to include the email parameter.');
          setFormError('Invitation is missing required information. Please contact the administrator.');
          
        } catch (error: any) {
          console.error('Error processing invitation:', error);
          setFormError('Error processing invitation. Please try again or request a new invitation.');
        } finally {
          setProcessingToken(false);
        }
      }
    };
    
    checkForInvitation();
  }, [location]);
  
  // Check if user is already logged in
  useEffect(() => {
    if (user && !isInvitation) {
      // Get the redirect path from location state or default to dashboard
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location, isInvitation]);
  
  // Validate password as user types
  useEffect(() => {
    setPasswordValidation({
      length: password.length >= 6,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password)
    });
  }, [password]);
  
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Whether email is valid
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  /**
   * Handle form submission
   * @param {React.FormEvent} e - Form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');
    
    // Enhanced validation
    if (!email.trim()) {
      setFormError('Email is required');
      return;
    }
    
    if (!isValidEmail(email.trim())) {
      setFormError('Please enter a valid email address');
      return;
    }
    
    if (!fullName.trim()) {
      setFormError('Full name is required');
      return;
    }
    
    if (fullName.trim().length < 2) {
      setFormError('Full name must be at least 2 characters');
      return;
    }
    
    if (!password) {
      setFormError('Password is required');
      return;
    }
    
    // Check all password requirements
    if (!passwordValidation.length || 
        !passwordValidation.hasUppercase || 
        !passwordValidation.hasLowercase || 
        !passwordValidation.hasNumber) {
      setFormError('Password does not meet all requirements');
      return;
    }
    
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    try {
      if (isInvitation && inviteToken) {
        // For invitation flow, we need to accept the invitation and set the password
        setSuccessMessage('Setting up your account...');
        
        console.log('Completing invitation setup for email:', email);
        
        try {
          // First, verify the OTP with type 'invite'
          console.log('Verifying invitation token:', inviteToken);
          
          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            email: email,
            token: inviteToken,
            type: 'invite',
          });
          
          if (verifyError) {
            console.error('Error verifying invitation token:', verifyError);
            setFormError(verifyError.message || 'Invalid or expired invitation. Please request a new invitation.');
            return;
          }
          
          console.log('Invitation verified successfully:', verifyData);
          
          // Now that we're authenticated, update the user with their password
          const { data: userData, error: updateError } = await supabase.auth.updateUser({
            password: password,
            data: {
              full_name: fullName.trim()
            }
          });
          
          if (updateError) {
            console.error('Error updating invited user:', updateError);
            setFormError(updateError.message || 'Error setting up your account. Please try again.');
            return;
          }
          
          console.log('Successfully updated invited user:', userData?.user?.email);
          
          // Update the user profile in the database
          if (userData && userData.user) {
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: userData.user.id,
                email: userData.user.email!,
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
              setFormError('Your account was created but there was an issue setting up your profile. Some features may be limited.');
            }
          }
        } catch (err: any) {
          console.error('Unexpected error during invitation process:', err);
          setFormError(err.message || 'An unexpected error occurred. Please try again or contact support.');
          return;
        }
        
        setSuccessMessage('Account setup successful! Redirecting to dashboard...');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1500);
      } else {
        // Regular sign-up flow
        setSuccessMessage('Creating your account...');
        
        // Call signUp with the new return type
        const result = await signUp(email.trim(), password, fullName.trim());
        
        // Handle the result based on success status
        if (result.success) {
          setSuccessMessage(result.message || 'Account created successfully!');
          
          // Only redirect if we have a successful sign-up AND a session
          if (user) {
            // Short delay before redirecting to give user feedback
            setTimeout(() => {
              // The actual navigation is handled by the useEffect
            }, 1500);
          }
        } else {
          // If sign-up failed but we got a message, show it as an error
          setFormError(result.message || 'Failed to create account');
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setFormError(error.message || 'An unexpected error occurred. Please try again.');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {isInvitation ? 'Complete Your Registration' : 'Create an account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {isInvitation 
              ? 'You\'ve been invited to join. Please set up your account.' 
              : 'Sign up to access all features'}
          </p>
        </div>
        
        {formError && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">{formError}</h3>
              </div>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiCheck className="h-5 w-5 text-green-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300">{successMessage}</h3>
              </div>
            </div>
          </div>
        )}
        
        {processingToken ? (
          <div className="flex justify-center items-center py-8">
            <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Processing invitation...</span>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => !isInvitation && setEmail(e.target.value)}
                    disabled={isInvitation}
                    className={`input pl-10 ${isInvitation ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                    placeholder="you@example.com"
                  />
                </div>
                {isInvitation && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This email address is from your invitation and cannot be changed.
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="text-gray-400" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input pl-10"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10"
                    placeholder="••••••••"
                  />
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Password requirements:</p>
                  <div className="text-xs">
                    <div className={`flex items-center ${passwordValidation.length ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {passwordValidation.length ? <FiCheck size={12} className="mr-1" /> : <span className="w-3 h-3 mr-1 inline-block border border-current rounded-full" />}
                      At least 6 characters
                    </div>
                    <div className={`flex items-center ${passwordValidation.hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {passwordValidation.hasUppercase ? <FiCheck size={12} className="mr-1" /> : <span className="w-3 h-3 mr-1 inline-block border border-current rounded-full" />}
                      At least one uppercase letter
                    </div>
                    <div className={`flex items-center ${passwordValidation.hasLowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {passwordValidation.hasLowercase ? <FiCheck size={12} className="mr-1" /> : <span className="w-3 h-3 mr-1 inline-block border border-current rounded-full" />}
                      At least one lowercase letter
                    </div>
                    <div className={`flex items-center ${passwordValidation.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {passwordValidation.hasNumber ? <FiCheck size={12} className="mr-1" /> : <span className="w-3 h-3 mr-1 inline-block border border-current rounded-full" />}
                      At least one number
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input pl-10"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full flex justify-center items-center"
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {isInvitation ? 'Complete Registration' : 'Sign up'}
              </button>
            </div>
          </form>
        )}
        

      </div>
    </div>
  );
};

export default Register;