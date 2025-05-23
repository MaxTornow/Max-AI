import React, { createContext, useContext, useState, ReactNode } from 'react';
import Toast, { ToastType } from '../components/ui/Toast';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Toast context provider for managing toast notifications
 * @param {object} props - Component props
 * @param {ReactNode} props.children - Child components
 * @returns {JSX.Element} Toast context provider
 */
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastType = 'info', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prevToasts) => [...prevToasts, { id, message, type, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Only show the most recent toast when centered to avoid overlapping */}
      {toasts.length > 0 && (
        <Toast
          key={toasts[toasts.length - 1].id}
          message={toasts[toasts.length - 1].message}
          type={toasts[toasts.length - 1].type}
          duration={toasts[toasts.length - 1].duration}
          onClose={() => removeToast(toasts[toasts.length - 1].id)}
        />
      )}
    </ToastContext.Provider>
  );
};

/**
 * Custom hook to use the toast context
 * @returns {ToastContextType} Toast context
 */
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
