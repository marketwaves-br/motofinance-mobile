import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { initDatabase } from '@/infrastructure/db/sqlite';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { useAppStore } from '@/stores/app-store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dbIsReady, setDbIsReady] = useState(false);
  const { colors } = useTheme();
  const loadOnboardingState = useAppStore((s) => s.loadOnboardingState);
  const loadUserProfile = useAppStore((s) => s.loadUserProfile);

  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        // Hidratar Zustand com dados persistidos no SQLite
        await loadOnboardingState();
        await loadUserProfile();
      } catch (e) {
        console.error("Database initialization failed:", e);
      } finally {
        setDbIsReady(true);
        await SplashScreen.hideAsync();
      }
    }
    setup();
  }, []);

  if (!dbIsReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: colors.background }} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'MotoFinance', headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/welcome" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/profile" options={{ headerShown: false }} />
        <Stack.Screen name="(modals)/add-income" options={{ presentation: 'modal', title: 'Adicionar Receita', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
        <Stack.Screen name="(modals)/add-expense" options={{ presentation: 'modal', title: 'Adicionar Despesa', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
        <Stack.Screen name="(modals)/manage-sources" options={{ presentation: 'modal', title: 'Empresas & Fontes', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
        <Stack.Screen name="(modals)/manage-categories" options={{ presentation: 'modal', title: 'Categorias de Despesa', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
        <Stack.Screen name="(modals)/manage-goals" options={{ presentation: 'modal', title: 'Metas Mensais', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
