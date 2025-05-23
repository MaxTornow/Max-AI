import React, { useState } from 'react';
import { useAuth } from '@context/AuthContext';
import { useTheme } from '@context/ThemeContext';
import { FiUser, FiMail, FiLock, FiSave, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

/**
 * Settings page component
 * @returns {JSX.Element} Settings page
 */
const Settings: React.FC = () => {
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  /**
   * Handle profile form submission
   * @param {React.FormEvent} e - Form event
   */
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    
    // Simulate API call
    try {
      // In a real implementation, this would update the user's profile
      setTimeout(() => {
        setSuccessMessage('Profile updated successfully!');
      }, 1000);
    } catch (error) {
      setErrorMessage('Failed to update profile. Please try again.');
    }
  };
  
  /**
   * Handle password form submission
   * @param {React.FormEvent} e - Form event
   */
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    
    // Basic validation
    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }
    
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    
    // Simulate API call
    try {
      // In a real implementation, this would update the user's password
      setTimeout(() => {
        setSuccessMessage('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1000);
    } catch (error) {
      setErrorMessage('Failed to update password. Please try again.');
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Account Settings</h1>
      
      {/* Success message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-md flex items-start">
          <FiCheckCircle className="mr-3 mt-0.5 flex-shrink-0" size={20} />
          <span>{successMessage}</span>
        </div>
      )}
      
      {/* Error message */}
      {errorMessage && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-md flex items-start">
          <FiAlertCircle className="mr-3 mt-0.5 flex-shrink-0" size={20} />
          <span>{errorMessage}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h2>
          
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="text-gray-400" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input pl-10"
                  placeholder="John Doe"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="you@example.com"
                  disabled
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Email address cannot be changed.
              </p>
            </div>
            
            <div>
              <button
                type="submit"
                className="btn btn-primary flex items-center"
                disabled={loading}
              >
                <FiSave className="mr-2" />
                Save Changes
              </button>
            </div>
          </form>
        </div>
        
        {/* Password Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Change Password</h2>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="text-gray-400" />
                </div>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="text-gray-400" />
                </div>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Password must be at least 6 characters.
              </p>
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                className="btn btn-primary flex items-center"
                disabled={loading}
              >
                <FiSave className="mr-2" />
                Update Password
              </button>
            </div>
          </form>
        </div>
        
        {/* Theme Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex-1 p-4 rounded-lg border ${
                    theme === 'light'
                      ? 'border-primary-500 ring-2 ring-primary-500'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <div className="bg-white border border-gray-300 rounded-md p-3 mb-2">
                    <div className="h-2 w-12 bg-gray-300 rounded mb-2"></div>
                    <div className="h-2 w-10 bg-gray-300 rounded"></div>
                  </div>
                  <div className="text-center text-sm font-medium text-gray-900 dark:text-white">
                    Light
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex-1 p-4 rounded-lg border ${
                    theme === 'dark'
                      ? 'border-primary-500 ring-2 ring-primary-500'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <div className="bg-gray-800 border border-gray-700 rounded-md p-3 mb-2">
                    <div className="h-2 w-12 bg-gray-600 rounded mb-2"></div>
                    <div className="h-2 w-10 bg-gray-600 rounded"></div>
                  </div>
                  <div className="text-center text-sm font-medium text-gray-900 dark:text-white">
                    Dark
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Notifications</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Receive email updates about your account activity
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Marketing Emails</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Receive emails about new features and updates
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;