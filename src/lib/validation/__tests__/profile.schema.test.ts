import { profileSchema } from '../profile.schema';

describe('profileSchema — fullName', () => {
  it('aceita nome válido', () => {
    const result = profileSchema.safeParse({ fullName: 'João', activityType: '' });
    expect(result.success).toBe(true);
  });

  it('faz trim do nome', () => {
    const result = profileSchema.safeParse({ fullName: '  João  ', activityType: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fullName).toBe('João');
  });

  it('rejeita string vazia', () => {
    const result = profileSchema.safeParse({ fullName: '', activityType: '' });
    expect(result.success).toBe(false);
  });

  it('rejeita string apenas com espaços', () => {
    const result = profileSchema.safeParse({ fullName: '   ', activityType: '' });
    expect(result.success).toBe(false);
  });

  it('rejeita nome acima de 80 chars', () => {
    const result = profileSchema.safeParse({ fullName: 'a'.repeat(81), activityType: '' });
    expect(result.success).toBe(false);
  });

  it('aceita nome com exatamente 80 chars', () => {
    const result = profileSchema.safeParse({ fullName: 'a'.repeat(80), activityType: '' });
    expect(result.success).toBe(true);
  });
});

describe('profileSchema — activityType', () => {
  it('aceita activityType vazio (campo opcional)', () => {
    const result = profileSchema.safeParse({ fullName: 'João', activityType: '' });
    expect(result.success).toBe(true);
  });

  it('aceita activityType preenchido', () => {
    const result = profileSchema.safeParse({ fullName: 'João', activityType: 'Uber' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.activityType).toBe('Uber');
  });

  it('transforma activityType undefined em string vazia', () => {
    const result = profileSchema.safeParse({ fullName: 'João', activityType: undefined });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.activityType).toBe('');
  });

  it('rejeita activityType acima de 80 chars', () => {
    const result = profileSchema.safeParse({ fullName: 'João', activityType: 'a'.repeat(81) });
    expect(result.success).toBe(false);
  });
});
