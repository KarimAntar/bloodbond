import { useColorScheme as useSystemColorScheme } from 'react-native';

export const useColorScheme = () => {
  const systemColorScheme = useSystemColorScheme();
  return systemColorScheme; // Returns either 'light' or 'dark'
};

export default useColorScheme;
