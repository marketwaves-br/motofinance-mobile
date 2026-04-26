import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ListRenderItemInfo,
  TextInput,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SwipeableMethods } from 'react-native-gesture-handler';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';
import { formatBRL } from '@/lib/formatters/currency';
import {
  startOfDay, endOfDay, dateKey, getThisMonday, getFirstOfMonth, formatDateBR,
} from '@/lib/dates';
import type { UnifiedTransaction, TransactionSection } from '@/types/transaction';

// ─── SwipeableRow ─────────────────────────────────────────────────────────────

type SwipeableRowProps = {
  item:        UnifiedTransaction;
  onEdit:      (item: UnifiedTransaction) => void;
  onDelete:    (item: UnifiedTransaction) => void;
  onLongPress: (item: UnifiedTransaction) => void;
  openRef:     React.MutableRefObject<SwipeableMethods | null>;
};

function SwipeableRow({ item, onEdit, onDelete, onLongPress, openRef }: SwipeableRowProps) {
  const { colors } = useTheme();
  const swipeRef   = useRef<SwipeableMethods>(null);

  const isIncome    = item.type === 'income';
  const amountColor = isIncome ? colors.income : colors.expense;
  const sign        = isIncome ? '+' : '-';

  const handleOpen = () => {
    if (openRef.current && openRef.current !== swipeRef.current) {
      openRef.current.close();
    }
    openRef.current = swipeRef.current;
  };

  const renderRightActions = () => (
    <View style={swipeStyles.actions}>
      <TouchableOpacity
        style={[swipeStyles.action, { backgroundColor: colors.primary }]}
        onPress={() => { swipeRef.current?.close(); onEdit(item); }}
        activeOpacity={0.8}
      >
        <Ionicons name="pencil" size={18} color="#fff" />
        <Text style={swipeStyles.actionText}>Editar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[swipeStyles.action, { backgroundColor: colors.danger }]}
        onPress={() => { swipeRef.current?.close(); onDelete(item); }}
        activeOpacity={0.8}
      >
        <Ionicons name="trash" size={18} color="#fff" />
        <Text style={swipeStyles.actionText}>Excluir</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      onSwipeableOpen={handleOpen}
      rightThreshold={40}
      friction={2}
      overshootRight={false}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onLongPress={() => { swipeRef.current?.close(); onLongPress(item); }}
        delayLongPress={400}
      >
        <View style={[styles.transactionRow, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
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
    </ReanimatedSwipeable>
  );
}

const swipeStyles = StyleSheet.create({
  actions:    { flexDirection: 'row' },
  action: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

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

// Item discriminado para o FlatList — cada item representa um "bloco" visual
type ListItem =
  | { kind: 'month'; month: MonthSection }
  | { kind: 'day';   section: TransactionSection }
  | { kind: 'flat';  items: UnifiedTransaction[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_BR = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

/** Mescla seções paginadas: se a dateKey já existe, concatena as transações. */
function mergeSections(
  existing: TransactionSection[],
  incoming: TransactionSection[],
): TransactionSection[] {
  const result = [...existing];
  for (const section of incoming) {
    const idx = result.findIndex(s => s.dateKey === section.dateKey);
    if (idx >= 0) {
      result[idx] = { ...result[idx], data: [...result[idx].data, ...section.data] };
    } else {
      result.push(section);
    }
  }
  return result;
}

const buildMonthSections = (
  sections: TransactionSection[],
  filter: FilterType,
): MonthSection[] => {
  const monthMap = new Map<string, MonthSection>();
  for (const day of sections) {
    const filtered = filter === 'all' ? day.data : day.data.filter(t => t.type === filter);
    if (filtered.length === 0) continue;
    const mk = day.dateKey.slice(0, 7);
    if (!monthMap.has(mk)) {
      const [year, month] = mk.split('-').map(Number);
      monthMap.set(mk, {
        monthKey: mk,
        title: `${MONTHS_BR[month - 1]} ${year}`,
        incomeCents: 0,
        expenseCents: 0,
        days: [],
      });
    }
    const sec = monthMap.get(mk)!;
    sec.days.push({ ...day, data: filtered });
    for (const t of filtered) {
      if (t.type === 'income') sec.incomeCents += t.amountCents;
      else sec.expenseCents += t.amountCents;
    }
  }
  return Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, m]) => m);
};

const currentMonthKey = (): string =>
  new Date().toLocaleDateString('en-CA').slice(0, 7);

const PAGE_SIZE = 50;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EntriesScreen() {
  const { colors, spacing, radius } = useTheme();

  // ── Date filter ──────────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState<Date>(() => getFirstOfMonth());
  const [endDate,   setEndDate]   = useState<Date>(() => startOfDay(new Date()));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker,   setShowEndPicker]   = useState(false);

  // ── Transactions ─────────────────────────────────────────────────────────────
  const [sections, setSections]         = useState<TransactionSection[]>([]);
  const [filter,   setFilter]           = useState<FilterType>('all');
  const [refreshing,   setRefreshing]   = useState(false);
  const [isLoading,    setIsLoading]    = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [hasMore,      setHasMore]      = useState(false);
  const [nextCursor,   setNextCursor]   = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
    () => new Set([currentMonthKey()])
  );

  // ── Swipeable ref (fecha o item aberto quando outro é deslizado) ─────────────
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);

  // ── Search ───────────────────────────────────────────────────────────────────
  const [searchQuery,    setSearchQuery]    = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

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

  // ── View mode ────────────────────────────────────────────────────────────────
  const viewMode = useMemo((): ViewMode => {
    const spanDays = Math.round(
      (endDate.getTime() - startDate.getTime()) / 86_400_000
    ) + 1;
    if (spanDays <= 1)  return 'flat';
    if (spanDays <= 31) return 'days';
    return 'months';
  }, [startDate, endDate]);

  // ── Derived data ──────────────────────────────────────────────────────────────
  const monthSections = useMemo(
    () => buildMonthSections(sections, filter),
    [sections, filter]
  );

  const daySections = useMemo(() =>
    sections
      .map(s => ({ ...s, data: filter === 'all' ? s.data : s.data.filter(t => t.type === filter) }))
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

  // ── FlatList data — um item por bloco visual ──────────────────────────────────
  const listData = useMemo((): ListItem[] => {
    if (viewMode === 'months')
      return monthSections.map(m => ({ kind: 'month', month: m }));
    if (viewMode === 'days')
      return daySections.map(s => ({ kind: 'day', section: s }));
    // flat — apenas 1 item para todo o bloco (pode estar vazio)
    return flatItems.length > 0 ? [{ kind: 'flat', items: flatItems }] : [];
  }, [viewMode, monthSections, daySections, flatItems]);

  // ── Fetch (primeira página) ───────────────────────────────────────────────────
  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const result = await TransactionsRepository.getTransactionHistory(
        startDate,
        endOfDay(endDate),
        { limit: PAGE_SIZE, search: debouncedSearch || undefined },
      );
      setSections(result.sections);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchHistory(); }, [startDate, endDate, debouncedSearch]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  // ── Carregar mais (próxima página) ────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor || debouncedSearch) return;
    setLoadingMore(true);
    try {
      const result = await TransactionsRepository.getTransactionHistory(
        startDate,
        endOfDay(endDate),
        { limit: PAGE_SIZE, before: nextCursor },
      );
      setSections(prev => mergeSections(prev, result.sections));
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (err) {
      console.error('Erro ao carregar mais:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextCursor, startDate, endDate]);

  // ── Preset + month toggle ─────────────────────────────────────────────────────
  const applyPreset = (preset: 'today' | 'week' | 'month') => {
    setIsLoading(true);
    const today = startOfDay(new Date());
    if (preset === 'today') { setStartDate(today);             setEndDate(today); }
    if (preset === 'week')  { setStartDate(getThisMonday());   setEndDate(today); }
    if (preset === 'month') { setStartDate(getFirstOfMonth()); setEndDate(today); }
    setExpandedMonths(new Set([currentMonthKey()]));
  };

  const toggleMonth = (mk: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      next.has(mk) ? next.delete(mk) : next.add(mk);
      return next;
    });
  };

  // ── Transaction actions ───────────────────────────────────────────────────────
  const goEdit = useCallback((item: UnifiedTransaction) => {
    router.push({
      pathname: item.type === 'income'
        ? '/(modals)/add-income'
        : '/(modals)/add-expense',
      params: {
        id:          item.id,
        amountCents: String(item.amountCents),
        refId:       item.refId,
        dateISO:     item.date,
        notes:       item.notes ?? '',
      },
    });
  }, []);

  const confirmDelete = useCallback((item: UnifiedTransaction) => {
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
  }, [fetchHistory]);

  const handleLongPress = useCallback((item: UnifiedTransaction) => {
    const typeLabel = item.type === 'income' ? 'Receita' : 'Despesa';
    Alert.alert(
      `${typeLabel} · ${formatBRL(item.amountCents)}`,
      item.label,
      [
        { text: 'Editar',  onPress: () => goEdit(item) },
        { text: 'Excluir', style: 'destructive', onPress: () => confirmDelete(item) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }, [goEdit, confirmDelete]);

  // ── Render helpers ────────────────────────────────────────────────────────────

  const renderTransaction = (item: UnifiedTransaction) => (
    <SwipeableRow
      key={item.id}
      item={item}
      onEdit={goEdit}
      onDelete={confirmDelete}
      onLongPress={handleLongPress}
      openRef={openSwipeableRef}
    />
  );

  const renderDayHeader = (title: string, data: UnifiedTransaction[]) => {
    const dayIncome  = data.filter(t => t.type === 'income').reduce((s, t) => s + t.amountCents, 0);
    const dayExpense = data.filter(t => t.type === 'expense').reduce((s, t) => s + t.amountCents, 0);
    const dayNet     = dayIncome - dayExpense;
    return (
      <View style={[styles.dayHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.dayTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.dayNet, { color: dayNet >= 0 ? colors.income : colors.expense }]}>
          {dayNet >= 0 ? '+' : ''}{formatBRL(dayNet)}
        </Text>
      </View>
    );
  };

  // Renderiza um item do FlatList conforme seu kind
  const renderItem = ({ item }: ListRenderItemInfo<ListItem>) => {
    if (item.kind === 'flat') {
      return (
        <View style={[styles.monthBody, { borderColor: colors.border, borderRadius: radius.md }]}>
          {item.items.map(t => renderTransaction(t))}
        </View>
      );
    }

    if (item.kind === 'day') {
      const s = item.section;
      return (
        <View style={[styles.monthBody, { borderColor: colors.border, borderRadius: radius.md }]}>
          {renderDayHeader(s.title, s.data)}
          {s.data.map(t => renderTransaction(t))}
        </View>
      );
    }

    // kind === 'month'
    const month      = item.month;
    const isExpanded = expandedMonths.has(month.monthKey);
    const net        = month.incomeCents - month.expenseCents;
    const netColor   = net >= 0 ? colors.income : colors.expense;

    return (
      <View style={styles.monthSection}>
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
          <View style={styles.monthHeaderBottomRow}>
            <Text style={[styles.monthIncome, { color: colors.income, marginLeft: 21 }]}>
              +{formatBRL(month.incomeCents)}
            </Text>
            <Text style={[styles.monthIncome, { color: colors.expense }]}>
              -{formatBRL(month.expenseCents)}
            </Text>
          </View>
        </TouchableOpacity>

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
                  {day.data.map(t => renderTransaction(t))}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const filterColor = (f: FilterType) =>
    f === 'income' ? colors.income : f === 'expense' ? colors.expense : colors.primary;

  const emptyLabel = () => {
    if (debouncedSearch) {
      return {
        title: 'Nenhum resultado encontrado',
        sub: `Nenhum lançamento corresponde a "${debouncedSearch}".`,
      };
    }
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

  // ── Sub-componentes para ListHeaderComponent / Empty / Footer ─────────────────

  const ListHeader = (
    <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Lançamentos</Text>

      {/* Search bar */}
      <View style={[styles.searchBar, {
        backgroundColor: colors.surface,
        borderColor: debouncedSearch ? colors.primary : colors.border,
        borderRadius: radius.md,
        marginTop: 12,
      }]}>
        <Ionicons name="search-outline" size={16} color={debouncedSearch ? colors.primary : colors.muted} />
        <TextInput
          ref={searchInputRef}
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar descrição ou nota..."
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="never"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

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
              onPress={() => { if (filter !== f) setFilter(f); }}
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
            Deslize um item para editar ou excluir
          </Text>
        </View>
      )}
    </View>
  );

  const ListEmpty = !isLoading ? (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={64} color={colors.muted} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {emptyLabel().title}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        {emptyLabel().sub}
      </Text>
    </View>
  ) : null;

  const totalResults = useMemo(() =>
    sections.reduce((sum, s) => sum + s.data.length, 0),
    [sections]
  );

  const ListFooter = loadingMore ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  ) : debouncedSearch && sections.length > 0 ? (
    <Text style={[styles.footerEnd, { color: colors.muted }]}>
      {totalResults} {totalResults === 1 ? 'resultado' : 'resultados'} para "{debouncedSearch}"
    </Text>
  ) : !hasMore && sections.length > 0 ? (
    <Text style={[styles.footerEnd, { color: colors.muted }]}>
      Todos os registros carregados
    </Text>
  ) : null;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents="box-only">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Date pickers (fora do FlatList para não scrollar com o conteúdo) */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={endDate}
          onChange={(_: DateTimePickerEvent, d?: Date) => {
            setShowStartPicker(false);
            if (d) { setIsLoading(true); setStartDate(startOfDay(d)); }
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
            if (d) { setIsLoading(true); setEndDate(startOfDay(d)); }
          }}
        />
      )}

      <FlatList<ListItem>
        data={listData}
        keyExtractor={item =>
          item.kind === 'month' ? `month-${item.month.monthKey}` :
          item.kind === 'day'   ? `day-${item.section.dateKey}`  : 'flat'
        }
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        contentContainerStyle={[
          { paddingHorizontal: spacing.lg, paddingBottom: 100, paddingTop: 8 },
          !hasData && !isLoading && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        // Evita re-renders desnecessários ao expandir/colapsar meses
        extraData={expandedMonths}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      { paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },

  pillRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 14, fontWeight: '600' },

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

  filterRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: { fontSize: 13, fontWeight: '600' },

  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, opacity: 0.7 },
  hintText: { fontSize: 12, fontStyle: 'italic' },

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

  monthBody: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },

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

  emptyContainer:   { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTitle:       { fontSize: 18, fontWeight: '600' },
  emptySubtitle:    { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyListContent: { flexGrow: 1 },

  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  footerEnd:    { textAlign: 'center', paddingVertical: 16, fontSize: 12 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
});
