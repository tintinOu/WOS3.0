import React, { createContext, useContext } from 'react';

/**
 * Theme Context - Dark Mode Only
 * Simplified context for dark-only theme
 */

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
    // Always dark mode
    const value = {
        theme: 'dark',
        isDark: true,
        isLight: false,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export default ThemeContext;
