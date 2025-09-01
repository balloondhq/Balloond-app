// Balloond Figma Design System
// Replace these with your actual Figma values

export const FigmaTheme = {
  // COLORS - Extract these from your Figma styles
  colors: {
    // Primary Brand Colors (from your Figma brand palette)
    primary: '#FF6B6B',        // Replace with your main color
    primaryLight: '#FFB3B3',   // Replace with your light variant
    primaryDark: '#E55555',    // Replace with your dark variant
    
    // Background Colors (from your Figma backgrounds)
    background: '#FFFFFF',     // Main background
    surface: '#F8F9FA',       // Card/surface color
    overlay: '#000000',       // Overlay color with opacity
    
    // Text Colors (from your Figma text styles)
    textPrimary: '#1A1A1A',   // Main text
    textSecondary: '#6C757D', // Secondary text
    textTertiary: '#ADB5BD',  // Light text
    
    // Accent Colors (from your Figma accent palette)
    accent: '#FF9F43',        // Accent/highlight color
    success: '#28A745',       // Success green
    warning: '#FFC107',       // Warning yellow
    error: '#DC3545',         // Error red
    
    // Balloon/Match Colors (from your balloon designs)
    balloon: '#FFE4E1',       // Balloon base color
    balloonActive: '#FF6B6B', // Active/popped balloon
    match: '#E91E63',         // Match indicator
  },
  
  // TYPOGRAPHY - Match your Figma text styles
  typography: {
    // Headings (from Figma heading styles)
    h1: {
      fontSize: 32,
      fontWeight: '800',
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 32,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
      letterSpacing: -0.2,
    },
    
    // Body Text (from Figma body styles)
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
      letterSpacing: 0,
    },
    bodyLarge: {
      fontSize: 18,
      fontWeight: '400',
      lineHeight: 28,
      letterSpacing: 0,
    },
    
    // Buttons (from Figma button styles)
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 24,
      letterSpacing: 0.5,
    },
    
    // Captions (from Figma small text styles)
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
      letterSpacing: 0.3,
    },
  },
  
  // SPACING - Match your Figma spacing system
  spacing: {
    xs: 4,    // Extra small
    sm: 8,    // Small  
    md: 16,   // Medium
    lg: 24,   // Large
    xl: 32,   // Extra large
    xxl: 48,  // Double extra large
    xxxl: 64, // Triple extra large
  },
  
  // BORDER RADIUS - From your Figma corner radius
  borderRadius: {
    sm: 8,     // Small radius
    md: 16,    // Medium radius  
    lg: 24,    // Large radius
    xl: 32,    // Extra large radius
    round: 999, // Fully rounded
  },
  
  // SHADOWS - Match your Figma drop shadows
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  
  // COMPONENT STYLES - From your Figma components
  components: {
    // Button Styles (from Figma button components)
    primaryButton: {
      height: 56,
      borderRadius: 28,
      backgroundColor: '#FF6B6B', // Your primary color
      paddingHorizontal: 32,
    },
    
    // Card Styles (from Figma card components)
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 24,
      // Add shadow from above
    },
    
    // Input Styles (from Figma input components)
    input: {
      height: 56,
      borderRadius: 28,
      backgroundColor: '#F8F9FA',
      borderWidth: 1,
      borderColor: '#E9ECEF',
      paddingHorizontal: 20,
    },
  },
};

// HOW TO USE:
// Import this file and use the values in your styles
// Example: backgroundColor: FigmaTheme.colors.primary
