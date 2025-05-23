import React, { useState, useEffect } from 'react';
import { FiCheck, FiX, FiAlertTriangle, FiInfo } from 'react-icons/fi';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

/**
 * Toast notification component
 * @param {ToastProps} props - Component props
 * @returns {JSX.Element} Toast component
 */
const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow time for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheck className="h-5 w-5 text-green-500" />;
      case 'error':
        return <FiX className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <FiAlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
      default:
        return <FiInfo className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-green-200 dark:border-green-800';
      case 'error':
        return 'border-red-200 dark:border-red-800';
      case 'warning':
        return 'border-yellow-200 dark:border-yellow-800';
      case 'info':
      default:
        return 'border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <div
      className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 transform transition-all duration-300 ${
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}
    >
      <div
        className={`flex items-center p-4 rounded-lg shadow-xl border ${getBgColor()} ${getBorderColor()} max-w-md backdrop-blur-sm`}
        role="alert"
      >
        <div className="flex-shrink-0 mr-3">
          {getIcon()}
        </div>
        <div className="flex-1 mr-2 text-sm font-medium text-gray-800 dark:text-gray-200">
          {message}
        </div>
        <button
          type="button"
          className="flex-shrink-0 ml-auto -mx-1.5 -my-1.5 bg-transparent text-gray-400 hover:text-gray-900 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 dark:hover:text-white"
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          aria-label="Close"
        >
          <FiX className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
