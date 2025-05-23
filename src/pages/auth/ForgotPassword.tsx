import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { FiMail, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

/**
 * Forgot password page component
 * @returns {JSX.Element} Forgot password page
 */
const ForgotPassword: React.FC = () => {
  const { resetPassword, error, loading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  /**
   * Handle form submission
   * @param {React.FormEvent} e - Form event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitted(false);
    
    // Basic validation
    if (!email.trim()) {
      setFormError('Email is required');
      return;
    }
    
    try {
      await resetPassword(email);
      setIsSubmitted(true);
    } catch (error) {
      // Error is handled by the auth context
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400">MAXAI</h1>
          <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Reset your password</h2>
        </div>
        
        {isSubmitted ? (
          <div className="mt-8">
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-md flex items-start">
              <FiCheckCircle className="mr-3 mt-0.5 flex-shrink-0" size={20} />
              <div>
                <p className="font-medium">Password reset email sent!</p>
                <p className="mt-1">Check your email for a link to reset your password. If it doesn't appear within a few minutes, check your spam folder.</p>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
                Return to login
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            {(formError || error) && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md flex items-start">
                <FiAlertCircle className="mr-2 mt-0.5 flex-shrink-0" />
                <span>{formError || error}</span>
              </div>
            )}
            
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
                Send reset link
              </button>
            </div>
            
            <div className="text-center">
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;