import { getDatabase } from '@/infrastructure/db/sqlite';
import * as Crypto from 'expo-crypto';

export type MonthlyGoals = {
  income: number | null;
  net: number | null;
};

export class GoalsRepository {
  static async getMonthlyGoals(): Promise<MonthlyGoals> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ goal_type: string; target_amount_cents: number }>(
      `SELECT goal_type, target_amount_cents FROM financial_goals WHERE period = 'monthly' AND is_active = 1`
    );

    const result: MonthlyGoals = { income: null, net: null };
    for (const row of rows) {
      if (row.goal_type === 'income') result.income = row.target_amount_cents;
      if (row.goal_type === 'net') result.net = row.target_amount_cents;
    }
    return result;
  }

  static async setMonthlyGoal(type: 'income' | 'net', amountCents: number | null): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const existing = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM financial_goals WHERE period = 'monthly' AND goal_type = ?`,
      [type]
    );

    if (existing.length > 0) {
      if (amountCents === null) {
        await db.runAsync(
          `UPDATE financial_goals SET is_active = 0, updated_at = ? WHERE id = ?`,
          [now, existing[0].id]
        );
      } else {
        await db.runAsync(
          `UPDATE financial_goals SET target_amount_cents = ?, is_active = 1, updated_at = ? WHERE id = ?`,
          [amountCents, now, existing[0].id]
        );
      }
    } else if (amountCents !== null) {
      const id = Crypto.randomUUID();
      await db.runAsync(
        `INSERT INTO financial_goals (id, period, goal_type, target_amount_cents, is_active, created_at, updated_at)
         VALUES (?, 'monthly', ?, ?, 1, ?, ?)`,
        [id, type, amountCents, now, now]
      );
    }
  }
}
