import { profileSchema } from '../profile.schema';

describe('profileSchema — fullName', () => {
  it('aceita nome válido', () => {
    const result = profileSchema.safeParse({ fullName: 'João' });
    expect(result.success).toBe(true);
  });

  it('faz trim do nome', () => {
    const result = profileSchema.safeParse({ fullName: '  João  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fullName).toBe('João');
  });

  it('rejeita string vazia', () => {
    const result = profileSchema.safeParse({ fullName: '' });
    expect(result.success).toBe(false);
  });

  it('rejeita string apenas com espaços', () => {
    const result = profileSchema.safeParse({ fullName: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejeita nome acima de 80 chars', () => {
    const result = profileSchema.safeParse({ fullName: 'a'.repeat(81) });
    expect(result.success).toBe(false);
  });

  it('aceita nome com exatamente 80 chars', () => {
    const result = profileSchema.safeParse({ fullName: 'a'.repeat(80) });
    expect(result.success).toBe(true);
  });
});
