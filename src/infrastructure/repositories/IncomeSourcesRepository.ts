import { getDatabase } from '@/infrastructure/db/sqlite';
import * as Crypto from 'expo-crypto';

export class IncomeSourcesRepository {
  static async getAllSources() {
    const db = await getDatabase();
    return db.getAllAsync<{id: string, name: string, is_active: number, color: string, icon: string, sort_order: number}>(
      `SELECT * FROM income_sources 
       ORDER BY is_active DESC, sort_order ASC`
    );
  }

  static async getActiveSources() {
    const db = await getDatabase();
    return db.getAllAsync<{id: string, name: string, color: string, icon: string, sort_order: number}>(
      `SELECT * FROM income_sources WHERE is_active = 1 
       ORDER BY sort_order ASC`
    );
  }

  static async addSource(name: string, color: string = '#E2E8F0', icon: string = 'business') {
    const db = await getDatabase();
    const id = Crypto.randomUUID();
    const now = new Date().toISOString();

    // Nova fonte recebe sort_order = max atual + 1
    const maxRes = await db.getAllAsync<{maxOrder: number}>(
      `SELECT COALESCE(MAX(sort_order), -1) as maxOrder FROM income_sources`
    );
    const nextOrder = (maxRes[0]?.maxOrder ?? -1) + 1;

    await db.runAsync(
      `INSERT INTO income_sources (id, name, color, icon, is_default, is_active, sort_order, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 0, 1, ?, ?, ?)`,
      [id, name, color, icon, nextOrder, now, now]
    );
    return id;
  }

  static async toggleSourceActive(id: string, isActive: boolean) {
    const db = await getDatabase();
    const now = new Date().toISOString();
    
    await db.runAsync(
      `UPDATE income_sources SET is_active = ?, updated_at = ? WHERE id = ?`,
      [isActive ? 1 : 0, now, id]
    );
  }

  /**
   * Persiste a nova ordem das fontes após drag & drop.
   * @param ids Array de IDs na nova ordem desejada (índice 0 = sort_order 0)
   */
  static async updateSourcesOrder(ids: string[]): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    for (let i = 0; i < ids.length; i++) {
      await db.runAsync(
        `UPDATE income_sources SET sort_order = ?, updated_at = ? WHERE id = ?`,
        [i, now, ids[i]]
      );
    }
  }
}
