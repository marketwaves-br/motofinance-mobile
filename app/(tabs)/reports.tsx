import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';
import { formatBRL } from '@/lib/formatters/currency';
import { AppCard } from '@/components/ui/AppCard';

type Period = 'today' | 'week' | 'month';

type ReportData = {
  totalIncomeCents: number;
  totalExpenseCents: number;
  netCents: number;
  bySource: Array<{ id: string; name: string; color: string | null; totalCents: number }>;
  byCategory: Array<{ id: string; name: string; color: string | null; totalCents: number }>;
};

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoje',
  week: 'Semana',
  month: 'Mês',
};

export default function ReportsScreen() {
  const { colors, spacing } = useTheme();
  const [period, setPeriod] = useState<Period>('month');
  const [report, setReport] = useState<ReportData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReport = async (p: Period) => {
    try {
      const data = await TransactionsRepository.getReportData(p);
      setReport(data);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReport(period);
    }, [period])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReport(period);
    setRefreshing(false);
  };

  const hasData = report && (report.totalIncomeCents > 0 || report.totalExpenseCents > 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header fixo */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Relatórios</Text>
        <Text style={[styles.headerSubtitle, { color: colors.muted }]}>Desempenho financeiro</Text>

        {/* Seletor de período */}
        <View style={styles.pillRow}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => {
            const isActive = period === p;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surface,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.pillText, { color: isActive ? '#fff' : colors.muted }]}>
                  {PERIOD_LABELS[p]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Card lucro líquido */}
        <AppCard style={styles.netCard}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Lucro Líquido</Text>
          <Text
            style={[
              styles.netAmount,
              { color: report && report.netCents >= 0 ? colors.income : colors.expense },
            ]}
          >
            {formatBRL(report?.netCents ?? 0)}
          </Text>
        </AppCard>

        {/* Cards receita + despesa */}
        <View style={styles.row}>
          <AppCard style={[styles.halfCard, { borderColor: colors.income, borderWidth: 1 }]}>
            <Ionicons name="arrow-up-circle-outline" size={22} color={colors.income} style={{ marginBottom: 6 }} />
            <Text style={[styles.cardLabel, { color: colors.muted }]}>Receitas</Text>
            <Text style={[styles.halfAmount, { color: colors.income }]}>
              {formatBRL(report?.totalIncomeCents ?? 0)}
            </Text>
          </AppCard>
          <AppCard style={[styles.halfCard, { borderColor: colors.expense, borderWidth: 1 }]}>
            <Ionicons name="arrow-down-circle-outline" size={22} color={colors.expense} style={{ marginBottom: 6 }} />
            <Text style={[styles.cardLabel, { color: colors.muted }]}>Despesas</Text>
            <Text style={[styles.halfAmount, { color: colors.expense }]}>
              {formatBRL(report?.totalExpenseCents ?? 0)}
            </Text>
          </AppCard>
        </View>

        {!hasData ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={56} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum dado neste período</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Adicione receitas e despesas para{'\n'}visualizar os relatórios.
            </Text>
          </View>
        ) : (
          <>
            {/* Receitas por fonte */}
            {report!.bySource.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Receitas por Fonte</Text>
                {report!.bySource.map(item => {
                  const pct = Math.round((item.totalCents / report!.totalIncomeCents) * 100);
                  return (
                    <View key={item.id} style={[styles.breakdownItem, { borderBottomColor: colors.border }]}>
                      <View style={styles.breakdownHeader}>
                        <View style={[styles.dot, { backgroundColor: item.color ?? colors.income }]} />
                        <Text style={[styles.breakdownName, { color: colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.breakdownAmount, { color: colors.income }]}>
                          {formatBRL(item.totalCents)}
                        </Text>
                      </View>
                      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.income }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Despesas por categoria */}
            {report!.byCategory.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Despesas por Categoria</Text>
                {report!.byCategory.map(item => {
                  const pct = Math.round((item.totalCents / report!.totalExpenseCents) * 100);
                  return (
                    <View key={item.id} style={[styles.breakdownItem, { borderBottomColor: colors.border }]}>
                      <View style={styles.breakdownHeader}>
                        <View style={[styles.dot, { backgroundColor: item.color ?? colors.expense }]} />
                        <Text style={[styles.breakdownName, { color: colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.breakdownAmount, { color: colors.expense }]}>
                          {formatBRL(item.totalCents)}
                        </Text>
                      </View>
                      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.expense }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 14, fontWeight: '600' },
  netCard: { marginBottom: 16, alignItems: 'center', paddingVertical: 32 },
  cardLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  netAmount: { fontSize: 36, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  halfCard: { width: '48%', alignItems: 'center', paddingVertical: 20 },
  halfAmount: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  breakdownItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  breakdownName: { flex: 1, fontSize: 15, fontWeight: '500' },
  breakdownAmount: { fontSize: 15, fontWeight: '700' },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
