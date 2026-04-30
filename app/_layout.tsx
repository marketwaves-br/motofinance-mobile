import { useEffect, useState, Component, ReactNode } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { initDatabase } from '@/infrastructure/db/sqlite';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { requestNotificationPermissions, scheduleReminder } from '@/lib/notifications';
import { generatePendingTransactions } from '@/lib/recurringGenerator';
import { useTheme } from '@/theme';
import { useAppStore } from '@/stores/app-store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryState { hasError: boolean; error: Error | null }

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={eb.container}>
          <Text style={eb.emoji}>⚠️</Text>
          <Text style={eb.title}>Algo deu errado</Text>
          <Text style={eb.message}>{this.state.error?.message ?? 'Erro desconhecido'}</Text>
          <TouchableOpacity
            style={eb.btn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={eb.btnText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#fff' },
  emoji:     { fontSize: 48, marginBottom: 16 },
  title:     { fontSize: 20, fontWeight: '700', marginBottom: 8, color: '#1e293b' },
  message:   { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  btn:       { backgroundColor: '#10B981', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [dbIsReady, setDbIsReady] = useState(false);
  const { colors } = useTheme();
  const loadOnboardingState   = useAppStore((s) => s.loadOnboardingState);
  const loadUserProfile       = useAppStore((s) => s.loadUserProfile);
  const loadThemePreference      = useAppStore((s) => s.loadThemePreference);
  const loadNotificationSettings = useAppStore((s) => s.loadNotificationSettings);

  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        // Hidratar Zustand com dados persistidos no SQLite
        await loadThemePreference();
        await loadNotificationSettings();
        await loadOnboardingState();
        await loadUserProfile();
      } catch (e) {
        console.error("Database initialization failed:", e);
      } finally {
        // Esconde a splash do Expo imediatamente → nossa ImageBackground assume
        await SplashScreen.hideAsync();

        // Tarefas não-críticas em paralelo (não bloqueiam a splash)
        generatePendingTransactions().catch(err =>
          console.error('[startup] Erro ao gerar recorrentes:', err)
        );
        requestNotificationPermissions().then(granted => {
          if (granted) {
            const store = useAppStore.getState();
            if (store.notificationsEnabled) scheduleReminder(store.reminderTime);
          }
        }).catch(err => console.error('[startup] Erro notificações:', err));

        // TODO: remover delay — apenas para avaliar a splash screen
        await new Promise(resolve => setTimeout(resolve, 3000));

        setDbIsReady(true);
      }
    }
    setup();
  }, []);

  if (!dbIsReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ImageBackground
          source={require('../assets/brand/splash-screen.png')}
          style={{ flex: 1 }}
          resizeMode="cover"
        />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppErrorBoundary>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'MotoFinance', headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/welcome" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/profile" options={{ headerShown: false }} />
        <Stack.Screen name="(modals)/add-income" options={{ presentation: 'modal', title: 'Adicionar Receita', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
        <Stack.Screen name="(modals)/add-expense" options={{ presentation: 'modal', title: 'Adicionar Despesa', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
        <Stack.Screen name="(modals)/manage-profile" options={{ presentation: 'modal', title: 'Meus Dados', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
        <Stack.Screen name="(modals)/manage-sources" options={{ presentation: 'modal', title: 'Fontes de Receitas', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
        <Stack.Screen name="(modals)/manage-categories" options={{ presentation: 'modal', title: 'Categorias de Despesa', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
        <Stack.Screen name="(modals)/manage-goals" options={{ presentation: 'modal', title: 'Metas Mensais', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
        <Stack.Screen name="(modals)/manage-recurring" options={{ presentation: 'modal', title: 'Lançamentos Recorrentes', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      </Stack>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}
