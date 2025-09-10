// app/hooks/useThemeColor.tsx
import { useColorScheme } from 'react-native';

export const useThemeColor = () => {
  const colorScheme = useColorScheme(); // Using React Native's useColorScheme hook
  const colors = {
    light: {
      text: '#000',
      background: '#fff',
    },
    dark: {
      text: '#fff',
      background: '#000',
    },
  };

  return colors[colorScheme || 'light']; // Return the theme colors based on the color scheme
};
