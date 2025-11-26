import React from 'react';
import { FiLoader, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import type { ProcessingState } from '@services/betty/types';

interface ProcessingProgressProps {
  state: ProcessingState;
  onRetry?: () => void;
  onViewLibrary?: () => void;
}

/**
 * Processing progress component with status display
 */
const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  state,
  onRetry,
  onViewLibrary,
}) => {
  if (state.status === 'idle') {
    return null;
  }

  const getStatusInfo = () => {
    switch (state.status) {
      case 'creating':
        return {
          icon: <FiLoader className="w-6 h-6 text-blue-500 animate-spin" />,
          title: 'Creating project...',
          message: state.message,
          color: 'blue',
        };
      case 'processing':
        return {
          icon: <FiLoader className="w-6 h-6 text-primary-500 animate-spin" />,
          title: 'Processing video...',
          message: 'This may take a few minutes. You can close this page and check back later.',
          color: 'primary',
          progress: state.progress,
        };
      case 'downloading':
        return {
          icon: <FiLoader className="w-6 h-6 text-green-500 animate-spin" />,
          title: 'Finalizing...',
          message: state.message,
          color: 'green',
        };
      case 'completed':
        return {
          icon: <FiCheck className="w-6 h-6 text-green-500" />,
          title: 'Processing complete!',
          message: 'Your video is ready to download.',
          color: 'green',
        };
      case 'error':
        return {
          icon: <FiX className="w-6 h-6 text-red-500" />,
          title: 'Processing failed',
          message: state.message,
          color: 'red',
          retryable: state.retryable,
        };
      default:
        return null;
    }
  };

  const info = getStatusInfo();
  if (!info) return null;

  return (
    <div
      className={`
        w-full p-4 rounded-lg border
        ${
          info.color === 'blue'
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : info.color === 'primary'
            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
            : info.color === 'green'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{info.icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            {info.title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {info.message}
          </p>

          {/* Progress bar for processing */}
          {state.status === 'processing' && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Processing</span>
                <span>{state.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            {state.status === 'completed' && onViewLibrary && (
              <button
                onClick={onViewLibrary}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                View in Library
              </button>
            )}

            {state.status === 'error' && info.retryable && onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                <FiRefreshCw className="w-4 h-4" />
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingProgress;
