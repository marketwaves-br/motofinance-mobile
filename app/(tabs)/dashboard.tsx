import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/theme';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { useAppStore } from '@/stores/app-store';
import { formatBRL, formatBRLNumber } from '@/lib/formatters/currency';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function DashboardScreen() {
  const { colors, spacing } = useTheme();
  const { userName } = useAppStore();
  const { data, refreshing, fetch, refresh } = useDashboardData();

  const { summary, goals, monthlyIncome, monthlyNet, monthComparison, dailyTarget, remainingDays } = data;

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const todayLabel = (() => {
    const now = new Date();
    const weekdays = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    return `${weekdays[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenTitle brandTitle />
      <ScrollView
        testID="dashboard-scroll"
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.muted }]}>
          Olá, <Text style={{ color: colors.text, fontWeight: 'bold' }}>{userName || 'Motorista Parceiro'}.</Text>
        </Text>
        <Text style={[styles.dateLabel, { color: colors.muted }]}>
          Resultado do dia — {todayLabel}
        </Text>
      </View>

      <AppCard style={styles.balanceCard}>
        <Text style={[styles.cardTitle, { color: colors.muted }]}>Lucro Líquido (R$)</Text>
        <Text
          testID="dashboard-net"
          style={[styles.cardAmount, { color: summary.net >= 0 ? colors.income : colors.expense }]}
        >
          {formatBRLNumber(summary.net)}
        </Text>
        {monthComparison && (
          <Text style={[styles.comparisonLine, { color: monthComparison.improved ? colors.income : colors.expense }]}>
            {monthComparison.improved ? '↑' : '↓'} {Math.abs(monthComparison.pct)}% vs {monthComparison.prevMonthName}
          </Text>
        )}
      </AppCard>

      <View style={styles.row}>
        <AppCard style={[styles.halfCard, { borderColor: colors.income, borderWidth: 1 }]}>
          <View style={styles.halfCardHeader}>
            <Ionicons name="arrow-up-circle" size={15} color={colors.income} />
            <Text style={[styles.halfCardLabel, { color: colors.muted }]}>Receitas (R$)</Text>
          </View>
          <Text testID="dashboard-income" style={[styles.cardValue, { color: colors.income }]} numberOfLines={1}>
            {formatBRLNumber(summary.incomes)}
          </Text>
        </AppCard>
        <AppCard style={[styles.halfCard, { borderColor: colors.expense, borderWidth: 1 }]}>
          <View style={styles.halfCardHeader}>
            <Ionicons name="arrow-down-circle" size={15} color={colors.expense} />
            <Text style={[styles.halfCardLabel, { color: colors.muted }]}>Despesas (R$)</Text>
          </View>
          <Text testID="dashboard-expense" style={[styles.cardValue, { color: colors.expense }]} numberOfLines={1}>
            {formatBRLNumber(summary.expenses)}
          </Text>
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
              const pct       = Math.min(100, Math.max(0, Math.round((row.current / row.goal) * 100)));
              const remaining = Math.max(0, row.goal - row.current);
              const color     = pct >= 100 ? colors.income : pct >= 75 ? '#E67E22' : colors.primary;
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

      {/* ── Meta Diária ───────────────────────────────────────── */}
      {dailyTarget !== null && (() => {
        const todayIncome  = summary.incomes;
        const pct          = dailyTarget === 0 ? 100 : Math.min(100, Math.round((todayIncome / dailyTarget) * 100));
        const goalMet      = pct >= 100;
        const color        = goalMet ? colors.income : pct >= 70 ? '#E67E22' : colors.primary;
        const remaining    = Math.max(0, dailyTarget - todayIncome);
        return (
          <AppCard style={styles.dailyCard}>
            <View style={styles.goalCardHeader}>
              <Ionicons name="today-outline" size={15} color={colors.primary} />
              <Text style={[styles.goalCardTitle, { color: colors.text }]}>Meta de Hoje</Text>
              <Text style={[styles.dailyDays, { color: colors.muted }]}>
                {remainingDays} {remainingDays === 1 ? 'dia restante' : 'dias restantes'}
              </Text>
            </View>
            <View style={styles.goalRowTop}>
              <Text style={[styles.goalLabel, { color: colors.muted }]}>Receita hoje</Text>
              <Text style={[styles.goalPct, { color }]}>{pct}%</Text>
            </View>
            <View style={[styles.goalBarTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.goalBarFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <View style={styles.goalRowBottom}>
              <Text style={[styles.goalAmount, { color: colors.text }]}>{formatBRL(todayIncome)}</Text>
              <Text style={[styles.goalRemaining, { color: goalMet ? colors.income : colors.muted }]}>
                {goalMet ? 'meta do dia atingida!' : `faltam ${formatBRL(remaining)}`}
              </Text>
              <Text style={[styles.goalAmount, { color: colors.muted }]}>{formatBRL(dailyTarget)}</Text>
            </View>
          </AppCard>
        );
      })()}

      {/* ── Botões de lançamento ──────────────────────────────── */}
      <View style={[styles.actionRow, { marginTop: 8 }]}>
        <AppButton
          testID="btn-add-income"
          title="Nova Receita"
          icon={<Ionicons name="add-circle" size={22} color="#fff" />}
          size="lg"
          style={styles.actionBtn}
          onPress={() => router.push('/(modals)/add-income')}
        />
        <AppButton
          testID="btn-add-expense"
          title="Nova Despesa"
          variant="danger"
          icon={<Ionicons name="remove-circle" size={22} color="#fff" />}
          size="lg"
          style={styles.actionBtn}
          onPress={() => router.push('/(modals)/add-expense')}
        />
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 16 },
  greeting: { fontSize: 18, fontWeight: '400' },
  dateLabel: { fontSize: 13, fontWeight: '300', fontStyle: 'italic', marginTop: 4, letterSpacing: 0.1 },
  balanceCard: { marginBottom: 8, alignItems: 'center', paddingVertical: 8 },
  cardTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  cardAmount: { fontSize: 34, fontWeight: 'bold' },
  cardValue: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 0 },
  halfCard:       { width: '48%', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  halfCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  halfCardLabel:  { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  comparisonLine: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, paddingVertical: 12, justifyContent: 'center' },
  goalCard:       { marginTop: 8, marginBottom: 0, paddingVertical: 8 },
  dailyCard:      { marginTop: 8, marginBottom: 0, paddingVertical: 8 },
  dailyDays:      { fontSize: 11, marginLeft: 'auto' },
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
