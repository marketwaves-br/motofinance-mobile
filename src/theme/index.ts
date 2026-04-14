import { Colors } from '../constants/colors';
import { Spacing, Radius } from '../constants/spacing';
import { useColorScheme } from 'react-native';

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return {
    colors: theme,
    spacing: Spacing,
    radius: Radius,
    isDark: colorScheme === 'dark',
  };
};
