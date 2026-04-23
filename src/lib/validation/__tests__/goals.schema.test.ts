import { goalsSchema } from '../goals.schema';

describe('goalsSchema', () => {
  it('aceita ambos os campos como null (metas desativadas)', () => {
    const result = goalsSchema.safeParse({ incomeCents: null, netCents: null });
    expect(result.success).toBe(true);
  });

  it('aceita valores positivos válidos', () => {
    const result = goalsSchema.safeParse({ incomeCents: 500000, netCents: 300000 });
    expect(result.success).toBe(true);
  });

  it('aceita zero (zerar meta)', () => {
    const result = goalsSchema.safeParse({ incomeCents: 0, netCents: 0 });
    expect(result.success).toBe(true);
  });

  it('rejeita valor negativo', () => {
    const result = goalsSchema.safeParse({ incomeCents: -100, netCents: null });
    expect(result.success).toBe(false);
  });

  it('rejeita valor não-inteiro', () => {
    const result = goalsSchema.safeParse({ incomeCents: 45.50, netCents: null });
    expect(result.success).toBe(false);
  });

  it('rejeita string', () => {
    const result = goalsSchema.safeParse({ incomeCents: 'R$ 500,00', netCents: null });
    expect(result.success).toBe(false);
  });

  it('aceita apenas incomeCents preenchido e netCents null', () => {
    const result = goalsSchema.safeParse({ incomeCents: 300000, netCents: null });
    expect(result.success).toBe(true);
  });
});
