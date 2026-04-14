import * as SQLite from 'expo-sqlite';

export const runSeed = async (db: SQLite.SQLiteDatabase) => {
  console.log('Running auto-seed...');
  const now = new Date().toISOString();

  // Seed default income sources (sort_order define a ordem inicial de exibição)
  const incomeSources = [
    { id: '1', name: 'Uber',       color: '#000000', icon: 'car',                sortOrder: 0, default: 1 },
    { id: '2', name: '99',         color: '#FFD100', icon: 'car',                sortOrder: 1, default: 1 },
    { id: '3', name: 'iFood',      color: '#EA1D2C', icon: 'bicycle',            sortOrder: 2, default: 1 },
    { id: '4', name: 'Particular', color: '#10B981', icon: 'person',             sortOrder: 3, default: 1 },
    { id: '5', name: 'Gorjeta',    color: '#F59E0B', icon: 'cash',               sortOrder: 4, default: 1 },
    { id: '6', name: 'Outros',     color: '#6B7280', icon: 'ellipsis-horizontal', sortOrder: 5, default: 1 },
  ];

  for (const source of incomeSources) {
    await db.runAsync(
      `INSERT OR IGNORE INTO income_sources (id, name, color, icon, is_default, is_active, sort_order, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [source.id, source.name, source.color, source.icon, source.default, source.sortOrder, now, now]
    );
  }

  // Seed default expense categories (sort_order define a ordem inicial de exibição)
  const expenseCategories = [
    { id: '1', name: 'Combustível',     type: 'variable', color: '#EF4444', icon: 'water',               sortOrder: 0, default: 1 },
    { id: '2', name: 'Alimentação',     type: 'variable', color: '#F97316', icon: 'restaurant',           sortOrder: 1, default: 1 },
    { id: '3', name: 'Manutenção',      type: 'variable', color: '#8B5CF6', icon: 'build',                sortOrder: 2, default: 1 },
    { id: '4', name: 'Internet/Celular',type: 'fixed',    color: '#3B82F6', icon: 'wifi',                 sortOrder: 3, default: 1 },
    { id: '5', name: 'Outros',          type: 'variable', color: '#6B7280', icon: 'ellipsis-horizontal',  sortOrder: 4, default: 1 },
  ];

  for (const category of expenseCategories) {
    await db.runAsync(
      `INSERT OR IGNORE INTO expense_categories (id, name, type, color, icon, is_default, is_active, sort_order, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [category.id, category.name, category.type, category.color, category.icon, category.default, category.sortOrder, now, now]
    );
  }
  
  console.log('Seed completed successfully!');
};
