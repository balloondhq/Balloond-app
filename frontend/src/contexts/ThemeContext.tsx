/**
 * Theme Context
 * Manages app theme colors and styles
 */

import React, { createContext, useContext, ReactNode } from 'react';

const theme = {
  colors: {
    // Primary colors - bone/off-white/cream
    background: '#FAF7F2',
    surface: '#FFFFFF',
    card: '#FFF8F0',
    
    // Accent - ruby burgundy
    primary: '#8B0000',
    primaryLight: '#B22222',
    primaryDark: '#660000',
    
    // Text colors
    text: '#2C2C2C',
    textSecondary: '#666666',
    textLight: '#999999',
    
    // Utility colors
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#2196F3',
    
    // Balloon colors
    balloonDefault: '#FFE4E1',
    balloonPopped: '#F0E6E6',
    balloonHover: '#FFD4CC',
    
    // Borders and shadows
    border: '#E5E5E5',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999,
  },
  
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    small: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
  },
};

type ThemeType = typeof theme;

const ThemeContext = createContext<ThemeType>(theme);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export type { ThemeType };
