import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Theme type definition
 */
type Theme = 'light' | 'dark';

/**
 * Theme context interface
 */
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

/**
 * Theme provider props interface
 */
interface ThemeProviderProps {
  children: React.ReactNode;
}

// Create the theme context with default values
const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

/**
 * Theme provider component to manage theme state
 * @param {ThemeProviderProps} props - Provider props
 * @returns {JSX.Element} Theme provider component
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize theme from localStorage or system preference
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    
    if (savedTheme) {
      return savedTheme;
    }
    
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply theme class to document element
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove both classes and add the current theme
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Save theme to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const value = {
    theme,
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Custom hook to use the theme context
 * @returns {ThemeContextType} Theme context
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

export default ThemeContext;