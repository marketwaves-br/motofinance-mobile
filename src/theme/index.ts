import { Colors } from '../constants/colors';
import { Spacing, Radius } from '../constants/spacing';
import { useColorScheme } from 'react-native';
import { useAppStore } from '@/stores/app-store';

export const useTheme = () => {
  const systemScheme  = useColorScheme();
  const preference    = useAppStore((s) => s.themePreference);

  const effectiveScheme =
    preference === 'system' ? (systemScheme ?? 'light') : preference;

  const theme = effectiveScheme === 'dark' ? Colors.dark : Colors.light;

  return {
    colors:          theme,
    spacing:         Spacing,
    radius:          Radius,
    isDark:          effectiveScheme === 'dark',
    themePreference: preference,
  };
};
