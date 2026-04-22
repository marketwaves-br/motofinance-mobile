import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  startOfDay, endOfDay, dateKey, getThisMonday, getFirstOfMonth, formatDateBR,
} from '@/lib/dates';
import { useTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';
import { GoalsRepository, MonthlyGoals } from '@/infrastructure/repositories/GoalsRepository';
import { formatBRL } from '@/lib/formatters/currency';
import { AppCard } from '@/components/ui/AppCard';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportData = {
  totalIncomeCents: number;
  totalExpenseCents: number;
  netCents: number;
  incomeCount: number;
  expenseCount: number;
  bySource: Array<{ id: string; name: string; color: string | null; totalCents: number }>;
  byCategory: Array<{ id: string; name: string; color: string | null; totalCents: number }>;
};

type DailyData = {
  dateKey: string;
  incomeCents: number;
  expenseCents: number;
};

type DowData = { dow: number; totalCents: number; workingDays: number };


// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const { colors, spacing, radius } = useTheme();

  const [startDate, setStartDate] = useState<Date>(() => getFirstOfMonth());
  const [endDate,   setEndDate]   = useState<Date>(() => startOfDay(new Date()));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker,   setShowEndPicker]   = useState(false);

  const [report,     setReport]     = useState<ReportData | null>(null);
  const [prevReport, setPrevReport] = useState<ReportData | null>(null);
  const [dailyData,  setDailyData]  = useState<DailyData[]>([]);
  const [dowData,    setDowData]    = useState<DowData[]>([]);
  const [goals,      setGoals]      = useState<MonthlyGoals>({ income: null, net: null });
  const [refreshing, setRefreshing] = useState(false);

  // ── Active quick preset ────────────────────────────────────────────────────

  const activePreset = useMemo((): 'today' | 'week' | 'month' | null => {
    const todayKey = dateKey(new Date());
    const sk = dateKey(startDate);
    const ek = dateKey(endDate);
    if (sk === todayKey && ek === todayKey)            return 'today';
    if (sk === dateKey(getThisMonday())   && ek === todayKey) return 'week';
    if (sk === dateKey(getFirstOfMonth()) && ek === todayKey) return 'month';
    return null;
  }, [startDate, endDate]);

  const applyPreset = (preset: 'today' | 'week' | 'month') => {
    const today = startOfDay(new Date());
    if (preset === 'today') { setStartDate(today);             setEndDate(today); }
    if (preset === 'week')  { setStartDate(getThisMonday());   setEndDate(today); }
    if (preset === 'month') { setStartDate(getFirstOfMonth()); setEndDate(today); }
  };

  // ── Previous period (same duration, immediately before) ───────────────────

  const getPrevDates = () => {
    const end   = endOfDay(endDate);
    const duration = end.getTime() - startDate.getTime();
    const prevEnd   = new Date(startDate.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);
    return { prevStart: startOfDay(prevStart), prevEnd: endOfDay(prevEnd) };
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchReport = async () => {
    try {
      const end = endOfDay(endDate);
      const { prevStart, prevEnd } = getPrevDates();

      const [data, prevData, daily, dow, goalsData] = await Promise.all([
        TransactionsRepository.getReportData(startDate, end),
        TransactionsRepository.getReportData(prevStart, prevEnd),
        TransactionsRepository.getDailyBreakdown(startDate, end),
        TransactionsRepository.getDayOfWeekBreakdown(startDate, end),
        GoalsRepository.getMonthlyGoals(),
      ]);

      setReport(data);
      setPrevReport(prevData);
      setDailyData(daily);
      setDowData(dow);
      setGoals(goalsData);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    }
  };

  useFocusEffect(
    useCallback(() => { fetchReport(); }, [startDate, endDate])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReport();
    setRefreshing(false);
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const hasData   = report && (report.totalIncomeCents > 0 || report.totalExpenseCents > 0);
  const isMultiDay = dateKey(startDate) !== dateKey(endDate);

  // Comparison vs previous period
  const diffPct = (current: number, prev: number): { text: string; positive: boolean } | null => {
    if (!prevReport || prev === 0) return null;
    const pct = Math.round(((current - prev) / Math.abs(prev)) * 100);
    return { text: pct >= 0 ? `+${pct}%` : `${pct}%`, positive: pct >= 0 };
  };

  // Projection to end of period
  const projection = useMemo(() => {
    if (!report || report.totalIncomeCents === 0) return null;
    const today     = startOfDay(new Date());
    const periodEnd = startOfDay(endDate);
    if (periodEnd <= today || startDate > today) return null;

    const MS_DAY     = 86_400_000;
    const totalDays  = Math.round((endDate.getTime() - startDate.getTime()) / MS_DAY) + 1;
    const daysElapsed = Math.max(1, Math.round((today.getTime() - startDate.getTime()) / MS_DAY) + 1);
    const daysRemaining = totalDays - daysElapsed;
    if (daysRemaining <= 0) return null;

    const projIncome  = Math.round((report.totalIncomeCents  / daysElapsed) * totalDays);
    const projExpense = Math.round((report.totalExpenseCents / daysElapsed) * totalDays);

    return { projIncome, projExpense, projNet: projIncome - projExpense, daysRemaining };
  }, [report, startDate, endDate]);

  // Whether the selected period covers the current month (to show monthly goal card)
  // Excludes 'week' preset — weekly card takes over in that case
  const periodCoversCurrentMonth = useMemo(() => {
    if (activePreset === 'week') return false;
    const todayKey      = dateKey(new Date());
    const sk            = dateKey(startDate);
    const ek            = dateKey(endDate);
    const firstMonthKey = dateKey(getFirstOfMonth());
    return sk <= todayKey && ek >= todayKey && sk >= firstMonthKey;
  }, [startDate, endDate, activePreset]);

  // Goal progress — computed only when period covers current month and goals are set
  const goalProgress = useMemo(() => {
    if (!periodCoversCurrentMonth || !report) return null;
    if (goals.income === null && goals.net === null) return null;

    const today          = new Date();
    const lastDay        = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysElapsed    = today.getDate();
    const daysRemaining  = lastDay - daysElapsed;

    const incomeGoalData = goals.income && goals.income > 0 ? (() => {
      const pct         = Math.min(100, Math.max(0, Math.round((report.totalIncomeCents / goals.income!) * 100)));
      const dailyNeeded = daysRemaining > 0 ? Math.max(0, Math.round((goals.income! - report.totalIncomeCents) / daysRemaining)) : 0;
      const projected   = projection?.projIncome ?? null;
      const projPct     = projected !== null ? projected / goals.income! : null;
      return { goalCents: goals.income!, pct, dailyNeeded, projected, projPct, daysRemaining };
    })() : null;

    const netGoalData = goals.net && goals.net > 0 ? (() => {
      const pct         = Math.min(100, Math.max(0, Math.round((report.netCents / goals.net!) * 100)));
      const dailyNeeded = daysRemaining > 0 ? Math.max(0, Math.round((goals.net! - report.netCents) / daysRemaining)) : 0;
      const projected   = projection?.projNet ?? null;
      const projPct     = projected !== null ? projected / goals.net! : null;
      return { goalCents: goals.net!, pct, dailyNeeded, projected, projPct, daysRemaining };
    })() : null;

    return (incomeGoalData || netGoalData) ? { incomeGoalData, netGoalData } : null;
  }, [goals, periodCoversCurrentMonth, report, projection]);

  // Weekly derived goal — only when 'week' preset is active
  const weeklyGoalProgress = useMemo(() => {
    if (activePreset !== 'week') return null;
    if (!report) return null;
    if (goals.income === null && goals.net === null) return null;

    const today       = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dow         = today.getDay();
    const daysElapsed   = dow === 0 ? 7 : dow;   // seg=1 … dom=7
    const daysRemaining = 7 - daysElapsed;

    const makeRow = (monthlyGoalCents: number, currentCents: number, projectedCents: number | null) => {
      const weeklyGoalCents = Math.round(monthlyGoalCents * 7 / daysInMonth);
      const pct       = Math.min(100, Math.max(0, Math.round((currentCents / weeklyGoalCents) * 100)));
      const dailyNeeded = daysRemaining > 0
        ? Math.max(0, Math.round((weeklyGoalCents - currentCents) / daysRemaining))
        : 0;
      const projPct = projectedCents !== null ? projectedCents / weeklyGoalCents : null;
      return { weeklyGoalCents, monthlyGoalCents, pct, dailyNeeded, projected: projectedCents, projPct, daysRemaining };
    };

    const incomeRow = goals.income && goals.income > 0
      ? makeRow(goals.income, report.totalIncomeCents, projection?.projIncome ?? null)
      : null;
    const netRow = goals.net && goals.net > 0
      ? makeRow(goals.net, report.netCents, projection?.projNet ?? null)
      : null;

    return (incomeRow || netRow) ? { incomeRow, netRow } : null;
  }, [activePreset, goals, report, projection]);

  // Daily evolution max for bar scaling
  const dailyMax = useMemo(
    () => Math.max(...dailyData.map(d => Math.max(d.incomeCents, d.expenseCents)), 1),
    [dailyData]
  );

  // Working days (days with any income)
  const workingDays = dailyData.filter(d => d.incomeCents > 0).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Relatórios</Text>

        {/* Quick presets */}
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
            <Ionicons name="calendar-outline" size={14} color={activePreset ? colors.muted : colors.primary} />
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
            <Ionicons name="calendar-outline" size={14} color={activePreset ? colors.muted : colors.primary} />
            <Text style={[styles.dateBtnText, { color: activePreset ? colors.text : colors.primary }]}>
              {formatDateBR(endDate)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date pickers (rendered outside header to avoid layout issues) */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={endDate}
          onValueChange={(_: DateTimePickerEvent, d?: Date) => {
            setShowStartPicker(false);
            if (d) setStartDate(startOfDay(d));
          }}
          onDismiss={() => setShowStartPicker(false)}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={startDate}
          maximumDate={new Date()}
          onValueChange={(_: DateTimePickerEvent, d?: Date) => {
            setShowEndPicker(false);
            if (d) setEndDate(startOfDay(d));
          }}
          onDismiss={() => setShowEndPicker(false)}
        />
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >

        {/* Lucro Líquido */}
        <AppCard style={styles.netCard}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Lucro Líquido</Text>
          <Text style={[styles.netAmount, {
            color: report && report.netCents >= 0 ? colors.income : colors.expense,
          }]}>
            {formatBRL(report?.netCents ?? 0)}
          </Text>
          {(() => {
            const diff = diffPct(report?.netCents ?? 0, prevReport?.netCents ?? 0);
            if (!diff) return null;
            return (
              <Text style={[styles.diffText, { color: diff.positive ? colors.income : colors.expense }]}>
                {diff.text} vs período anterior
              </Text>
            );
          })()}
        </AppCard>

        {/* Receitas + Despesas */}
        <View style={styles.row}>
          <AppCard style={[styles.halfCard, { borderColor: colors.income, borderWidth: 1 }]}>
            <Ionicons name="arrow-up-circle-outline" size={22} color={colors.income} style={{ marginBottom: 4 }} />
            <Text style={[styles.cardLabel, { color: colors.muted }]}>Receitas</Text>
            <Text style={[styles.halfAmount, { color: colors.income }]}>
              {formatBRL(report?.totalIncomeCents ?? 0)}
            </Text>
            {(() => {
              const diff = diffPct(report?.totalIncomeCents ?? 0, prevReport?.totalIncomeCents ?? 0);
              if (!diff) return null;
              return (
                <Text style={[styles.diffSmall, { color: diff.positive ? colors.income : colors.expense }]}>
                  {diff.text}
                </Text>
              );
            })()}
          </AppCard>

          <AppCard style={[styles.halfCard, { borderColor: colors.expense, borderWidth: 1 }]}>
            <Ionicons name="arrow-down-circle-outline" size={22} color={colors.expense} style={{ marginBottom: 4 }} />
            <Text style={[styles.cardLabel, { color: colors.muted }]}>Despesas</Text>
            <Text style={[styles.halfAmount, { color: colors.expense }]}>
              {formatBRL(report?.totalExpenseCents ?? 0)}
            </Text>
            {(() => {
              const diff = diffPct(report?.totalExpenseCents ?? 0, prevReport?.totalExpenseCents ?? 0);
              if (!diff) return null;
              // Para despesas: subir é ruim, descer é bom
              return (
                <Text style={[styles.diffSmall, { color: diff.positive ? colors.expense : colors.income }]}>
                  {diff.text}
                </Text>
              );
            })()}
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

            {/* ── Métricas ───────────────────────────────────────────────────── */}
            <AppCard style={{ marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
                Métricas do Período
              </Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {(report?.incomeCount ?? 0) + (report?.expenseCount ?? 0)}
                  </Text>
                  <Text style={[styles.metricLabel, { color: colors.muted }]}>lançamentos</Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: colors.income }]}>
                    {report && report.incomeCount > 0
                      ? formatBRL(Math.round(report.totalIncomeCents / report.incomeCount))
                      : '—'}
                  </Text>
                  <Text style={[styles.metricLabel, { color: colors.muted }]}>ticket médio</Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, { color: colors.income }]}>
                    {workingDays > 0
                      ? formatBRL(Math.round(report!.totalIncomeCents / workingDays))
                      : '—'}
                  </Text>
                  <Text style={[styles.metricLabel, { color: colors.muted }]}>média/dia trab.</Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, {
                    color: report && report.totalIncomeCents > 0
                      ? (report.totalExpenseCents / report.totalIncomeCents) < 0.3
                        ? colors.income : colors.expense
                      : colors.muted,
                  }]}>
                    {report && report.totalIncomeCents > 0
                      ? `${Math.round((report.totalExpenseCents / report.totalIncomeCents) * 100)}%`
                      : '—'}
                  </Text>
                  <Text style={[styles.metricLabel, { color: colors.muted }]}>taxa de despesa</Text>
                </View>
              </View>
            </AppCard>

            {/* ── Projeção ───────────────────────────────────────────────────── */}
            {projection && (
              <AppCard style={[styles.projectionCard, { borderColor: colors.primary, marginBottom: 16 }]}>
                <View style={styles.projectionHeader}>
                  <Ionicons name="trending-up-outline" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8 }]}>
                    Projeção — faltam {projection.daysRemaining}{' '}
                    {projection.daysRemaining === 1 ? 'dia' : 'dias'}
                  </Text>
                </View>
                <Text style={[styles.projectionSubtitle, { color: colors.muted }]}>
                  Mantendo o ritmo atual até o fim do período:
                </Text>
                <View style={styles.projectionValues}>
                  <View style={styles.projectionItem}>
                    <Text style={[styles.projectionAmount, { color: colors.income }]}>
                      {formatBRL(projection.projIncome)}
                    </Text>
                    <Text style={[styles.metricLabel, { color: colors.muted }]}>receitas projetadas</Text>
                  </View>
                  <View style={[styles.projectionDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.projectionItem}>
                    <Text style={[styles.projectionAmount, {
                      color: projection.projNet >= 0 ? colors.income : colors.expense,
                    }]}>
                      {formatBRL(projection.projNet)}
                    </Text>
                    <Text style={[styles.metricLabel, { color: colors.muted }]}>lucro projetado</Text>
                  </View>
                </View>
              </AppCard>
            )}

            {/* ── Meta Semanal (derivada) ───────────────────────────────────── */}
            {weeklyGoalProgress && (() => {
              const goalColor = (projPct: number | null): string => {
                if (projPct === null) return colors.primary;
                if (projPct >= 1)    return colors.income;
                if (projPct >= 0.9)  return '#E67E22';
                return colors.expense;
              };

              const renderWeekRow = (
                label: string,
                current: number,
                row: NonNullable<typeof weeklyGoalProgress>['incomeRow'],
              ) => {
                if (!row) return null;
                const accent = goalColor(row.projPct);
                return (
                  <View style={{ marginBottom: 14 }}>
                    <View style={styles.goalRowHeader}>
                      <Text style={[styles.goalRowLabel, { color: colors.text }]}>{label}</Text>
                      <Text style={[styles.goalRowPct, { color: accent }]}>{row.pct}%</Text>
                    </View>
                    <View style={[styles.goalBarTrack, { backgroundColor: colors.border }]}>
                      <View style={[styles.goalBarFill, { width: `${row.pct}%`, backgroundColor: accent }]} />
                    </View>
                    <View style={styles.goalRowFooter}>
                      <Text style={[styles.goalFooterText, { color: colors.muted }]}>
                        {formatBRL(current)} / {formatBRL(row.weeklyGoalCents)}
                      </Text>
                      {row.daysRemaining > 0 && row.pct < 100 && (
                        <Text style={[styles.goalFooterText, { color: colors.muted }]}>
                          precisa {formatBRL(row.dailyNeeded)}/dia
                        </Text>
                      )}
                    </View>
                    {row.projected !== null && (
                      <Text style={[styles.goalProjected, { color: accent }]}>
                        {row.projPct !== null && row.projPct >= 1 ? '✓' : '⚠'} Projeção:{' '}
                        {formatBRL(row.projected)}
                        {row.projPct !== null && row.projPct >= 1 ? ' — acima da meta' : ' — abaixo da meta'}
                      </Text>
                    )}
                    <Text style={[styles.goalFooterText, { color: colors.muted, marginTop: 4, fontStyle: 'italic' }]}>
                      Meta mensal de {formatBRL(row.monthlyGoalCents)} ÷ semanas do mês
                    </Text>
                  </View>
                );
              };

              return (
                <AppCard style={[styles.goalCard, { borderColor: colors.primary, marginBottom: 16 }]}>
                  <View style={styles.projectionHeader}>
                    <Ionicons name="flag-outline" size={18} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8 }]}>
                      Meta desta Semana
                    </Text>
                  </View>
                  {renderWeekRow('Receita', report!.totalIncomeCents, weeklyGoalProgress.incomeRow)}
                  {renderWeekRow('Lucro Líquido', report!.netCents, weeklyGoalProgress.netRow)}
                </AppCard>
              );
            })()}

            {/* ── Meta Mensal ───────────────────────────────────────────────── */}
            {goalProgress && (() => {
              const goalColor = (projPct: number | null): string => {
                if (projPct === null) return colors.primary;
                if (projPct >= 1)    return colors.income;
                if (projPct >= 0.9)  return '#E67E22';
                return colors.expense;
              };

              const renderGoalRow = (
                label: string,
                current: number,
                data: NonNullable<typeof goalProgress>['incomeGoalData'],
              ) => {
                if (!data) return null;
                const accentColor = goalColor(data.projPct);
                return (
                  <View style={{ marginBottom: 14 }}>
                    <View style={styles.goalRowHeader}>
                      <Text style={[styles.goalRowLabel, { color: colors.text }]}>{label}</Text>
                      <Text style={[styles.goalRowPct, { color: accentColor }]}>{data.pct}%</Text>
                    </View>
                    <View style={[styles.goalBarTrack, { backgroundColor: colors.border }]}>
                      <View style={[styles.goalBarFill, { width: `${data.pct}%`, backgroundColor: accentColor }]} />
                    </View>
                    <View style={styles.goalRowFooter}>
                      <Text style={[styles.goalFooterText, { color: colors.muted }]}>
                        {formatBRL(current)} / {formatBRL(data.goalCents)}
                      </Text>
                      {data.daysRemaining > 0 && data.pct < 100 && (
                        <Text style={[styles.goalFooterText, { color: colors.muted }]}>
                          precisa {formatBRL(data.dailyNeeded)}/dia
                        </Text>
                      )}
                    </View>
                    {data.projected !== null && (
                      <Text style={[styles.goalProjected, { color: accentColor }]}>
                        {data.projPct !== null && data.projPct >= 1 ? '✓' : '⚠'} Projeção: {formatBRL(data.projected)}
                        {data.projPct !== null && data.projPct >= 1 ? ' — acima da meta' : ' — abaixo da meta'}
                      </Text>
                    )}
                  </View>
                );
              };

              return (
                <AppCard style={[styles.goalCard, { borderColor: colors.primary, marginBottom: 16 }]}>
                  <View style={styles.projectionHeader}>
                    <Ionicons name="flag-outline" size={18} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8 }]}>
                      Meta Mensal
                    </Text>
                  </View>
                  {renderGoalRow('Receita', report!.totalIncomeCents, goalProgress.incomeGoalData)}
                  {renderGoalRow('Lucro Líquido', report!.netCents, goalProgress.netGoalData)}
                </AppCard>
              );
            })()}

            {/* ── Evolução Diária ────────────────────────────────────────────── */}
            {isMultiDay && dailyData.length > 1 && (
              <View style={[styles.section, { marginBottom: 24 }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Evolução Diária</Text>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 380 }}>
                  {dailyData.map(day => {
                    const [, month, dayNum] = day.dateKey.split('-');
                    const label  = `${dayNum}/${month}`;
                    const incPct = (day.incomeCents  / dailyMax) * 100;
                    const expPct = (day.expenseCents / dailyMax) * 100;
                    const net    = day.incomeCents - day.expenseCents;
                    return (
                      <View key={day.dateKey} style={[styles.dailyRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.dailyLabel, { color: colors.muted }]}>{label}</Text>
                        <View style={styles.dailyBars}>
                          {day.incomeCents > 0 && (
                            <View style={[styles.dailyBarTrack, { marginBottom: 3 }]}>
                              <View style={[styles.dailyBarFill, { width: `${incPct}%`, backgroundColor: colors.income }]} />
                            </View>
                          )}
                          {day.expenseCents > 0 && (
                            <View style={styles.dailyBarTrack}>
                              <View style={[styles.dailyBarFill, { width: `${expPct}%`, backgroundColor: colors.expense }]} />
                            </View>
                          )}
                        </View>
                        <Text style={[styles.dailyNet, { color: net >= 0 ? colors.income : colors.expense }]}>
                          {net >= 0 ? '+' : ''}{formatBRL(net)}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ── Receitas por Fonte ─────────────────────────────────────────── */}
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
                        <Text style={[styles.breakdownPct, { color: colors.muted }]}>{pct}%</Text>
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

            {/* ── Despesas por Categoria ─────────────────────────────────────── */}
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
                        <Text style={[styles.breakdownPct, { color: colors.muted }]}>{pct}%</Text>
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

            {/* ── Receita por Dia da Semana ──────────────────────────────────── */}
            {isMultiDay && (() => {
              const DOW_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
              const DOW_ORDER  = [1, 2, 3, 4, 5, 6, 0]; // Seg → Dom

              const rows = DOW_ORDER
                .map(dow => {
                  const found = dowData.find(d => d.dow === dow);
                  if (!found || found.workingDays === 0) return null;
                  return {
                    dow,
                    label: DOW_LABELS[dow],
                    avg: Math.round(found.totalCents / found.workingDays),
                    workingDays: found.workingDays,
                  };
                })
                .filter(Boolean) as Array<{ dow: number; label: string; avg: number; workingDays: number }>;

              if (rows.length < 2) return null;

              const maxAvg = Math.max(...rows.map(r => r.avg), 1);
              const bestAvg = maxAvg;

              return (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Receita por Dia da Semana
                  </Text>
                  {rows.map(row => {
                    const pct   = (row.avg / maxAvg) * 100;
                    const isBest = row.avg === bestAvg;
                    const barColor = isBest ? colors.income : colors.primary;
                    return (
                      <View key={row.dow} style={[styles.dowRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.dowLabel, { color: colors.text }]}>{row.label}</Text>
                        <View style={styles.dowBarWrapper}>
                          <View style={[styles.dowBarTrack, { backgroundColor: colors.border }]}>
                            <View style={[styles.dowBarFill, { width: `${pct}%`, backgroundColor: barColor }]} />
                          </View>
                        </View>
                        <View style={styles.dowRight}>
                          <Text style={[styles.dowAvg, { color: isBest ? colors.income : colors.text }]}>
                            {formatBRL(row.avg)}
                          </Text>
                          <Text style={[styles.dowDays, { color: colors.muted }]}>
                            {row.workingDays}×
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })()}

          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1 },
  header:     { paddingTop: 56, paddingBottom: 16 },
  headerTitle:{ fontSize: 28, fontWeight: 'bold' },

  // Period selector
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 14, fontWeight: '600' },

  // Custom date range
  dateRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flex: 1,
  },
  dateBtnText:   { fontSize: 13, fontWeight: '500' },
  dateRangeSep:  { fontSize: 12 },

  // Summary cards
  netCard:   { marginBottom: 16, alignItems: 'center', paddingVertical: 28 },
  cardLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  netAmount: { fontSize: 36, fontWeight: 'bold' },
  diffText:  { fontSize: 12, marginTop: 6, fontWeight: '500' },
  row:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  halfCard:  { width: '48%', alignItems: 'center', paddingVertical: 18 },
  halfAmount:{ fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  diffSmall: { fontSize: 11, marginTop: 4, fontWeight: '600' },

  // Metrics
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricItem:  { width: '46%', alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: '700' },
  metricLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },

  // Projection
  projectionCard:    { borderWidth: 1 },
  projectionHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  projectionSubtitle:{ fontSize: 12, marginBottom: 14 },
  projectionValues:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  projectionItem:    { alignItems: 'center', flex: 1 },
  projectionAmount:  { fontSize: 20, fontWeight: '700' },
  projectionDivider: { width: 1, height: 36, opacity: 0.4 },

  // Daily evolution
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  dailyLabel:   { width: 36, fontSize: 11, fontWeight: '600' },
  dailyBars:    { flex: 1, justifyContent: 'center' },
  dailyBarTrack:{ height: 6, borderRadius: 3, backgroundColor: 'transparent', overflow: 'hidden' },
  dailyBarFill: { height: 6, borderRadius: 3, minWidth: 4 },
  dailyNet:     { fontSize: 12, fontWeight: '700', textAlign: 'right', minWidth: 72 },

  // Breakdown
  section:      { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  breakdownItem:  { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  breakdownHeader:{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot:            { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  breakdownName:  { flex: 1, fontSize: 15, fontWeight: '500' },
  breakdownPct:   { fontSize: 12, marginRight: 8 },
  breakdownAmount:{ fontSize: 15, fontWeight: '700' },
  barTrack:       { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill:        { height: 6, borderRadius: 3 },

  // Goal card
  goalCard:        { borderWidth: 1 },
  goalRowHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  goalRowLabel:    { fontSize: 13, fontWeight: '600' },
  goalRowPct:      { fontSize: 14, fontWeight: '700' },
  goalBarTrack:    { height: 7, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  goalBarFill:     { height: 7, borderRadius: 4 },
  goalRowFooter:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  goalFooterText:  { fontSize: 11 },
  goalProjected:   { fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Day of week breakdown
  dowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  dowLabel:      { width: 32, fontSize: 13, fontWeight: '600' },
  dowBarWrapper: { flex: 1 },
  dowBarTrack:   { height: 7, borderRadius: 4, overflow: 'hidden' },
  dowBarFill:    { height: 7, borderRadius: 4 },
  dowRight:      { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 110, justifyContent: 'flex-end' },
  dowAvg:        { fontSize: 14, fontWeight: '700' },
  dowDays:       { fontSize: 11 },

  // Empty state
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle:     { fontSize: 18, fontWeight: '600' },
  emptySubtitle:  { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
