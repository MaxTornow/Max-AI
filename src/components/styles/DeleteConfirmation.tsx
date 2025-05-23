import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

interface DeleteConfirmationProps {
  styleName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog for deleting a style
 * @param {DeleteConfirmationProps} props - Component props
 * @returns {JSX.Element} DeleteConfirmation component
 */
const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  styleName,
  isDeleting,
  onConfirm,
  onCancel
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center mb-4">
        <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/30 rounded-full p-3 mr-4">
          <FiAlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Delete Style
        </h3>
      </div>
      
      <div className="mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Are you sure you want to delete the style <span className="font-semibold">{styleName}</span>?
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This action cannot be undone.
        </p>
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
          disabled={isDeleting}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
};

export default DeleteConfirmation;
