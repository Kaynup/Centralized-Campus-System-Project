/**
 * ThemeContext — Light / Dark mode manager
 *
 * Reads initial preference from localStorage (key: campus_theme).
 * Falls back to 'dark' if nothing is stored.
 * Applies `data-theme` attribute to `document.documentElement` so
 * the CSS variable overrides in theme.css take effect globally.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('campus_theme') || 'dark';
  });

  // Apply data-theme to <html> and persist whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('campus_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
