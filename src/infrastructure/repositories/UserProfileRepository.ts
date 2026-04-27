import { getDatabase } from '@/infrastructure/db/sqlite';
import * as Crypto from 'expo-crypto';

export class UserProfileRepository {
  /**
   * Salva ou atualiza o perfil do motorista no SQLite.
   * Se já existir um registro, atualiza. Caso contrário, insere.
   */
  static async saveProfile(fullName: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const existing = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM user_profile LIMIT 1`
    );

    if (existing.length > 0) {
      await db.runAsync(
        `UPDATE user_profile SET full_name = ?, updated_at = ? WHERE id = ?`,
        [fullName, now, existing[0].id]
      );
    } else {
      const id = Crypto.randomUUID();
      await db.runAsync(
        `INSERT INTO user_profile (id, full_name, activity_type, currency_code, week_starts_on, created_at, updated_at)
         VALUES (?, ?, '', 'BRL', 1, ?, ?)`,
        [id, fullName, now, now]
      );
    }
  }

  /**
   * Recupera o perfil do motorista do SQLite.
   * Retorna null se nenhum perfil existir.
   */
  static async getProfile(): Promise<{ fullName: string } | null> {
    const db = await getDatabase();
    const result = await db.getAllAsync<{ full_name: string }>(
      `SELECT full_name FROM user_profile LIMIT 1`
    );

    if (result.length === 0) return null;

    return { fullName: result[0].full_name };
  }
}
