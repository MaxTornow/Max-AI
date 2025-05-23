import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { FiMail, FiLock, FiUser, FiAlertCircle, FiCheck } from 'react-icons/fi';

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
  
  // Password validation states
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false
  });
  
  // Check if user is already logged in
  useEffect(() => {
    if (user) {
      // Get the redirect path from location state or default to dashboard
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);
  
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
      setSuccessMessage('Creating your account...');
      
      // Call signUp with the new return type
      const result = await signUp(email.trim(), password, fullName.trim());
      
      // Handle the result based on success status
      if (result.success) {
        setSuccessMessage(result.message || 'Account created successfully!');
        
        // Only redirect if we have a successful sign-up AND a session
        // This ensures we don't redirect on email confirmation required or other partial success cases
        if (user) {
          // Short delay before redirecting to give user feedback
          // Redirection will be handled by the useEffect when user state changes
          // This gives time for the success message to be displayed
          setTimeout(() => {
            // The actual navigation is handled by the useEffect
          }, 1500);
        }
      } else {
        // If sign-up failed but we got a message, show it as an error
        setFormError(result.message || 'Failed to create account');
        setSuccessMessage('');
        
        // If it's a server error (which we identified in the AuthContext)
        if (result.message?.includes('service is experiencing issues')) {
          // Add a retry button or suggestion
          setFormError(prev => `${prev} You can try again or contact support if the issue persists.`);
        }
      }
    } catch (error: any) {
      // Handle any unexpected errors not caught by the auth context
      console.error('Unexpected error during sign-up:', error);
      setFormError(error?.message || 'An unexpected error occurred. Please try again.');
      setSuccessMessage('');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400">MAXAI</h1>
          <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Create your account</h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {(formError || error) && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md flex items-start">
              <FiAlertCircle className="mr-2 mt-0.5 flex-shrink-0" />
              <span>{formError || error}</span>
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-md flex items-start">
              <FiCheck className="mr-2 mt-0.5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
          
          <div className="space-y-4">
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
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
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
              Sign up
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;