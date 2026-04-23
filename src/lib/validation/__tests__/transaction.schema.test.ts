import { expenseSchema, incomeSchema, transactionSchema } from '../transaction.schema';

const validBase = {
  amountCents: 4550,
  refId: 'some-uuid-123',
  date: new Date('2026-04-20T10:00:00'),
  notes: undefined,
};

describe('transactionSchema — amountCents', () => {
  it('aceita valor positivo', () => {
    const result = transactionSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('rejeita zero', () => {
    const result = transactionSchema.safeParse({ ...validBase, amountCents: 0 });
    expect(result.success).toBe(false);
  });

  it('rejeita valor negativo', () => {
    const result = transactionSchema.safeParse({ ...validBase, amountCents: -100 });
    expect(result.success).toBe(false);
  });

  it('rejeita valor não-inteiro', () => {
    const result = transactionSchema.safeParse({ ...validBase, amountCents: 45.50 });
    expect(result.success).toBe(false);
  });

  it('rejeita string', () => {
    const result = transactionSchema.safeParse({ ...validBase, amountCents: 'R$ 45,50' });
    expect(result.success).toBe(false);
  });

  it('rejeita ausente', () => {
    const { amountCents: _, ...rest } = validBase;
    const result = transactionSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('transactionSchema — refId', () => {
  it('aceita refId válido', () => {
    const result = transactionSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('rejeita string vazia', () => {
    const result = transactionSchema.safeParse({ ...validBase, refId: '' });
    expect(result.success).toBe(false);
  });

  it('rejeita ausente', () => {
    const { refId: _, ...rest } = validBase;
    const result = transactionSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('transactionSchema — date', () => {
  it('aceita data de hoje', () => {
    const result = transactionSchema.safeParse({ ...validBase, date: new Date() });
    expect(result.success).toBe(true);
  });

  it('aceita data passada', () => {
    const result = transactionSchema.safeParse({ ...validBase, date: new Date('2025-01-01') });
    expect(result.success).toBe(true);
  });

  it('rejeita data futura (amanhã)', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = transactionSchema.safeParse({ ...validBase, date: tomorrow });
    expect(result.success).toBe(false);
  });

  it('rejeita ausente', () => {
    const { date: _, ...rest } = validBase;
    const result = transactionSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe('transactionSchema — notes', () => {
  it('aceita notes undefined', () => {
    const result = transactionSchema.safeParse({ ...validBase, notes: undefined });
    expect(result.success).toBe(true);
  });

  it('transforma string vazia em undefined', () => {
    const result = transactionSchema.safeParse({ ...validBase, notes: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBeUndefined();
  });

  it('aceita notes com texto', () => {
    const result = transactionSchema.safeParse({ ...validBase, notes: 'Surge duplo' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBe('Surge duplo');
  });

  it('faz trim de notes', () => {
    const result = transactionSchema.safeParse({ ...validBase, notes: '  surge  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBe('surge');
  });

  it('rejeita notes acima de 500 chars', () => {
    const result = transactionSchema.safeParse({ ...validBase, notes: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('aceita notes exatamente 500 chars', () => {
    const result = transactionSchema.safeParse({ ...validBase, notes: 'a'.repeat(500) });
    expect(result.success).toBe(true);
  });
});

describe('expenseSchema — mensagem específica de categoria', () => {
  it('rejeita refId vazio com mensagem de categoria', () => {
    const result = expenseSchema.safeParse({ ...validBase, refId: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      expect(msg).toMatch(/categoria/i);
    }
  });
});

describe('incomeSchema — mensagem específica de fonte', () => {
  it('rejeita refId vazio com mensagem de fonte', () => {
    const result = incomeSchema.safeParse({ ...validBase, refId: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0].message;
      expect(msg).toMatch(/fonte/i);
    }
  });
});
