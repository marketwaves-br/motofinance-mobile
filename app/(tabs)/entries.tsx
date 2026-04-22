import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';
import { formatBRL } from '@/lib/formatters/currency';
import type { UnifiedTransaction, TransactionSection } from '@/types/transaction';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'income' | 'expense';

interface MonthSection {
  monthKey: string;       // "2026-04"
  title: string;          // "Abril 2026"
  incomeCents: number;
  expenseCents: number;
  days: TransactionSection[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_BR = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const buildMonthSections = (
  sections: TransactionSection[],
  filter: FilterType
): MonthSection[] => {
  const monthMap = new Map<string, MonthSection>();

  for (const day of sections) {
    const filtered = filter === 'all'
      ? day.data
      : day.data.filter(t => t.type === filter);

    if (filtered.length === 0) continue;

    const monthKey = day.dateKey.slice(0, 7); // "2026-04"

    if (!monthMap.has(monthKey)) {
      const [year, month] = monthKey.split('-').map(Number);
      monthMap.set(monthKey, {
        monthKey,
        title: `${MONTHS_BR[month - 1]} ${year}`,
        incomeCents: 0,
        expenseCents: 0,
        days: [],
      });
    }

    const section = monthMap.get(monthKey)!;
    section.days.push({ ...day, data: filtered });
    for (const t of filtered) {
      if (t.type === 'income') section.incomeCents += t.amountCents;
      else section.expenseCents += t.amountCents;
    }
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, m]) => m);
};

