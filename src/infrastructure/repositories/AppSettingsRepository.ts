import { getDatabase } from '@/infrastructure/db/sqlite';
import * as Crypto from 'expo-crypto';

export type ThemePreference = 'system' | 'light' | 'dark';

export class AppSettingsRepository {
  /**
   * Verifica se o onboarding foi concluído (persistido no SQLite).
   * Retorna false se não houver registro ou se onboarding_completed === 0.
   */
  static async isOnboardingCompleted(): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.getAllAsync<{ onboarding_completed: number }>(
      `SELECT onboarding_completed FROM app_settings LIMIT 1`
    );
    return result.length > 0 && result[0].onboarding_completed === 1;
  }

  static async getNotificationSettings(): Promise<{ enabled: boolean; reminderTime: string }> {
    const db = await getDatabase();
    const result = await db.getAllAsync<{ notifications_enabled: number; reminder_time: string }>(
      `SELECT notifications_enabled, reminder_time FROM app_settings LIMIT 1`
    );
    return {
      enabled:      (result[0]?.notifications_enabled ?? 1) === 1,
      reminderTime: result[0]?.reminder_time ?? '20:00',
    };
  }

  static async setNotificationsEnabled(enabled: boolean): Promise<void> {
    const db  = await getDatabase();
    const now = new Date().toISOString();
    const existing = await db.getAllAsync<{ id: string }>(`SELECT id FROM app_settings LIMIT 1`);
    if (existing.length > 0) {
      await db.runAsync(
        `UPDATE app_settings SET notifications_enabled = ?, updated_at = ? WHERE id = ?`,
        [enabled ? 1 : 0, now, existing[0].id]
      );
    } else {
      const id = Crypto.randomUUID();
      await db.runAsync(
        `INSERT INTO app_settings (id, theme, onboarding_completed, enable_goals, notifications_enabled, reminder_time, created_at, updated_at)
         VALUES (?, 'system', 0, 1, ?, '20:00', ?, ?)`,
        [id, enabled ? 1 : 0, now, now]
      );
    }
  }

  static async setReminderTime(time: string): Promise<void> {
    const db  = await getDatabase();
    const now = new Date().toISOString();
    const existing = await db.getAllAsync<{ id: string }>(`SELECT id FROM app_settings LIMIT 1`);
    if (existing.length > 0) {
      await db.runAsync(
        `UPDATE app_settings SET reminder_time = ?, updated_at = ? WHERE id = ?`,
        [time, now, existing[0].id]
      );
    } else {
      const id = Crypto.randomUUID();
      await db.runAsync(
        `INSERT INTO app_settings (id, theme, onboarding_completed, enable_goals, notifications_enabled, reminder_time, created_at, updated_at)
         VALUES (?, 'system', 0, 1, 1, ?, ?, ?)`,
        [id, time, now, now]
      );
    }
  }

  static async getTheme(): Promise<ThemePreference> {
    const db = await getDatabase();
    const result = await db.getAllAsync<{ theme: string }>(
      `SELECT theme FROM app_settings LIMIT 1`
    );
    const value = result[0]?.theme ?? 'system';
    return (['system', 'light', 'dark'].includes(value) ? value : 'system') as ThemePreference;
  }

  static async setTheme(preference: ThemePreference): Promise<void> {
    const db  = await getDatabase();
    const now = new Date().toISOString();
    const existing = await db.getAllAsync<{ id: string }>(`SELECT id FROM app_settings LIMIT 1`);
    if (existing.length > 0) {
      await db.runAsync(
        `UPDATE app_settings SET theme = ?, updated_at = ? WHERE id = ?`,
        [preference, now, existing[0].id]
      );
    } else {
      const id = Crypto.randomUUID();
      await db.runAsync(
        `INSERT INTO app_settings (id, theme, onboarding_completed, enable_goals, created_at, updated_at)
         VALUES (?, ?, 0, 1, ?, ?)`,
        [id, preference, now, now]
      );
    }
  }

  /**
   * Marca o onboarding como concluído no SQLite.
   * Usa INSERT OR REPLACE para garantir idempotência.
   */
  static async completeOnboarding(): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    // Verifica se já existe registro
    const existing = await db.getAllAsync<{ id: string }>(
      `SELECT id FROM app_settings LIMIT 1`
    );

    if (existing.length > 0) {
      await db.runAsync(
        `UPDATE app_settings SET onboarding_completed = 1, updated_at = ? WHERE id = ?`,
        [now, existing[0].id]
      );
    } else {
      const id = Crypto.randomUUID();
      await db.runAsync(
        `INSERT INTO app_settings (id, theme, onboarding_completed, enable_goals, created_at, updated_at)
         VALUES (?, 'system', 1, 1, ?, ?)`,
        [id, now, now]
      );
    }
  }
}
