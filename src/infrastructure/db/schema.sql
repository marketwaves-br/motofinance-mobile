-- Schema SQL for MotoFinance Mobile

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
