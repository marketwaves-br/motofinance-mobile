import { getDatabase } from '@/infrastructure/db/sqlite';
import * as Crypto from 'expo-crypto';
import type { UnifiedTransaction, TransactionSection } from '@/types/transaction';

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
    return db.getAllAsync<{id: string, name: string}>(`SELECT id, name FROM income_sources WHERE is_active = 1 ORDER BY sort_order ASC`);
  }

  static async getExpenseCategories() {
    const db = await getDatabase();
    return db.getAllAsync<{id: string, name: string}>(`SELECT id, name FROM expense_categories WHERE is_active = 1 ORDER BY sort_order ASC`);
  }

  static async addIncome(sourceId: string, amountCents: number, date?: Date) {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();
    const transactionDate = (date ?? new Date()).toISOString();

    await db.runAsync(
      `INSERT INTO incomes (id, source_id, amount_cents, received_at, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, sourceId, amountCents, transactionDate, now, now]
    );
  }

  static async addExpense(categoryId: string, amountCents: number, date?: Date) {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();
    const transactionDate = (date ?? new Date()).toISOString();

    await db.runAsync(
      `INSERT INTO expenses (id, category_id, amount_cents, spent_at, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, categoryId, amountCents, transactionDate, now, now]
    );
  }

  /**
   * Exclui uma transação (receita ou despesa) pelo ID.
   * DELETE real — seguro porque incomes/expenses não são referenciados por FKs.
   */
  static async deleteTransaction(id: string, type: 'income' | 'expense') {
    const db = await getDatabase();
    const table = type === 'income' ? 'incomes' : 'expenses';
    await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }

  private static getDateRange(period: 'today' | 'week' | 'month') {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    let start: Date;

    if (period === 'today') {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
    }

    return { start: start.toISOString(), end: end.toISOString() };
  }

  static async getReportData(period: 'today' | 'week' | 'month') {
    const db = await getDatabase();
    const { start, end } = this.getDateRange(period);

    const incTotalRes = await db.getAllAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount_cents), 0) as total FROM incomes WHERE received_at BETWEEN ? AND ?`,
      [start, end]
    );
    const expTotalRes = await db.getAllAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount_cents), 0) as total FROM expenses WHERE spent_at BETWEEN ? AND ?`,
      [start, end]
    );

    const bySource = await db.getAllAsync<{
      id: string; name: string; color: string | null; totalCents: number;
    }>(
      `SELECT s.id, s.name, s.color, SUM(i.amount_cents) as totalCents
       FROM incomes i
       JOIN income_sources s ON i.source_id = s.id
       WHERE i.received_at BETWEEN ? AND ?
       GROUP BY s.id, s.name, s.color
       ORDER BY totalCents DESC`,
      [start, end]
    );

    const byCategory = await db.getAllAsync<{
      id: string; name: string; color: string | null; totalCents: number;
    }>(
      `SELECT c.id, c.name, c.color, SUM(e.amount_cents) as totalCents
       FROM expenses e
       JOIN expense_categories c ON e.category_id = c.id
       WHERE e.spent_at BETWEEN ? AND ?
       GROUP BY c.id, c.name, c.color
       ORDER BY totalCents DESC`,
      [start, end]
    );

    const totalIncomeCents = incTotalRes[0]?.total ?? 0;
    const totalExpenseCents = expTotalRes[0]?.total ?? 0;

    return {
      totalIncomeCents,
      totalExpenseCents,
      netCents: totalIncomeCents - totalExpenseCents,
      bySource,
      byCategory,
    };
  }

  /**
   * Retorna transações (receitas + despesas) agrupadas por dia,
   * com nome/cor/ícone da fonte ou categoria via JOIN.
   * Limitado a `limit` registros (padrão: 50).
   */
  static async getTransactionHistory(limit: number = 50): Promise<TransactionSection[]> {
    const db = await getDatabase();

    const rows = await db.getAllAsync<{
      id: string;
      type: string;
      amount_cents: number;
      date: string;
      label: string;
      color: string | null;
      icon: string | null;
      notes: string | null;
    }>(`
      SELECT 
        i.id, 'income' as type, i.amount_cents, i.received_at as date,
        s.name as label, s.color, s.icon, i.notes
      FROM incomes i
      JOIN income_sources s ON i.source_id = s.id
      UNION ALL
      SELECT 
        e.id, 'expense' as type, e.amount_cents, e.spent_at as date,
        c.name as label, c.color, c.icon, e.notes
      FROM expenses e
      JOIN expense_categories c ON e.category_id = c.id
      ORDER BY date DESC
      LIMIT ?
    `, [limit]);

    // Agrupar por dia em horário local (evita bug UTC: transações após 21h aparecem no dia seguinte)
    const grouped = new Map<string, UnifiedTransaction[]>();
    for (const row of rows) {
      const dateKey = new Date(row.date).toLocaleDateString('en-CA'); // "2026-04-10" em horário local
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push({
        id: row.id,
        type: row.type as 'income' | 'expense',
        amountCents: row.amount_cents,
        date: row.date,
        label: row.label,
        color: row.color,
        icon: row.icon,
        notes: row.notes,
      });
    }

    // Converter para TransactionSection[] com títulos localizados
    // Usa 'en-CA' para obter o formato YYYY-MM-DD em horário local (evita bug UTC-3)
    const today = new Date();
    const todayKey = today.toLocaleDateString('en-CA');

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toLocaleDateString('en-CA');

    const sections: TransactionSection[] = [];
    for (const [dateKey, transactions] of grouped) {
      let title: string;
      if (dateKey === todayKey) {
        title = 'Hoje';
      } else if (dateKey === yesterdayKey) {
        title = 'Ontem';
      } else {
        // Formatar como DD/MM/AAAA
        const [year, month, day] = dateKey.split('-');
        title = `${day}/${month}/${year}`;
      }
      sections.push({ title, dateKey, data: transactions });
    }

    return sections;
  }
}

