import os

files = {
    "src/infrastructure/repositories/TransactionsRepository.ts": """import { getDatabase } from '@/infrastructure/db/sqlite';
import * as Crypto from 'expo-crypto';

export class TransactionsRepository {
  // Utility for getting the start and end of today in ISO UTC
  private static getTodayISO() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start: today.toISOString(), end: end.toISOString() };
  }

  static async getTodaySummary() {
    const db = await getDatabase();
    const { start, end } = this.getTodayISO();

    const incRes = await db.getAllAsync<{total: number}>(
      `SELECT SUM(amount_cents) as total FROM incomes WHERE received_at BETWEEN ? AND ?`,
      [start, end]
    );
    const expRes = await db.getAllAsync<{total: number}>(
      `SELECT SUM(amount_cents) as total FROM expenses WHERE spent_at BETWEEN ? AND ?`,
      [start, end]
    );

    const totalIncomes = incRes[0]?.total || 0;
    const totalExpenses = expRes[0]?.total || 0;

    return {
      incomes: totalIncomes,
      expenses: totalExpenses,
      net: totalIncomes - totalExpenses
    };
  }

  static async getIncomeSources() {
    const db = await getDatabase();
    return db.getAllAsync<{id: string, name: string}>('SELECT id, name FROM income_sources WHERE is_active = 1');
  }

  static async getExpenseCategories() {
    const db = await getDatabase();
    return db.getAllAsync<{id: string, name: string}>('SELECT id, name FROM expense_categories WHERE is_active = 1');
  }

  static async addIncome(sourceId: string, amountCents: number) {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO incomes (id, source_id, amount_cents, received_at, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, sourceId, amountCents, now, now, now]
    );
  }

  static async addExpense(categoryId: string, amountCents: number) {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO expenses (id, category_id, amount_cents, spent_at, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, categoryId, amountCents, now, now, now]
    );
  }
}
""",
    "app/(modals)/add-income.tsx": """import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { useTheme } from '@/theme';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';

export default function AddIncomeModal() {
  const { colors, spacing } = useTheme();
  const [amount, setAmount] = useState('');
  const [sources, setSources] = useState<{id: string, name: string}[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);

  useEffect(() => {
    TransactionsRepository.getIncomeSources().then(setSources);
  }, []);

  const handleSave = async () => {
    if (!amount || !selectedSource) {
      Alert.alert('Atenção', 'Preencha o valor e selecione a fonte (ex: Uber).');
      return;
    }
    const cents = parseInt(amount.replace(/\D/g, ''), 10) || 0;
    if (cents <= 0) return;

    await TransactionsRepository.addIncome(selectedSource, cents);
    router.back();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={[styles.title, { color: colors.text }]}>Nova Receita</Text>

      <AppInput 
        label="Valor (Apenas números e centavos. Ex: 5000 para R$50,00)" 
        placeholder="Ex: 50.00" 
        keyboardType="numeric" 
        value={amount}
        onChangeText={setAmount}
        autoFocus
      />

      <Text style={[styles.label, { color: colors.text, marginTop: spacing.md }]}>De qual App de rua?</Text>
      <View style={styles.grid}>
        {sources.map(src => (
          <AppButton 
            key={src.id}
            title={src.name}
            variant={selectedSource === src.id ? 'primary' : 'outline'}
            onPress={() => setSelectedSource(src.id)}
            style={styles.gridItem}
          />
        ))}
      </View>

      <AppButton title="Adicionar Receita" size="lg" onPress={handleSave} style={{ marginTop: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { marginBottom: 8, paddingHorizontal: 16 }
});
""",
    "app/(modals)/add-expense.tsx": """import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { useTheme } from '@/theme';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';

export default function AddExpenseModal() {
  const { colors, spacing } = useTheme();
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  useEffect(() => {
    TransactionsRepository.getExpenseCategories().then(setCategories);
  }, []);

  const handleSave = async () => {
    if (!amount || !selectedCat) {
      Alert.alert('Atenção', 'Preencha o valor e selecione a categoria de gasto.');
      return;
    }
    const cents = parseInt(amount.replace(/\D/g, ''), 10) || 0;
    if (cents <= 0) return;

    await TransactionsRepository.addExpense(selectedCat, cents);
    router.back();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={[styles.title, { color: colors.text }]}>Nova Despesa</Text>

      <AppInput 
        label="Valor Gasto (Ex: 2500 para R$ 25,00)" 
        placeholder="Ex: 25.00" 
        keyboardType="numeric" 
        value={amount}
        onChangeText={setAmount}
        autoFocus
      />

      <Text style={[styles.label, { color: colors.text, marginTop: spacing.md }]}>Categoria</Text>
      <View style={styles.grid}>
        {categories.map(cat => (
          <AppButton 
            key={cat.id}
            title={cat.name}
            variant={selectedCat === cat.id ? 'danger' : 'outline'}
            onPress={() => setSelectedCat(cat.id)}
            style={styles.gridItem}
          />
        ))}
      </View>

      <AppButton title="Registrar Saída" variant="danger" size="lg" onPress={handleSave} style={{ marginTop: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { marginBottom: 8, paddingHorizontal: 16 }
});
""",
    "app/(tabs)/dashboard.tsx": """import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/theme';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';

const formatBRL = (cents: number) => {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export default function DashboardScreen() {
  const { colors, spacing } = useTheme();
  const [summary, setSummary] = useState({ incomes: 0, expenses: 0, net: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = async () => {
    const data = await TransactionsRepository.getTodaySummary();
    setSummary(data);
  };

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSummary();
    setRefreshing(false);
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.muted }]}>Resumo de Hoje,</Text>
        <Text style={[styles.name, { color: colors.text }]}>Motorista Parceiro</Text>
      </View>

      <AppCard style={styles.balanceCard}>
        <Text style={[styles.cardTitle, { color: colors.muted }]}>Lucro Líquido</Text>
        <Text style={[styles.cardAmount, { color: summary.net >= 0 ? colors.income : colors.expense }]}>
          {formatBRL(summary.net)}
        </Text>
        <Text style={{color: colors.muted, marginTop: 8, fontSize: 13}}>Valores reais salvos no MotoFinance DB</Text>
      </AppCard>

      <View style={styles.row}>
        <AppCard style={[styles.halfCard, { borderColor: colors.income, borderWidth: 1 }]}>
          <Ionicons name="arrow-up-circle-outline" size={24} color={colors.income} style={{marginBottom: 8}} />
          <Text style={[styles.cardTitle, { color: colors.muted }]}>Receitas</Text>
          <Text style={[styles.cardValue, { color: colors.income }]}>{formatBRL(summary.incomes)}</Text>
        </AppCard>
        <AppCard style={[styles.halfCard, { borderColor: colors.expense, borderWidth: 1 }]}>
           <Ionicons name="arrow-down-circle-outline" size={24} color={colors.expense} style={{marginBottom: 8}} />
          <Text style={[styles.cardTitle, { color: colors.muted }]}>Despesas</Text>
          <Text style={[styles.cardValue, { color: colors.expense }]}>{formatBRL(summary.expenses)}</Text>
        </AppCard>
      </View>

      {/* Acesso Rápido - Botões Fixos Superiores */}
      <Text style={[styles.actionsLabel, { color: colors.text, marginTop: spacing.xl }]}>Caixa Rápido (Hoje)</Text>
      <View style={styles.actionRow}>
        <AppButton 
          title="Nova Receita (Ganho)" 
          icon={<Ionicons name="add-circle" size={26} color="#fff" />}
          size="lg" 
          style={styles.actionBtn}
          onPress={() => router.push('/(modals)/add-income')} 
        />
        <AppButton 
          title="Nova Despesa (Custo)" 
          variant="danger"
          icon={<Ionicons name="remove-circle" size={26} color="#fff" />}
          size="lg" 
          style={styles.actionBtn}
          onPress={() => router.push('/(modals)/add-expense')} 
        />
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
  halfCard: { width: '48%', alignItems: 'center', paddingVertical: 24, paddingHorizontal: 8 },
  actionsLabel: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  actionRow: { flexDirection: 'column', gap: 16 },
  actionBtn: { paddingVertical: 22, justifyContent: 'flex-start' }
});
""",
    "app/_layout.tsx": """import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { initDatabase } from '@/infrastructure/db/sqlite';
import { View } from 'react-native';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dbIsReady, setDbIsReady] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        setDbIsReady(true);
      } catch (e) {
        console.error("Database initialization failed:", e);
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    setup();
  }, []);

  if (!dbIsReady) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'MotoFinance', headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/welcome" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding/profile" options={{ headerShown: false }} />
      <Stack.Screen name="(modals)/add-income" options={{ presentation: 'modal', title: 'Adicionar Receita', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
      <Stack.Screen name="(modals)/add-expense" options={{ presentation: 'modal', title: 'Adicionar Despesa', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />
    </Stack>
  );
}
"""
}

for path, content in files.items():
    full_path = os.path.join("d:/MotoFinance/motofinance-mobile", path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Phase 4 successfully built.")
