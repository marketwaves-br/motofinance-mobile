import os

files = {
    "src/stores/app-store.ts": """import { create } from 'zustand';

interface AppState {
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  isLoading: boolean;
  setLoading: (val: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  hasCompletedOnboarding: false,
  completeOnboarding: () => set({ hasCompletedOnboarding: true }),
  isLoading: false,
  setLoading: (val) => set({ isLoading: val }),
}));
""",
    "app/index.tsx": """import { Redirect } from 'expo-router';
import { useAppStore } from '@/stores/app-store';

export default function Index() {
  const { hasCompletedOnboarding } = useAppStore();

  if (hasCompletedOnboarding) {
    return <Redirect href="/(tabs)/dashboard" />;
  }
  return <Redirect href="/onboarding/welcome" />;
}
""",
    "app/(tabs)/_layout.tsx": """import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.icon,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Resumo',
          tabBarIcon: ({ color }) => <Ionicons name="pie-chart" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="entries"
        options={{
          title: 'Lançamentos',
          tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color }) => <Ionicons name="bar-chart" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
""",
    "app/(tabs)/dashboard.tsx": """import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/theme';
import { AppCard } from '@/components/ui/AppCard';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const { colors, spacing } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.muted }]}>Bom dia,</Text>
        <Text style={[styles.name, { color: colors.text }]}>Motorista Parceiro</Text>
      </View>

      <AppCard style={styles.balanceCard}>
        <Text style={[styles.cardTitle, { color: colors.muted }]}>Lucro Líquido Hoje</Text>
        <Text style={[styles.cardAmount, { color: colors.primary }]}>R$ 145,50</Text>
        <Text style={{color: colors.muted, marginTop: 8, fontSize: 13}}>+12% em relação a ontem</Text>
      </AppCard>

      <View style={styles.row}>
        <AppCard style={[styles.halfCard, { borderColor: colors.income, borderWidth: 1 }]}>
          <Ionicons name="arrow-up-circle-outline" size={24} color={colors.income} style={{marginBottom: 8}} />
          <Text style={[styles.cardTitle, { color: colors.muted }]}>Receitas</Text>
          <Text style={[styles.cardValue, { color: colors.income }]}>R$ 220,00</Text>
        </AppCard>
        <AppCard style={[styles.halfCard, { borderColor: colors.expense, borderWidth: 1 }]}>
           <Ionicons name="arrow-down-circle-outline" size={24} color={colors.expense} style={{marginBottom: 8}} />
          <Text style={[styles.cardTitle, { color: colors.muted }]}>Despesas</Text>
          <Text style={[styles.cardValue, { color: colors.expense }]}>R$ 74,50</Text>
        </AppCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginTop: 40, marginBottom: 24 },
  greeting: { fontSize: 16, fontWeight: '500' },
  name: { fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  balanceCard: { marginBottom: 16, alignItems: 'center', paddingVertical: 40 },
  cardTitle: { fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  cardAmount: { fontSize: 42, fontWeight: 'bold' },
  cardValue: { fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCard: { width: '48%', alignItems: 'center', paddingVertical: 24 }
});
""",
    "app/(tabs)/entries.tsx": """import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

export default function EntriesScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.text, fontSize: 20 }}>Lançamentos e Extrato</Text>
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', alignItems: 'center'} });
""",
    "app/(tabs)/reports.tsx": """import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

export default function ReportsScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.text, fontSize: 20 }}>Relatórios e Gráficos</Text>
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', alignItems: 'center'} });
""",
    "app/(tabs)/settings.tsx": """import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

export default function SettingsScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.text, fontSize: 20 }}>Painel de Configurações</Text>
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', alignItems: 'center'} });
""",
    "app/onboarding/welcome.tsx": """import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen() {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="wallet-outline" size={56} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>MotoFinance</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Controle financeiro ágil para quem trabalha nas ruas. Descubra seu lucro real no fim do dia.
        </Text>
      </View>
      <View style={styles.footer}>
        <AppButton 
          title="Começar Agora" 
          size="lg" 
          icon={<Ionicons name="arrow-forward" size={20} color="#fff" />}
          onPress={() => router.push('/onboarding/profile')} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconBox: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 32, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 36, fontWeight: 'bold', marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 18, textAlign: 'center', lineHeight: 28 },
  footer: { padding: 32, paddingBottom: 48 }
});
""",
    "app/onboarding/profile.tsx": """import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { useTheme } from '@/theme';
// Importação do estado global para redirecionamento inteligente
import { useAppStore } from '@/stores/app-store';

export default function ProfileScreen() {
  const { colors, spacing } = useTheme();
  const { completeOnboarding } = useAppStore();

  const handleFinish = () => {
    // Simulando finalização do fluxo e salvamento. 
    completeOnboarding();
    // Redireciona de volta para a raiz para engatar na validação do Dashboard
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: 80 }}>
        <Text style={[styles.title, { color: colors.text }]}>Conte sobre você</Text>
        <Text style={[styles.subtitle, { color: colors.muted, marginBottom: spacing.xl }]}>
          Defina seu perfil básico para iniciarmos o MotoFinance de forma configurada.
        </Text>

        <AppInput label="Como devemos te chamar?" placeholder="Ex: João, Motorista..." />
        <AppInput label="O que você faz predominantemente?" placeholder="Ex: Uber, iFood, Motofrete" />
        <AppInput label="Moeda Padrão" placeholder="Ex: BRL" value="BRL" editable={false} />

        <View style={{ marginTop: spacing.xl }}>
          <AppButton 
            title="Salvar e Ir para Painel" 
            size="lg" 
            onPress={handleFinish} 
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, lineHeight: 24 }
});
"""
}

for path, content in files.items():
    full_path = os.path.join("d:/MotoFinance/motofinance-mobile", path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Phase 3 generated.")
