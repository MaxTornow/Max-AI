import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Loading spinner component for authentication check
 * @returns {JSX.Element} Loading spinner
 */
const AuthCheckingSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
      <p className="mt-4 text-gray-700 dark:text-gray-300">Checking authentication...</p>
    </div>
  </div>
);

/**
 * ProtectedRoute component that checks if user is authenticated
 * @returns {JSX.Element} Protected route component
 */
const ProtectedRoute: React.FC = () => {
  const { user, loading, error } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return <AuthCheckingSpinner />;
  }

  // If there's an authentication error, show error message
  if (error) {
    console.error('Authentication error:', error);
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">Authentication Error</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">{error}</p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            There was a problem verifying your authentication status. Please try logging in again.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-primary-700 dark:hover:bg-primary-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // If user is not authenticated, redirect to login page
  if (!user) {
    // Save the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated, render the protected route
  return <Outlet />;
};

export default ProtectedRoute;
