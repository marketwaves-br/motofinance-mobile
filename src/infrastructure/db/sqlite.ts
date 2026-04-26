import * as SQLite from 'expo-sqlite';
import { runSeed } from './seed';

let _db: SQLite.SQLiteDatabase | null = null;

const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (_db) {
    // Validate existing connection with a lightweight query
    try {
      await _db.runAsync('SELECT 1');
      return _db;
    } catch {
      // Connection is stale (hot-reload, backgrounding, etc.) — reopen
      console.warn('SQLite connection stale, reopening...');
      _db = null;
    }
  }
  _db = await SQLite.openDatabaseAsync('motofinance.db');
  await _db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return _db;
};

export const initDatabase = async () => {
  try {
    const db = await getDatabase();
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        activity_type TEXT,
        currency_code TEXT NOT NULL DEFAULT 'BRL',
        week_starts_on INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS income_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        icon TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS expense_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'variable',
        color TEXT,
        icon TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS incomes (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        received_at TEXT NOT NULL,
        payment_method TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (source_id) REFERENCES income_sources(id)
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        spent_at TEXT NOT NULL,
        expense_kind TEXT NOT NULL DEFAULT 'variable',
        is_recurring INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES expense_categories(id)
      );

      CREATE TABLE IF NOT EXISTS financial_goals (
        id TEXT PRIMARY KEY,
        period TEXT NOT NULL,
        goal_type TEXT NOT NULL DEFAULT 'net',
        target_amount_cents INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        id TEXT PRIMARY KEY,
        theme TEXT NOT NULL DEFAULT 'system',
        onboarding_completed INTEGER NOT NULL DEFAULT 0,
        enable_goals INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Migration defensiva: adiciona sort_order se não existir (devices com app já instalado)
    // SQLite retorna erro se a coluna já existe — capturamos silenciosamente
    try {
      await db.execAsync(`ALTER TABLE income_sources ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;`);
    } catch { /* coluna já existe */ }
    try {
      await db.execAsync(`ALTER TABLE expense_categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;`);
    } catch { /* coluna já existe */ }

    // Índices de performance (idempotentes via IF NOT EXISTS).
    // Justificativa: SQLite não cria índice automático em FK nem em colunas de data.
    // Com ~3k+ transações (1 ano de uso real) os reports passam a fazer full scan
    // e nested-loop join — estes índices trazem custo O(log n) onde era O(n).
    await db.execAsync(`
      -- Filtros por período em BETWEEN (today summary, reports, breakdowns)
      CREATE INDEX IF NOT EXISTS idx_incomes_received_at ON incomes(received_at);
      CREATE INDEX IF NOT EXISTS idx_expenses_spent_at ON expenses(spent_at);

      -- JOINs em reports (bySource / byCategory)
      CREATE INDEX IF NOT EXISTS idx_incomes_source_id ON incomes(source_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);

      -- Listagem de chips: WHERE is_active = 1 ORDER BY sort_order
      CREATE INDEX IF NOT EXISTS idx_income_sources_active_order
        ON income_sources(is_active, sort_order);
      CREATE INDEX IF NOT EXISTS idx_expense_categories_active_order
        ON expense_categories(is_active, sort_order);

      -- Metas ativas por período (GoalsRepository)
      CREATE INDEX IF NOT EXISTS idx_financial_goals_period_type
        ON financial_goals(period, goal_type, is_active);
    `);

    // Auto-seed data
    await runSeed(db);
    
    return db;
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
    throw error;
  }
};

/**
 * Fecha a conexão ativa e reseta o singleton.
 * Necessário antes de sobrescrever o arquivo .db no restore de backup.
 */
export const resetDatabase = async (): Promise<void> => {
  if (_db) {
    try { await _db.closeAsync(); } catch { /* ignora erros de fechamento */ }
    _db = null;
  }
};

export { getDatabase };
