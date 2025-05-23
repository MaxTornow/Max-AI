import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

/**
 * Props for the ConfirmationModal component
 */
interface ConfirmationModalProps {
  /**
   * The title of the confirmation modal
   */
  title: string;
  
  /**
   * The message to display in the confirmation modal
   */
  message: string;
  
  /**
   * Additional details to display below the main message (optional)
   */
  details?: string;
  
  /**
   * The text to display on the confirm button
   */
  confirmText: string;
  
  /**
   * The text to display on the cancel button
   */
  cancelText: string;
  
  /**
   * Whether the confirm action is in progress
   */
  isLoading?: boolean;
  
  /**
   * Function to call when the confirm button is clicked
   */
  onConfirm: () => void;
  
  /**
   * Function to call when the cancel button is clicked
   */
  onCancel: () => void;
  
  /**
   * The type of confirmation (affects colors and icon)
   */
  type?: 'danger' | 'warning' | 'info';
}

/**
 * A reusable confirmation modal component
 * @param {ConfirmationModalProps} props - Component props
 * @returns {JSX.Element} ConfirmationModal component
 */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  details,
  confirmText,
  cancelText,
  isLoading = false,
  onConfirm,
  onCancel,
  type = 'danger'
}) => {
  // Determine colors based on type
  const colors = {
    danger: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    },
    warning: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-600 dark:text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
    },
    info: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-scaleIn">
        <div className="flex items-center mb-4">
          <div className={`flex-shrink-0 ${colors[type].bg} rounded-full p-3 mr-4`}>
            <FiAlertTriangle className={`h-6 w-6 ${colors[type].text}`} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {message}
          </p>
          {details && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {details}
            </p>
          )}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${colors[type].button} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
