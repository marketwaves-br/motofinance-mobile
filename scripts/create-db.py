import os

files = {
    "src/types/database.ts": """export type UUID = string;
export type IsoDateString = string;
""",
    "src/domain/entities/Income.ts": """import { UUID, IsoDateString } from '@/types/database';

export interface Income {
  id: UUID;
  sourceId: UUID;
  amountCents: number;
  receivedAt: IsoDateString;
  paymentMethod?: string | null;
  notes?: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
""",
    "src/domain/entities/Expense.ts": """import { UUID, IsoDateString } from '@/types/database';

export interface Expense {
  id: UUID;
  categoryId: UUID;
  amountCents: number;
  spentAt: IsoDateString;
  expenseKind: 'fixed' | 'variable';
  isRecurring: boolean;
  notes?: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
""",
    "src/domain/entities/Goal.ts": """import { UUID, IsoDateString } from '@/types/database';

export interface FinancialGoal {
  id: UUID;
  period: 'daily' | 'weekly' | 'monthly';
  goalType: 'gross' | 'net';
  targetAmountCents: number;
  isActive: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
""",
    "src/domain/entities/UserProfile.ts": """import { UUID, IsoDateString } from '@/types/database';

export interface UserProfile {
  id: UUID;
  fullName: string;
  activityType: string | null;
  currencyCode: string;
  weekStartsOn: number;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
""",
    "src/infrastructure/db/schema.sql": """-- Schema SQL for MotoFinance Mobile

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
""",
    "src/infrastructure/db/seed.ts": """import * as SQLite from 'expo-sqlite';

export const runSeed = async (db: SQLite.SQLiteDatabase) => {
  console.log('Running auto-seed...');
  const now = new Date().toISOString();

  // Seed default income sources
  const incomeSources = [
    { id: '1', name: 'Uber', color: '#000000', icon: 'car', default: 1 },
    { id: '2', name: '99', color: '#FFD100', icon: 'car', default: 1 },
    { id: '3', name: 'iFood', color: '#EA1D2C', icon: 'bicycle', default: 1 },
    { id: '4', name: 'Particular', color: '#10B981', icon: 'person', default: 1 },
    { id: '5', name: 'Gorjeta', color: '#F59E0B', icon: 'cash', default: 1 },
    { id: '6', name: 'Outros', color: '#6B7280', icon: 'ellipsis-horizontal', default: 1 },
  ];

  for (const source of incomeSources) {
    await db.runAsync(
      `INSERT OR IGNORE INTO income_sources (id, name, color, icon, is_default, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [source.id, source.name, source.color, source.icon, source.default, now, now]
    );
  }

  // Seed default expense categories
  const expenseCategories = [
    { id: '1', name: 'Combustível', type: 'variable', color: '#EF4444', icon: 'water', default: 1 },
    { id: '2', name: 'Alimentação', type: 'variable', color: '#F97316', icon: 'restaurant', default: 1 },
    { id: '3', name: 'Manutenção', type: 'variable', color: '#8B5CF6', icon: 'build', default: 1 },
    { id: '4', name: 'Internet/Celular', type: 'fixed', color: '#3B82F6', icon: 'wifi', default: 1 },
    { id: '5', name: 'Outros', type: 'variable', color: '#6B7280', icon: 'ellipsis-horizontal', default: 1 },
  ];

  for (const category of expenseCategories) {
    await db.runAsync(
      `INSERT OR IGNORE INTO expense_categories (id, name, type, color, icon, is_default, is_active, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [category.id, category.name, category.type, category.color, category.icon, category.default, now, now]
    );
  }
  
  console.log('Seed completed successfully!');
};
""",
    "src/infrastructure/db/sqlite.ts": """import * as SQLite from 'expo-sqlite';
import { runSeed } from './seed';

const getDatabase = async () => {
  return await SQLite.openDatabaseAsync('motofinance.db');
};

export const initDatabase = async () => {
  try {
    const db = await getDatabase();
    
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
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
    
    // Auto-seed data
    await runSeed(db);
    
    return db;
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
    throw error;
  }
};

export { getDatabase };
"""
}

for path, content in files.items():
    full_path = os.path.join("d:/MotoFinance/motofinance-mobile", path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print("DB Layer successfully generated!")
