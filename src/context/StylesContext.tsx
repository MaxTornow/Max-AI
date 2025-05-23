import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserStyles, createStyle, updateStyle, deleteStyle, Style, StyleInsert } from '../services/styles';
import { useAuth } from './AuthContext';

interface StylesContextType {
  styles: Style[];
  isLoading: boolean;
  error: string | null;
  fetchStyles: () => Promise<void>;
  addStyle: (style: Omit<StyleInsert, 'id' | 'created_at' | 'updated_at'>) => Promise<Style>;
  updateStyle: (id: string, style: Omit<StyleInsert, 'id' | 'created_at' | 'updated_at'>) => Promise<Style>;
  removeStyle: (id: string) => Promise<void>;
}

const StylesContext = createContext<StylesContextType | undefined>(undefined);

export const useStyles = () => {
  const context = useContext(StylesContext);
  if (context === undefined) {
    throw new Error('useStyles must be used within a StylesProvider');
  }
  return context;
};

interface StylesProviderProps {
  children: ReactNode;
}

export const StylesProvider: React.FC<StylesProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [styles, setStyles] = useState<Style[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch styles when the user changes
  useEffect(() => {
    if (user?.id) {
      fetchStyles();
    } else {
      setStyles([]);
    }
  }, [user]);

  // Fetch all styles for the current user
  const fetchStyles = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const userStyles = await getUserStyles(user.id);
      setStyles(userStyles);
    } catch (err) {
      console.error('Error fetching styles:', err);
      setError('Failed to load styles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new style
  const addStyle = async (styleData: Omit<StyleInsert, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) {
      throw new Error('You must be logged in to create styles.');
    }
    
    try {
      const newStyle = await createStyle({
        ...styleData,
        user_id: user.id
      });
      
      // Update the styles state with the new style
      setStyles(prevStyles => [newStyle, ...prevStyles]);
      
      return newStyle;
    } catch (err) {
      console.error('Error creating style:', err);
      throw new Error('Failed to create style. Please try again.');
    }
  };

  // Update an existing style
  const modifyStyle = async (
    id: string, 
    styleData: Omit<StyleInsert, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const updatedStyle = await updateStyle(id, styleData);
      
      // Update the styles state with the updated style
      setStyles(prevStyles => 
        prevStyles.map(style => 
          style.id === id ? updatedStyle : style
        )
      );
      
      return updatedStyle;
    } catch (err) {
      console.error('Error updating style:', err);
      throw new Error('Failed to update style. Please try again.');
    }
  };

  // Remove a style
  const removeStyle = async (id: string) => {
    try {
      await deleteStyle(id);
      
      // Remove the style from the styles state
      setStyles(prevStyles => 
        prevStyles.filter(style => style.id !== id)
      );
    } catch (err) {
      console.error('Error deleting style:', err);
      throw new Error('Failed to delete style. Please try again.');
    }
  };

  const value = {
    styles,
    isLoading,
    error,
    fetchStyles,
    addStyle,
    updateStyle: modifyStyle,
    removeStyle
  };

  return (
    <StylesContext.Provider value={value}>
      {children}
    </StylesContext.Provider>
  );
};

export default StylesContext;
