import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/theme';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';
import { GoalsRepository, MonthlyGoals } from '@/infrastructure/repositories/GoalsRepository';
import { useAppStore } from '@/stores/app-store';
import { formatBRL } from '@/lib/formatters/currency';

export default function DashboardScreen() {
  const { colors, spacing } = useTheme();
  const { userName } = useAppStore();
  const [summary, setSummary] = useState({ incomes: 0, expenses: 0, net: 0 });
  const [goals, setGoals] = useState<MonthlyGoals>({ income: null, net: null });
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyNet, setMonthlyNet] = useState(0);
  const [monthComparison, setMonthComparison] = useState<{ pct: number; prevMonthName: string; improved: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = async () => {
    try {
      const today = new Date();
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfToday   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      // Mesmo período do mês anterior (dias 1 → hoje, corrigido para o último dia do mês anterior)
      const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      const prevMonthDay       = Math.min(today.getDate(), lastDayOfPrevMonth);
      const firstOfPrevMonth   = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfPrevPeriod    = new Date(today.getFullYear(), today.getMonth() - 1, prevMonthDay, 23, 59, 59, 999);

      const [data, goalsData, monthData, prevMonthData] = await Promise.all([
        TransactionsRepository.getTodaySummary(),
        GoalsRepository.getMonthlyGoals(),
        TransactionsRepository.getReportData(firstOfMonth, endOfToday),
        TransactionsRepository.getReportData(firstOfPrevMonth, endOfPrevPeriod),
      ]);

      setSummary(data);
      setGoals(goalsData);
      setMonthlyIncome(monthData.totalIncomeCents);
      setMonthlyNet(monthData.netCents);

      // Comparativo: lucro líquido deste mês vs mesmo período do mês anterior
      if (prevMonthData.netCents !== 0) {
        const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
        const prevIdx = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
        const pct = Math.round(((monthData.netCents - prevMonthData.netCents) / Math.abs(prevMonthData.netCents)) * 100);
        setMonthComparison({ pct, prevMonthName: MONTHS[prevIdx], improved: pct >= 0 });
      } else {
        setMonthComparison(null);
      }
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
        {monthComparison && (
          <Text style={[styles.comparisonLine, { color: monthComparison.improved ? colors.income : colors.expense }]}>
            {monthComparison.improved ? '↑' : '↓'} {Math.abs(monthComparison.pct)}% vs {monthComparison.prevMonthName}
          </Text>
        )}
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

      {/* ── Meta do Mês ───────────────────────────────────────── */}
      {(goals.income !== null || goals.net !== null) && (() => {
        const rows: Array<{ label: string; current: number; goal: number }> = [];
        if (goals.income !== null && goals.income > 0)
          rows.push({ label: 'Receita',       current: monthlyIncome, goal: goals.income });
        if (goals.net !== null && goals.net > 0)
          rows.push({ label: 'Lucro Líquido', current: monthlyNet,    goal: goals.net });
        if (rows.length === 0) return null;

        return (
          <AppCard style={styles.goalCard}>
            <View style={styles.goalCardHeader}>
              <Ionicons name="flag-outline" size={15} color={colors.primary} />
              <Text style={[styles.goalCardTitle, { color: colors.text }]}>Meta do Mês</Text>
            </View>
            {rows.map(row => {
              const pct   = Math.min(100, Math.max(0, Math.round((row.current / row.goal) * 100)));
              const remaining = Math.max(0, row.goal - row.current);
              const color = pct >= 100 ? colors.income : pct >= 75 ? '#E67E22' : colors.primary;
              return (
                <View key={row.label} style={styles.goalRow}>
                  <View style={styles.goalRowTop}>
                    <Text style={[styles.goalLabel, { color: colors.muted }]}>{row.label}</Text>
                    <Text style={[styles.goalPct, { color }]}>{pct}%</Text>
                  </View>
                  <View style={[styles.goalBarTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.goalBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                  <View style={styles.goalRowBottom}>
                    <Text style={[styles.goalAmount, { color: colors.text }]}>{formatBRL(row.current)}</Text>
                    <Text style={[styles.goalRemaining, { color: colors.muted }]}>
                      {remaining > 0 ? `faltam ${formatBRL(remaining)}` : 'meta atingida!'}
                    </Text>
                    <Text style={[styles.goalAmount, { color: colors.muted }]}>{formatBRL(row.goal)}</Text>
                  </View>
                </View>
              );
            })}
          </AppCard>
        );
      })()}

      {/* Botões de lançamento */}
      <View style={[styles.actionRow, { marginTop: spacing.lg }]}>
        <AppButton
          title="Nova Receita"
          icon={<Ionicons name="add-circle" size={22} color="#fff" />}
          size="lg"
          style={styles.actionBtn}
          onPress={() => router.push('/(modals)/add-income')}
        />
        <AppButton
          title="Nova Despesa"
          variant="danger"
          icon={<Ionicons name="remove-circle" size={22} color="#fff" />}
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
  header: { marginTop: 20, marginBottom: 16 },
  greeting: { fontSize: 15, fontWeight: '500' },
  name: { fontSize: 24, fontWeight: 'bold', marginTop: 2 },
  balanceCard: { marginBottom: 12, alignItems: 'center', paddingVertical: 20 },
  cardTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  cardAmount: { fontSize: 34, fontWeight: 'bold' },
  cardValue: { fontSize: 20, fontWeight: 'bold', marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 0 },
  halfCard: { width: '48%', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8 },
  comparisonLine: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, paddingVertical: 14, justifyContent: 'center' },
  // Goal card
  goalCard:       { marginTop: 16, marginBottom: 0 },
  goalCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  goalCardTitle:  { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  goalRow:        { marginBottom: 10 },
  goalRowTop:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  goalLabel:      { fontSize: 12 },
  goalPct:        { fontSize: 12, fontWeight: '700' },
  goalBarTrack:   { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 5 },
  goalBarFill:    { height: 6, borderRadius: 3 },
  goalRowBottom:  { flexDirection: 'row', justifyContent: 'space-between' },
  goalAmount:     { fontSize: 11, fontWeight: '600' },
  goalRemaining:  { fontSize: 11 },
});
