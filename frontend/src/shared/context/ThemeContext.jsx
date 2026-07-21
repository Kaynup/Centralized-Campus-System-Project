import { createContext, useContext, useEffect } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  useEffect(() => {
    // Always force the entire application to light mode.
    // This prevents browser/OS dark mode from affecting the app.
    document.documentElement.setAttribute("data-theme", "light");

    // Keep the saved preference consistent
    localStorage.setItem("campus_theme", "light");
  }, []);

  const toggleTheme = () => {
    // Dark mode is intentionally disabled.
    return;
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode: false,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}