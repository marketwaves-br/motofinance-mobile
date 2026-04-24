import { useState, useCallback } from 'react';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';
import { GoalsRepository, MonthlyGoals } from '@/infrastructure/repositories/GoalsRepository';

export interface DashboardSummary {
  incomes: number;
  expenses: number;
  net: number;
}

export interface MonthComparison {
  pct: number;
  prevMonthName: string;
  improved: boolean;
}

export interface DashboardData {
  summary: DashboardSummary;
  goals: MonthlyGoals;
  monthlyIncome: number;
  monthlyNet: number;
  monthComparison: MonthComparison | null;
}

const MONTHS_SHORT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

/**
 * Hook que centraliza a busca de dados do dashboard.
 * Separa lógica de dados da camada de apresentação.
 */
export function useDashboardData() {
  const [data, setData] = useState<DashboardData>({
    summary:         { incomes: 0, expenses: 0, net: 0 },
    goals:           { income: null, net: null },
    monthlyIncome:   0,
    monthlyNet:      0,
    monthComparison: null,
  });
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const today          = new Date();
      const firstOfMonth   = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfToday     = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const lastDayOfPrev  = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      const prevMonthDay   = Math.min(today.getDate(), lastDayOfPrev);
      const firstOfPrev    = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfPrevPeriod = new Date(today.getFullYear(), today.getMonth() - 1, prevMonthDay, 23, 59, 59, 999);

      const [summary, goals, monthData, prevMonthData] = await Promise.all([
        TransactionsRepository.getTodaySummary(),
        GoalsRepository.getMonthlyGoals(),
        TransactionsRepository.getReportData(firstOfMonth, endOfToday),
        TransactionsRepository.getReportData(firstOfPrev,  endOfPrevPeriod),
      ]);

      let monthComparison: MonthComparison | null = null;
      if (prevMonthData.netCents !== 0) {
        const prevIdx = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
        const pct = Math.round(
          ((monthData.netCents - prevMonthData.netCents) / Math.abs(prevMonthData.netCents)) * 100
        );
        monthComparison = { pct, prevMonthName: MONTHS_SHORT[prevIdx], improved: pct >= 0 };
      }

      setData({
        summary,
        goals,
        monthlyIncome:   monthData.totalIncomeCents,
        monthlyNet:      monthData.netCents,
        monthComparison,
      });
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshing(false);
  }, [fetch]);

  return { data, loading, refreshing, fetch, refresh };
}
