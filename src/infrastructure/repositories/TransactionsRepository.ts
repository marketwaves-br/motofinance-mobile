import { getDatabase } from '@/infrastructure/db/sqlite';
import * as Crypto from 'expo-crypto';
import type { UnifiedTransaction, TransactionSection } from '@/types/transaction';

export interface PagedTransactionResult {
  sections: TransactionSection[];
  hasMore: boolean;
  nextCursor: string | null;
}

const PAGE_SIZE_DEFAULT = 50;

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

  static async addIncome(sourceId: string, amountCents: number, date?: Date, notes?: string) {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();
    const transactionDate = (date ?? new Date()).toISOString();

    await db.runAsync(
      `INSERT INTO incomes (id, source_id, amount_cents, received_at, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, sourceId, amountCents, transactionDate, notes ?? null, now, now]
    );
  }

  static async addExpense(categoryId: string, amountCents: number, date?: Date, notes?: string) {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();
    const transactionDate = (date ?? new Date()).toISOString();

    await db.runAsync(
      `INSERT INTO expenses (id, category_id, amount_cents, spent_at, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, categoryId, amountCents, transactionDate, notes ?? null, now, now]
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

  static async updateIncome(id: string, sourceId: string, amountCents: number, date: Date, notes?: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE incomes SET source_id = ?, amount_cents = ?, received_at = ?, notes = ?, updated_at = ? WHERE id = ?`,
      [sourceId, amountCents, date.toISOString(), notes ?? null, new Date().toISOString(), id]
    );
  }

  static async updateExpense(id: string, categoryId: string, amountCents: number, date: Date, notes?: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE expenses SET category_id = ?, amount_cents = ?, spent_at = ?, notes = ?, updated_at = ? WHERE id = ?`,
      [categoryId, amountCents, date.toISOString(), notes ?? null, new Date().toISOString(), id]
    );
  }

  static async getReportData(start: Date, end: Date) {
    const db = await getDatabase();
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const [incTotalRes, expTotalRes, incCountRes, expCountRes, bySource, byCategory] =
      await Promise.all([
        db.getAllAsync<{ total: number }>(
          `SELECT COALESCE(SUM(amount_cents), 0) as total FROM incomes WHERE received_at BETWEEN ? AND ?`,
          [startISO, endISO]
        ),
        db.getAllAsync<{ total: number }>(
          `SELECT COALESCE(SUM(amount_cents), 0) as total FROM expenses WHERE spent_at BETWEEN ? AND ?`,
          [startISO, endISO]
        ),
        db.getAllAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM incomes WHERE received_at BETWEEN ? AND ?`,
          [startISO, endISO]
        ),
        db.getAllAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM expenses WHERE spent_at BETWEEN ? AND ?`,
          [startISO, endISO]
        ),
        db.getAllAsync<{ id: string; name: string; color: string | null; totalCents: number }>(
          `SELECT s.id, s.name, s.color, SUM(i.amount_cents) as totalCents
           FROM incomes i
           JOIN income_sources s ON i.source_id = s.id
           WHERE i.received_at BETWEEN ? AND ?
           GROUP BY s.id, s.name, s.color
           ORDER BY totalCents DESC`,
          [startISO, endISO]
        ),
        db.getAllAsync<{ id: string; name: string; color: string | null; totalCents: number }>(
          `SELECT c.id, c.name, c.color, SUM(e.amount_cents) as totalCents
           FROM expenses e
           JOIN expense_categories c ON e.category_id = c.id
           WHERE e.spent_at BETWEEN ? AND ?
           GROUP BY c.id, c.name, c.color
           ORDER BY totalCents DESC`,
          [startISO, endISO]
        ),
      ]);

    const totalIncomeCents = incTotalRes[0]?.total ?? 0;
    const totalExpenseCents = expTotalRes[0]?.total ?? 0;

    return {
      totalIncomeCents,
      totalExpenseCents,
      netCents: totalIncomeCents - totalExpenseCents,
      incomeCount: incCountRes[0]?.count ?? 0,
      expenseCount: expCountRes[0]?.count ?? 0,
      bySource,
      byCategory,
    };
  }

  /**
   * Retorna receita total e número de dias trabalhados por dia da semana (horário local).
   * Útil para identificar quais dias rendem mais.
   */
  static async getDayOfWeekBreakdown(
    start: Date,
    end: Date
  ): Promise<Array<{ dow: number; totalCents: number; workingDays: number }>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ date: string; cents: number }>(
      `SELECT received_at as date, amount_cents as cents FROM incomes WHERE received_at BETWEEN ? AND ?`,
      [start.toISOString(), end.toISOString()]
    );

    // Agrupa em horário local para evitar bug UTC-3
    const map = new Map<number, { totalCents: number; days: Set<string> }>();
    for (const row of rows) {
      const d   = new Date(row.date);
      const dow = d.getDay(); // 0=Dom … 6=Sáb (local)
      const key = d.toLocaleDateString('en-CA');
      if (!map.has(dow)) map.set(dow, { totalCents: 0, days: new Set() });
      const entry = map.get(dow)!;
      entry.totalCents += row.cents;
      entry.days.add(key);
    }

    return Array.from(map.entries()).map(([dow, data]) => ({
      dow,
      totalCents: data.totalCents,
      workingDays: data.days.size,
    }));
  }

  static async getDailyBreakdown(
    start: Date,
    end: Date
  ): Promise<Array<{ dateKey: string; incomeCents: number; expenseCents: number }>> {
    const db = await getDatabase();
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const [incomes, expenses] = await Promise.all([
      db.getAllAsync<{ date: string; cents: number }>(
        `SELECT received_at as date, amount_cents as cents FROM incomes WHERE received_at BETWEEN ? AND ?`,
        [startISO, endISO]
      ),
      db.getAllAsync<{ date: string; cents: number }>(
        `SELECT spent_at as date, amount_cents as cents FROM expenses WHERE spent_at BETWEEN ? AND ?`,
        [startISO, endISO]
      ),
    ]);

    const map = new Map<string, { incomeCents: number; expenseCents: number }>();

    for (const row of incomes) {
      const key = new Date(row.date).toLocaleDateString('en-CA');
      const entry = map.get(key) ?? { incomeCents: 0, expenseCents: 0 };
      entry.incomeCents += row.cents;
      map.set(key, entry);
    }
    for (const row of expenses) {
      const key = new Date(row.date).toLocaleDateString('en-CA');
      const entry = map.get(key) ?? { incomeCents: 0, expenseCents: 0 };
      entry.expenseCents += row.cents;
      map.set(key, entry);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({ dateKey: key, ...data }));
  }

  /**
   * Retorna transações (receitas + despesas) agrupadas por dia, com paginação cursor-based.
   *
   * @param start  - início do intervalo (opcional)
   * @param end    - fim do intervalo (opcional)
   * @param opts   - paginação: limit (padrão 50) + before (cursor ISO da última linha da página anterior)
   *
   * Retorna { sections, hasMore, nextCursor }.
   * nextCursor é o ISO date da última transação retornada — passar como `before` na próxima página.
   */
  static async getTransactionHistory(
    start?: Date,
    end?: Date,
    opts?: { limit?: number; before?: string },
  ): Promise<PagedTransactionResult> {
    const db     = await getDatabase();
    const LIMIT  = opts?.limit ?? PAGE_SIZE_DEFAULT;
    const before = opts?.before ?? null;

    const hasRangeFilter = start !== undefined && end !== undefined;
    const startISO = hasRangeFilter ? start!.toISOString() : null;
    const endISO   = hasRangeFilter ? end!.toISOString()   : null;
    const hasCursor = before !== null;

    // Monta cláusula WHERE e parâmetros para cada branch do UNION ALL
    const buildBranch = (dateCol: string): { where: string; params: (string | null)[] } => {
      const conds: string[]           = [];
      const params: (string | null)[] = [];
      if (hasRangeFilter) { conds.push(`${dateCol} BETWEEN ? AND ?`); params.push(startISO, endISO); }
      if (hasCursor)      { conds.push(`${dateCol} < ?`);             params.push(before); }
      return { where: conds.length ? `WHERE ${conds.join(' AND ')}` : '', params };
    };

    const inc = buildBranch('i.received_at');
    const exp = buildBranch('e.spent_at');

    // Busca LIMIT+1 para detectar hasMore sem query extra
    const rows = await db.getAllAsync<{
      id: string;
      type: string;
      amount_cents: number;
      date: string;
      label: string;
      color: string | null;
      icon: string | null;
      notes: string | null;
      ref_id: string;
    }>(`
      SELECT
        i.id, 'income' as type, i.amount_cents, i.received_at as date,
        s.name as label, s.color, s.icon, i.notes, i.source_id as ref_id
      FROM incomes i
      JOIN income_sources s ON i.source_id = s.id
      ${inc.where}
      UNION ALL
      SELECT
        e.id, 'expense' as type, e.amount_cents, e.spent_at as date,
        c.name as label, c.color, c.icon, e.notes, e.category_id as ref_id
      FROM expenses e
      JOIN expense_categories c ON e.category_id = c.id
      ${exp.where}
      ORDER BY date DESC
      LIMIT ?
    `, [...inc.params, ...exp.params, LIMIT + 1]);

    const hasMore    = rows.length > LIMIT;
    if (hasMore) rows.pop();                                              // descarta sentinela
    const nextCursor = hasMore && rows.length > 0
      ? rows[rows.length - 1].date
      : null;

    // Agrupa por dia em horário local (evita bug UTC-3)
    const grouped = new Map<string, UnifiedTransaction[]>();
    for (const row of rows) {
      const dk = new Date(row.date).toLocaleDateString('en-CA');
      if (!grouped.has(dk)) grouped.set(dk, []);
      grouped.get(dk)!.push({
        id: row.id,
        type: row.type as 'income' | 'expense',
        amountCents: row.amount_cents,
        date: row.date,
        label: row.label,
        color: row.color,
        icon: row.icon,
        notes: row.notes,
        refId: row.ref_id,
      });
    }

    const today        = new Date();
    const todayKey     = today.toLocaleDateString('en-CA');
    const yesterday    = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toLocaleDateString('en-CA');

    const sections: TransactionSection[] = [];
    for (const [dk, transactions] of grouped) {
      let title: string;
      if      (dk === todayKey)     title = 'Hoje';
      else if (dk === yesterdayKey) title = 'Ontem';
      else {
        const [year, month, day] = dk.split('-');
        title = `${day}/${month}/${year}`;
      }
      sections.push({ title, dateKey: dk, data: transactions });
    }

    return { sections, hasMore, nextCursor };
  }
}

