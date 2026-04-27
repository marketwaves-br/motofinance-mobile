import { getDatabase } from '@/infrastructure/db/sqlite';
import * as Crypto from 'expo-crypto';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';
export type RecurringType      = 'income' | 'expense';

export interface RecurringRule {
  id: string;
  type: RecurringType;
  ref_id: string;
  amount_cents: number;
  frequency: RecurringFrequency;
  day_of_week: number | null;   // 0=Dom..6=Sáb — apenas para weekly
  day_of_month: number | null;  // 1–31          — apenas para monthly
  start_date: string;           // 'YYYY-MM-DD'
  notes: string | null;
  is_active: number;
  last_generated_date: string | null; // 'YYYY-MM-DD'
  created_at: string;
  updated_at: string;
}

export interface RecurringRuleWithLabel extends RecurringRule {
  label: string;
}

export type NewRecurringRule = Omit<
  RecurringRule,
  'id' | 'created_at' | 'updated_at' | 'last_generated_date'
>;

export class RecurringRulesRepository {
  /** Retorna todas as regras com o nome da fonte/categoria (JOIN). */
  static async getAllRules(): Promise<RecurringRuleWithLabel[]> {
    const db = await getDatabase();
    return db.getAllAsync<RecurringRuleWithLabel>(`
      SELECT r.*, COALESCE(s.name, c.name) AS label
      FROM recurring_rules r
      LEFT JOIN income_sources     s ON r.type = 'income'  AND r.ref_id = s.id
      LEFT JOIN expense_categories c ON r.type = 'expense' AND r.ref_id = c.id
      ORDER BY r.is_active DESC, r.created_at DESC
    `);
  }

  /** Retorna apenas as regras ativas (usada pelo gerador). */
  static async getActiveRules(): Promise<RecurringRule[]> {
    const db = await getDatabase();
    return db.getAllAsync<RecurringRule>(
      `SELECT * FROM recurring_rules WHERE is_active = 1`
    );
  }

  static async addRule(rule: NewRecurringRule): Promise<void> {
    const db  = await getDatabase();
    const id  = Crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO recurring_rules
         (id, type, ref_id, amount_cents, frequency, day_of_week, day_of_month,
          start_date, notes, is_active, last_generated_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      [
        id, rule.type, rule.ref_id, rule.amount_cents, rule.frequency,
        rule.day_of_week ?? null, rule.day_of_month ?? null,
        rule.start_date, rule.notes ?? null, rule.is_active, now, now,
      ]
    );
  }

  static async updateRule(id: string, rule: Omit<NewRecurringRule, 'is_active'>): Promise<void> {
    const db  = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE recurring_rules
       SET type = ?, ref_id = ?, amount_cents = ?, frequency = ?,
           day_of_week = ?, day_of_month = ?, start_date = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        rule.type, rule.ref_id, rule.amount_cents, rule.frequency,
        rule.day_of_week ?? null, rule.day_of_month ?? null,
        rule.start_date, rule.notes ?? null, now, id,
      ]
    );
  }

  static async toggleActive(id: string, isActive: boolean): Promise<void> {
    const db  = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE recurring_rules SET is_active = ?, updated_at = ? WHERE id = ?`,
      [isActive ? 1 : 0, now, id]
    );
  }

  /** Hard-delete — regras não são referenciadas por FKs. */
  static async deleteRule(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM recurring_rules WHERE id = ?`, [id]);
  }

  /** Atualizado pelo gerador após processar cada regra. */
  static async updateLastGeneratedDate(id: string, date: string): Promise<void> {
    const db  = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE recurring_rules SET last_generated_date = ?, updated_at = ? WHERE id = ?`,
      [date, now, id]
    );
  }
}
