/**
 * Testes do TransactionsRepository.
 * Estratégia: mock de `getDatabase` retornando um db fake com jest.fn().
 */

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockDb = {
  getAllAsync: jest.fn(),
  runAsync: jest.fn(),
  execAsync: jest.fn(),
};

jest.mock('@/infrastructure/db/sqlite', () => ({
  getDatabase: jest.fn(() => Promise.resolve(mockDb)),
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-1234'),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

import { TransactionsRepository } from '../TransactionsRepository';

const makeRow = (overrides: Partial<{
  id: string; type: string; amount_cents: number; date: string;
  label: string; color: string | null; icon: string | null;
  notes: string | null; ref_id: string;
}> = {}) => ({
  id: 'row-id-001', type: 'income', amount_cents: 5000,
  date: '2026-04-20T10:00:00.000Z', label: 'Uber',
  color: '#000000', icon: 'car', notes: null, ref_id: 'source-1',
  ...overrides,
});

beforeEach(() => { jest.clearAllMocks(); });

// ── getTodaySummary ────────────────────────────────────────────────────────────

describe('getTodaySummary', () => {
  it('retorna totais corretos de receita, despesa e líquido', async () => {
    mockDb.getAllAsync
      .mockResolvedValueOnce([{ total: 10000 }])
      .mockResolvedValueOnce([{ total: 3000 }]);

    const result = await TransactionsRepository.getTodaySummary();

    expect(result.incomes).toBe(10000);
    expect(result.expenses).toBe(3000);
    expect(result.net).toBe(7000);
  });

  it('retorna zero quando não há transações', async () => {
    mockDb.getAllAsync
      .mockResolvedValueOnce([{ total: null }])
      .mockResolvedValueOnce([{ total: null }]);

    const result = await TransactionsRepository.getTodaySummary();

    expect(result.incomes).toBe(0);
    expect(result.expenses).toBe(0);
    expect(result.net).toBe(0);
  });
});

// ── addIncome ─────────────────────────────────────────────────────────────────

describe('addIncome', () => {
  it('chama runAsync com os parâmetros corretos', async () => {
    mockDb.runAsync.mockResolvedValue(undefined);
    const date = new Date('2026-04-20T10:00:00.000Z');

    await TransactionsRepository.addIncome('source-1', 5000, date, 'surge duplo');

    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
    const [sql, params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO incomes');
    expect(params).toContain('mock-uuid-1234');
    expect(params).toContain('source-1');
    expect(params).toContain(5000);
    expect(params).toContain('surge duplo');
    expect(params).toContain(date.toISOString());
  });

  it('usa null para notes quando não informado', async () => {
    mockDb.runAsync.mockResolvedValue(undefined);

    await TransactionsRepository.addIncome('source-1', 5000);

    const [, params] = mockDb.runAsync.mock.calls[0];
    expect(params).toContain(null);
  });
});

// ── addExpense ────────────────────────────────────────────────────────────────

describe('addExpense', () => {
  it('chama runAsync com os parâmetros corretos', async () => {
    mockDb.runAsync.mockResolvedValue(undefined);
    const date = new Date('2026-04-20T10:00:00.000Z');

    await TransactionsRepository.addExpense('cat-1', 3000, date, 'pneu');

    const [sql, params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO expenses');
    expect(params).toContain('cat-1');
    expect(params).toContain(3000);
    expect(params).toContain('pneu');
  });
});

// ── deleteTransaction ─────────────────────────────────────────────────────────

describe('deleteTransaction', () => {
  it('deleta da tabela incomes quando type = income', async () => {
    mockDb.runAsync.mockResolvedValue(undefined);

    await TransactionsRepository.deleteTransaction('id-abc', 'income');

    const [sql, params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('incomes');
    expect(params).toContain('id-abc');
  });

  it('deleta da tabela expenses quando type = expense', async () => {
    mockDb.runAsync.mockResolvedValue(undefined);

    await TransactionsRepository.deleteTransaction('id-xyz', 'expense');

    const [sql] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('expenses');
  });
});

// ── getTransactionHistory ─────────────────────────────────────────────────────

describe('getTransactionHistory', () => {
  it('retorna sections vazias quando não há transações', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);

    const result = await TransactionsRepository.getTransactionHistory();

    expect(result).toHaveLength(0);
  });

  it('agrupa transações do mesmo dia local na mesma seção', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      makeRow({ id: 'a', date: '2026-04-20T13:00:00.000Z', amount_cents: 1000 }),
      makeRow({ id: 'b', date: '2026-04-20T18:00:00.000Z', amount_cents: 2000 }),
    ]);

    const result = await TransactionsRepository.getTransactionHistory();

    expect(result).toHaveLength(1);
    expect(result[0].data).toHaveLength(2);
  });

  it('cria seções separadas para dias diferentes', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      makeRow({ id: 'a', date: '2026-04-20T10:00:00.000Z' }),
      makeRow({ id: 'b', date: '2026-04-19T10:00:00.000Z' }),
    ]);

    const result = await TransactionsRepository.getTransactionHistory();

    expect(result).toHaveLength(2);
  });

  it('passa start/end como parâmetros SQL quando fornecidos', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    const start = new Date('2026-04-01T00:00:00.000Z');
    const end   = new Date('2026-04-30T23:59:59.999Z');

    await TransactionsRepository.getTransactionHistory(start, end);

    const [, params] = mockDb.getAllAsync.mock.calls[0];
    expect(params).toContain(start.toISOString());
    expect(params).toContain(end.toISOString());
  });

  it('não passa parâmetros SQL quando start/end omitidos', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);

    await TransactionsRepository.getTransactionHistory();

    const [, params] = mockDb.getAllAsync.mock.calls[0];
    expect(params).toEqual([]);
  });
});
