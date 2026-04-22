import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';
import { formatBRL } from '@/lib/formatters/currency';
import {
  startOfDay, endOfDay, dateKey, getThisMonday, getFirstOfMonth, formatDateBR,
} from '@/lib/dates';
import type { UnifiedTransaction, TransactionSection } from '@/types/transaction';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'income' | 'expense';
type ViewMode   = 'flat' | 'days' | 'months';

interface MonthSection {
  monthKey: string;
  title: string;
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
  filter: FilterType,
): MonthSection[] => {
  const monthMap = new Map<string, MonthSection>();
  for (const day of sections) {
    const filtered = filter === 'all' ? day.data : day.data.filter(t => t.type === filter);
    if (filtered.length === 0) continue;
    const monthKey = day.dateKey.slice(0, 7);
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

  // ── Date filter ──────────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState<Date>(() => getFirstOfMonth());
  const [endDate,   setEndDate]   = useState<Date>(() => startOfDay(new Date()));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker,   setShowEndPicker]   = useState(false);

  // ── Transactions ─────────────────────────────────────────────────────────────
  const [sections, setSections]     = useState<TransactionSection[]>([]);
  const [filter, setFilter]         = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading]   = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
    () => new Set([currentMonthKey()])
  );

  // ── Active preset ─────────────────────────────────────────────────────────────
  const activePreset = useMemo((): 'today' | 'week' | 'month' | null => {
    const tk = dateKey(new Date());
    const sk = dateKey(startDate);
    const ek = dateKey(endDate);
    if (sk === tk && ek === tk)                               return 'today';
    if (sk === dateKey(getThisMonday())   && ek === tk)       return 'week';
    if (sk === dateKey(getFirstOfMonth()) && ek === tk)       return 'month';
    return null;
  }, [startDate, endDate]);

  // ── View mode (controls grouping level) ──────────────────────────────────────
  // flat   → 1 day:  plain list, no headers
  // days   → 2-31:   day headers, no collapsing
  // months → 32+:    collapsible month cards
  const viewMode = useMemo((): ViewMode => {
    const spanDays = Math.round(
      (endDate.getTime() - startDate.getTime()) / 86_400_000
    ) + 1;
    if (spanDays <= 1)  return 'flat';
    if (spanDays <= 31) return 'days';
    return 'months';
  }, [startDate, endDate]);

  // ── Derived data per view mode ────────────────────────────────────────────────
  const monthSections = useMemo(
    () => buildMonthSections(sections, filter),
    [sections, filter]
  );

  const daySections = useMemo(() =>
    sections
      .map(s => ({
        ...s,
        data: filter === 'all' ? s.data : s.data.filter(t => t.type === filter),
      }))
      .filter(s => s.data.length > 0),
    [sections, filter]
  );

  const flatItems = useMemo(() =>
    sections.flatMap(s =>
      filter === 'all' ? s.data : s.data.filter(t => t.type === filter)
    ),
    [sections, filter]
  );

  const hasData = useMemo(() => {
    if (viewMode === 'flat')   return flatItems.length > 0;
    if (viewMode === 'days')   return daySections.length > 0;
    return monthSections.length > 0;
  }, [viewMode, flatItems, daySections, monthSections]);

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const data = await TransactionsRepository.getTransactionHistory(
        startDate,
        endOfDay(endDate),
      );
      setSections(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchHistory(); }, [startDate, endDate]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  // ── Preset + month toggle ─────────────────────────────────────────────────────
  const applyPreset = (preset: 'today' | 'week' | 'month') => {
    setIsLoading(true);
    const today = startOfDay(new Date());
    if (preset === 'today') { setStartDate(today);             setEndDate(today); }
    if (preset === 'week')  { setStartDate(getThisMonday());   setEndDate(today); }
    if (preset === 'month') { setStartDate(getFirstOfMonth()); setEndDate(today); }
    setExpandedMonths(new Set([currentMonthKey()]));
  };

  const toggleMonth = (monthKey: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setExpandedMonths(prev => {
        const next = new Set(prev);
        next.has(monthKey) ? next.delete(monthKey) : next.add(monthKey);
        return next;
      });
      setIsLoading(false);
    }, 50);
  };

  // ── Transaction actions ───────────────────────────────────────────────────────
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

  // ── Render helpers ────────────────────────────────────────────────────────────
  const renderTransaction = (item: UnifiedTransaction) => {
    const isIncome    = item.type === 'income';
    const amountColor = isIncome ? colors.income : colors.expense;
    const sign        = isIncome ? '+' : '-';
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

  const renderDayHeader = (title: string, data: UnifiedTransaction[]) => {
    const dayIncome  = data.filter(t => t.type === 'income').reduce((s, t) => s + t.amountCents, 0);
    const dayExpense = data.filter(t => t.type === 'expense').reduce((s, t) => s + t.amountCents, 0);
    const dayNet     = dayIncome - dayExpense;
    return (
      <View style={[styles.dayHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.dayTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.dayNet, {
          color: dayNet >= 0 ? colors.income : colors.expense,
        }]}>
          {dayNet >= 0 ? '+' : ''}{formatBRL(dayNet)}
        </Text>
      </View>
    );
  };

  const filterColor = (f: FilterType) =>
    f === 'income' ? colors.income : f === 'expense' ? colors.expense : colors.primary;

  const emptyLabel = () => {
    if (filter !== 'all') {
      return {
        title: `Nenhuma ${filter === 'income' ? 'receita' : 'despesa'} encontrada`,
        sub: 'Tente selecionar "Tudo" ou ajustar o período.',
      };
    }
    return {
      title: 'Nenhum lançamento neste período',
      sub: 'Adicione receitas e despesas pelo\ndashboard para vê-las aqui.',
    };
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Loading overlay — spinner sobre a tela durante qualquer busca */}
      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents="box-only">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Lançamentos</Text>

        {/* Period pills */}
        <View style={styles.pillRow}>
          {(['today', 'week', 'month'] as const).map(p => {
            const labels = { today: 'Hoje', week: 'Semana', month: 'Mês' };
            const isActive = activePreset === p;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => applyPreset(p)}
                style={[styles.pill, {
                  backgroundColor: isActive ? colors.primary : colors.surface,
                  borderColor:     isActive ? colors.primary : colors.border,
                }]}
              >
                <Text style={[styles.pillText, { color: isActive ? '#fff' : colors.muted }]}>
                  {labels[p]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom date range */}
        <View style={styles.dateRangeRow}>
          <TouchableOpacity
            style={[styles.dateBtn, {
              backgroundColor: colors.surface,
              borderColor: activePreset ? colors.border : colors.primary,
              borderRadius: radius.md,
            }]}
            onPress={() => setShowStartPicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={14}
              color={activePreset ? colors.muted : colors.primary} />
            <Text style={[styles.dateBtnText, { color: activePreset ? colors.text : colors.primary }]}>
              {formatDateBR(startDate)}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.dateRangeSep, { color: colors.muted }]}>até</Text>

          <TouchableOpacity
            style={[styles.dateBtn, {
              backgroundColor: colors.surface,
              borderColor: activePreset ? colors.border : colors.primary,
              borderRadius: radius.md,
            }]}
            onPress={() => setShowEndPicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={14}
              color={activePreset ? colors.muted : colors.primary} />
            <Text style={[styles.dateBtnText, { color: activePreset ? colors.text : colors.primary }]}>
              {formatDateBR(endDate)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Type filters */}
        <View style={styles.filterRow}>
          {(['all', 'income', 'expense'] as FilterType[]).map(f => {
            const labels: Record<FilterType, string> = {
              all: 'Tudo', income: '↑ Receitas', expense: '↓ Despesas',
            };
            const isActive = filter === f;
            const fc = filterColor(f);
            return (
              <TouchableOpacity
                key={f}
                onPress={() => {
                  if (filter === f) return;
                  setIsLoading(true);
                  setTimeout(() => {
                    setFilter(f);
                    setIsLoading(false);
                  }, 50);
                }}
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

      {/* Date pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={endDate}
          onChange={(_: DateTimePickerEvent, d?: Date) => {
            setShowStartPicker(false);
            if (d) {
              setIsLoading(true);
              setStartDate(startOfDay(d));
            }
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={startDate}
          maximumDate={new Date()}
          onChange={(_: DateTimePickerEvent, d?: Date) => {
            setShowEndPicker(false);
            if (d) {
              setIsLoading(true);
              setEndDate(startOfDay(d));
            }
          }}
        />
      )}

      {/* ── List ──────────────────────────────────────────────────────────────── */}
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
          /* ── Empty state ── */
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {emptyLabel().title}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              {emptyLabel().sub}
            </Text>
          </View>

        ) : viewMode === 'flat' ? (
          /* ── Flat: 1 day, no headers ── */
          <View style={[styles.monthBody, {
            borderColor: colors.border,
            borderRadius: radius.md,
          }]}>
            {flatItems.map(item => renderTransaction(item))}
          </View>

        ) : viewMode === 'days' ? (
          /* ── Days: 2-31 days, grouped by day, no collapsing ── */
          <View style={[styles.monthBody, {
            borderColor: colors.border,
            borderRadius: radius.md,
          }]}>
            {daySections.map(day => (
              <View key={day.dateKey}>
                {renderDayHeader(day.title, day.data)}
                {day.data.map(item => renderTransaction(item))}
              </View>
            ))}
          </View>

        ) : (
          /* ── Months: 32+ days, collapsible month cards ── */
          monthSections.map(month => {
            const isExpanded = expandedMonths.has(month.monthKey);
            const net        = month.incomeCents - month.expenseCents;
            const netColor   = net >= 0 ? colors.income : colors.expense;
            return (
              <View key={month.monthKey} style={styles.monthSection}>

                {/* Month card header */}
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
                  {/* Top row: Month Year (left) + Net result (right) */}
                  <View style={styles.monthHeaderTopRow}>
                    <View style={styles.monthHeaderLeft}>
                      <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={15}
                        color={colors.muted}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.monthTitle, { color: colors.text }]}>{month.title}</Text>
                    </View>
                    <Text style={[styles.monthNet, { color: netColor }]}>
                      {net >= 0 ? '+' : ''}{formatBRL(net)}
                    </Text>
                  </View>
                  {/* Bottom row: Income (left) + Expense (right) */}
                  <View style={styles.monthHeaderBottomRow}>
                    <Text style={[styles.monthIncome, { color: colors.income, marginLeft: 21 }]}>
                      +{formatBRL(month.incomeCents)}
                    </Text>
                    <Text style={[styles.monthIncome, { color: colors.expense }]}>
                      -{formatBRL(month.expenseCents)}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Expanded days */}
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

  // Period pills
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 14, fontWeight: '600' },

  // Date range
  dateRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  dateBtnText:  { fontSize: 13, fontWeight: '500' },
  dateRangeSep: { fontSize: 13 },

  // Type filters
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
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

  // Month card
  monthSection: { marginBottom: 12 },
  monthHeader: {
    flexDirection: 'column',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 6,
  },
  monthHeaderTopRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthHeaderBottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
  monthHeaderLeft:      { flexDirection: 'row', alignItems: 'center' },
  monthTitle:  { fontSize: 15, fontWeight: '700' },
  monthIncome: { fontSize: 12, fontWeight: '600' },
  monthNet:    { fontSize: 14, fontWeight: '700' },

  // Month body (shared by months+days+flat modes)
  monthBody: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },

  // Day header
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

  // Transaction row
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

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
});
