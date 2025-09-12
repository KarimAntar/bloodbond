/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors: Record<'light' | 'dark', {
  [key: string]: string;
}> = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    
    // Extended colors for comprehensive theming
    primary: '#E53E3E',
    secondary: '#3182CE',
    success: '#38A169',
    warning: '#F56500',
    danger: '#DC2626',
    info: '#10B981',
    purple: '#8B5CF6',
    
    // Background colors
    screenBackground: '#f8f9fa',
    cardBackground: '#fff',
    sectionBackground: '#f8f9fa',
    modalBackground: '#fff',
    
    // Text colors
    primaryText: '#1a1a1a',
    secondaryText: '#666',
    subtitleText: '#666',
    placeholderText: '#999',
    linkText: '#3182CE',
    
    // Border colors
    border: '#f0f0f0',
    inputBorder: '#e1e5e9',
    
    // Other UI colors
    shadow: '#000',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    
    // Extended colors for comprehensive theming
    primary: '#E53E3E',
    secondary: '#4A90E2',
    success: '#48BB78',
    warning: '#ED8936',
    danger: '#F56565',
    info: '#38B2AC',
    purple: '#9F7AEA',
    
    // Background colors
    screenBackground: '#1a1a1a',
    cardBackground: '#2d2d2d',
    sectionBackground: '#1a1a1a',
    modalBackground: '#2d2d2d',
    
    // Text colors
    primaryText: '#ECEDEE',
    secondaryText: '#A0A0A0',
    subtitleText: '#A0A0A0',
    placeholderText: '#666',
    linkText: '#4A90E2',
    
    // Border colors
    border: '#404040',
    inputBorder: '#404040',
    
    // Other UI colors
    shadow: '#000',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
};
