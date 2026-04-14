import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/theme';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';
import { useAppStore } from '@/stores/app-store';
import { formatBRL } from '@/lib/formatters/currency';

export default function DashboardScreen() {
  const { colors, spacing } = useTheme();
  const { userName } = useAppStore();
  const [summary, setSummary] = useState({ incomes: 0, expenses: 0, net: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = async () => {
    try {
      const data = await TransactionsRepository.getTodaySummary();
      setSummary(data);
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
    }
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
        <Text style={[styles.name, { color: colors.text }]}>{userName || 'Motorista Parceiro'}</Text>
      </View>

      <AppCard style={styles.balanceCard}>
        <Text style={[styles.cardTitle, { color: colors.muted }]}>Lucro Líquido</Text>
        <Text style={[styles.cardAmount, { color: summary.net >= 0 ? colors.income : colors.expense }]}>
          {formatBRL(summary.net)}
        </Text>

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
