import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAppStore } from '@/stores/app-store';
import { useTheme } from '@/theme';

export default function Index() {
  const { hasCompletedOnboarding, isOnboardingLoaded } = useAppStore();
  const { colors } = useTheme();

  // Aguardar até que o estado do onboarding seja carregado do SQLite
  // para evitar flash do onboarding em quem já completou
  if (!isOnboardingLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (hasCompletedOnboarding) {
    return <Redirect href="/(tabs)/dashboard" />;
  }
  return <Redirect href="/onboarding/welcome" />;
}
