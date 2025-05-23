import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { getUserStyles, Style } from '../../services/styles';

interface StyleContextType {
  styles: Style[];
  isLoading: boolean;
  selectedStyle: Style | null;
  setSelectedStyle: (style: Style | null) => void;
  refreshStyles: () => Promise<void>;
}

const StyleContext = createContext<StyleContextType | undefined>(undefined);

/**
 * Provider component for managing styles
 * @param {React.PropsWithChildren} props - Component props
 * @returns {JSX.Element} StyleProvider component
 */
export const StyleProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { user } = useAuth();
  const [styles, setStyles] = useState<Style[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load styles from localStorage on mount
  useEffect(() => {
    const savedStyleId = localStorage.getItem('selectedStyleId');
    if (savedStyleId) {
      // We'll load the actual style when we fetch styles
      fetchStyles(savedStyleId);
    } else {
      fetchStyles();
    }
  }, [user?.id]);

  // Save selected style to localStorage when it changes
  useEffect(() => {
    if (selectedStyle) {
      localStorage.setItem('selectedStyleId', selectedStyle.id);
    } else {
      localStorage.removeItem('selectedStyleId');
    }
  }, [selectedStyle]);

  const fetchStyles = async (savedStyleId?: string) => {
    if (!user?.id) {
      setStyles([]);
      setSelectedStyle(null);
      return;
    }

    setIsLoading(true);
    try {
      const fetchedStyles = await getUserStyles(user.id);
      setStyles(fetchedStyles);
      
      // If we have a saved style ID, find and select that style
      if (savedStyleId) {
        const savedStyle = fetchedStyles.find(style => style.id === savedStyleId);
        if (savedStyle) {
          setSelectedStyle(savedStyle);
        }
      }
    } catch (error) {
      console.error('Error fetching styles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStyles = async () => {
    await fetchStyles(selectedStyle?.id);
  };

  return (
    <StyleContext.Provider
      value={{
        styles,
        isLoading,
        selectedStyle,
        setSelectedStyle,
        refreshStyles
      }}
    >
      {children}
    </StyleContext.Provider>
  );
};

/**
 * Hook for accessing the style context
 * @returns {StyleContextType} Style context
 */
export const useStyles = (): StyleContextType => {
  const context = useContext(StyleContext);
  if (context === undefined) {
    throw new Error('useStyles must be used within a StyleProvider');
  }
  return context;
};

export default StyleProvider;
