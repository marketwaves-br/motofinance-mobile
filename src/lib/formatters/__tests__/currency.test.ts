import {
  formatBRL,
  centsToMaskedBRL,
  applyBRLMask,
  parseBRLToCents,
} from '../currency';

describe('formatBRL', () => {
  it('formata centavos para string BRL canônica', () => {
    expect(formatBRL(4550)).toBe('R$\u00a045,50');
  });

  it('formata zero', () => {
    expect(formatBRL(0)).toBe('R$\u00a00,00');
  });

  it('formata valores grandes', () => {
    expect(formatBRL(100000)).toBe('R$\u00a01.000,00');
  });
});

describe('centsToMaskedBRL', () => {
  it('converte centavos para máscara de input', () => {
    expect(centsToMaskedBRL(4550)).toBe('R$ 45,50');
  });

  it('converte zero para R$ 0,00', () => {
    expect(centsToMaskedBRL(0)).toBe('R$ 0,00');
  });

  it('separa milhares com ponto', () => {
    expect(centsToMaskedBRL(100000)).toBe('R$ 1.000,00');
    expect(centsToMaskedBRL(123456789)).toBe('R$ 1.234.567,89');
  });

  it('não aceita valores negativos (retorna R$ 0,00)', () => {
    expect(centsToMaskedBRL(-100)).toBe('R$ 0,00');
  });

  it('trunca casas decimais de float', () => {
    expect(centsToMaskedBRL(4550.9)).toBe('R$ 45,50');
  });
});

describe('applyBRLMask', () => {
  it('retorna string vazia para input vazio', () => {
    expect(applyBRLMask('')).toBe('');
  });

  it('retorna string vazia para input sem dígitos', () => {
    expect(applyBRLMask('R$ ,  ')).toBe('');
    expect(applyBRLMask('abc')).toBe('');
  });

  it('aplica máscara a string de dígitos', () => {
    expect(applyBRLMask('4550')).toBe('R$ 45,50');
    expect(applyBRLMask('12345')).toBe('R$ 123,45');
  });

  it('aplica máscara sobre texto já mascarado (idempotente via dígitos)', () => {
    const first = applyBRLMask('4550');
    const second = applyBRLMask(first);
    expect(second).toBe(first);
  });

  it('filtra caracteres não-numéricos', () => {
    expect(applyBRLMask('R$ 45,50')).toBe('R$ 45,50');
  });

  it('respeita o limite de 11 dígitos', () => {
    const result = applyBRLMask('999999999999'); // 12 dígitos
    expect(result).toBe('R$ 9.999.999.999,99');
  });
});

describe('parseBRLToCents', () => {
  it('converte máscara BRL para centavos', () => {
    expect(parseBRLToCents('R$ 45,50')).toBe(4550);
  });

  it('retorna 0 para string vazia', () => {
    expect(parseBRLToCents('')).toBe(0);
  });

  it('retorna 0 para string sem dígitos', () => {
    expect(parseBRLToCents('R$ ,')).toBe(0);
  });

  it('responde corretamente a valores grandes com separador de milhar', () => {
    expect(parseBRLToCents('R$ 1.234,56')).toBe(123456);
  });

  it('vai-e-vem (ida e volta com centsToMaskedBRL)', () => {
    const original = 4550;
    expect(parseBRLToCents(centsToMaskedBRL(original))).toBe(original);
  });

  it('vai-e-vem com valor grande', () => {
    const original = 999999999;
    expect(parseBRLToCents(centsToMaskedBRL(original))).toBe(original);
  });

  it('respeita MAX_CENTS', () => {
    const maxMasked = 'R$ 9.999.999.999,99';
    expect(parseBRLToCents(maxMasked)).toBe(999_999_999_999);
  });
});