const currentMonthKey = (): string =>
  new Date().toLocaleDateString('en-CA').slice(0, 7);

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EntriesScreen() {
  const { colors, spacing, radius } = useTheme();

  const [sections, setSections]     = useState<TransactionSection[]>([]);
  const [filter, setFilter]         = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading]   = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
    () => new Set([currentMonthKey()])
  );

  const fetchHistory = async () => {
    try {
      const data = await TransactionsRepository.getTransactionHistory();
      setSections(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchHistory(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  const monthSections = useMemo(
    () => buildMonthSections(sections, filter),
    [sections, filter]
  );

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      next.has(monthKey) ? next.delete(monthKey) : next.add(monthKey);
      return next;
    });
  };

  // ── Ações sobre transação ──────────────────────────────────────────────────

  const confirmDelete = (item: UnifiedTransaction) => {
    const typeLabel = item.type === 'income' ? 'receita' : 'despesa';
    Alert.alert(
      'Excluir lançamento?',
      `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} de ${formatBRL(item.amountCents)} (${item.label}).\n\nEssa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await TransactionsRepository.deleteTransaction(item.id, item.type);
            await fetchHistory();
          },
        },
      ]
    );
  };

  const handleLongPress = (item: UnifiedTransaction) => {
    const typeLabel = item.type === 'income' ? 'Receita' : 'Despesa';
    Alert.alert(
      `${typeLabel} · ${formatBRL(item.amountCents)}`,
      item.label,
      [
        {
          text: 'Editar',
          onPress: () =>
            router.push({
              pathname: item.type === 'income'
                ? '/(modals)/add-income'
                : '/(modals)/add-expense',
              params: {
                id: item.id,
                amountCents: String(item.amountCents),
                refId: item.refId,
                dateISO: item.date,
                notes: item.notes ?? '',
              },
            }),
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => confirmDelete(item),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  // ── Render de transação ────────────────────────────────────────────────────

  const renderTransaction = (item: UnifiedTransaction) => {
    const isIncome = item.type === 'income';
    const amountColor = isIncome ? colors.income : colors.expense;
    const sign = isIncome ? '+' : '-';
    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.7}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={400}
      >
        <View style={[styles.transactionRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: `${amountColor}18` }]}>
            <Ionicons
              name={isIncome ? 'arrow-up-circle' : 'arrow-down-circle'}
              size={22}
              color={amountColor}
            />
          </View>
          <View style={styles.labelContainer}>
            <Text style={[styles.transactionLabel, { color: colors.text }]} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={[styles.transactionTime, { color: colors.muted }]}>
              {new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {item.notes ? ` · ${item.notes}` : ''}
            </Text>
          </View>
          <Text style={[styles.transactionAmount, { color: amountColor }]}>
            {sign} {formatBRL(item.amountCents)}
          </Text>
          {item.color && (
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filterColor = (f: FilterType) =>
    f === 'income' ? colors.income : f === 'expense' ? colors.expense : colors.primary;

  const hasData = monthSections.length > 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Lançamentos</Text>

        {/* Filtros */}
        <View style={styles.filterRow}>
          {(['all', 'income', 'expense'] as FilterType[]).map(f => {
            const labels: Record<FilterType, string> = {
              all: 'Tudo',
              income: '↑ Receitas',
              expense: '↓ Despesas',
            };
            const isActive = filter === f;
            const fc = filterColor(f);
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterPill, {
                  backgroundColor: isActive ? fc : colors.surface,
                  borderColor:     isActive ? fc : colors.border,
                }]}
              >
                <Text style={[styles.filterPillText, { color: isActive ? '#fff' : colors.muted }]}>
                  {labels[f]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {hasData && (
          <View style={styles.hintRow}>
            <Ionicons name="information-circle-outline" size={14} color="#E67E22" />
            <Text style={[styles.hintText, { color: colors.icon }]}>
              Segure um item para editar ou excluir
            </Text>
          </View>
        )}
      </View>

      {/* Lista */}
      <ScrollView
        contentContainerStyle={[
          { paddingHorizontal: spacing.lg, paddingBottom: 100, paddingTop: 8 },
          !hasData && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {!hasData && !isLoading ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {filter === 'all'
                ? 'Nenhum lançamento encontrado'
                : `Nenhuma ${filter === 'income' ? 'receita' : 'despesa'} encontrada`}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              {filter === 'all'
                ? 'Adicione receitas e despesas pelo\ndashboard para vê-las aqui.'
                : 'Tente selecionar "Tudo" para ver\ntodos os lançamentos.'}
            </Text>
          </View>
        ) : (
          monthSections.map(month => {
            const isExpanded = expandedMonths.has(month.monthKey);
            const net = month.incomeCents - month.expenseCents;
            const netColor = net >= 0 ? colors.income : colors.expense;

            return (
              <View key={month.monthKey} style={styles.monthSection}>

                {/* Cabeçalho do mês */}
                <TouchableOpacity
                  onPress={() => toggleMonth(month.monthKey)}
                  activeOpacity={0.75}
                  style={[styles.monthHeader, {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderBottomLeftRadius:  isExpanded ? 0 : radius.md,
                    borderBottomRightRadius: isExpanded ? 0 : radius.md,
                    borderTopLeftRadius:  radius.md,
                    borderTopRightRadius: radius.md,
                  }]}
                >
                  <View style={styles.monthHeaderLeft}>
                    <Ionicons
                      name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                      size={15}
                      color={colors.muted}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.monthTitle, { color: colors.text }]}>{month.title}</Text>
                  </View>
                  <View style={styles.monthHeaderRight}>
                    <View style={styles.monthIncomeExpenseRow}>
                      <Text style={[styles.monthIncome, { color: colors.income }]}>
                        +{formatBRL(month.incomeCents)}
                      </Text>
                      <Text style={[styles.monthIncome, { color: colors.expense }]}>
                        -{formatBRL(month.expenseCents)}
                      </Text>
                    </View>
                    <Text style={[styles.monthNet, { color: netColor }]}>
                      {net >= 0 ? '+' : ''}{formatBRL(net)}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Dias do mês (expandido) */}
                {isExpanded && (
                  <View style={[styles.monthBody, {
                    borderColor: colors.border,
                    borderBottomLeftRadius:  radius.md,
                    borderBottomRightRadius: radius.md,
                  }]}>
                    {month.days.map(day => {
                      const dayIncome  = day.data.filter(t => t.type === 'income').reduce((s, t) => s + t.amountCents, 0);
                      const dayExpense = day.data.filter(t => t.type === 'expense').reduce((s, t) => s + t.amountCents, 0);
                      const dayNet     = dayIncome - dayExpense;
                      return (
                        <View key={day.dateKey}>
                          <View style={[styles.dayHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.dayTitle, { color: colors.text }]}>{day.title}</Text>
                            <Text style={[styles.dayNet, {
                              color: dayNet >= 0 ? colors.income : colors.expense,
                            }]}>
                              {dayNet >= 0 ? '+' : ''}{formatBRL(dayNet)}
                            </Text>
                          </View>
                          {day.data.map(item => renderTransaction(item))}
                        </View>
                      );
                    })}
                  </View>
                )}

              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      { paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },

  // Filtros
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: { fontSize: 13, fontWeight: '600' },

  // Hint
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, opacity: 0.7 },
  hintText: { fontSize: 12, fontStyle: 'italic' },

  // Mês
  monthSection: { marginBottom: 12 },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  monthHeaderLeft:       { flexDirection: 'row', alignItems: 'center', flex: 1 },
  monthHeaderRight:      { alignItems: 'flex-end', gap: 2 },
  monthIncomeExpenseRow: { flexDirection: 'row', gap: 10 },
  monthTitle:  { fontSize: 15, fontWeight: '700' },
  monthIncome: { fontSize: 12, fontWeight: '600' },
  monthNet:    { fontSize: 14, fontWeight: '700' },
  monthBody: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },

  // Dia
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingTop: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  dayNet:   { fontSize: 13, fontWeight: '600' },

  // Transação
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer:    { flex: 1 },
  transactionLabel:  { fontSize: 15, fontWeight: '600' },
  transactionTime:   { fontSize: 12, marginTop: 2 },
  transactionAmount: { fontSize: 15, fontWeight: '700' },
  colorDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 },

  // Empty state
  emptyContainer:   { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTitle:       { fontSize: 18, fontWeight: '600' },
  emptySubtitle:    { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyListContent: { flexGrow: 1 },
});
