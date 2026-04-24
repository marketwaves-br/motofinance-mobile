/**
 * Utilitários de formatação monetária BRL.
 * Toda a aritmética interna do app é feita em centavos (int).
 * A máscara de entrada "R$ 1.234,56" é uma camada de UI apenas.
 */

const MAX_CENTS = 999_999_999_999;

/**
 * Formata centavos para string BRL canônica via Intl.
 * Ex.: 4550 → "R$ 45,50"
 */
export const formatBRL = (cents: number): string => {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/**
 * Formata centavos para a máscara usada nos inputs (sem NBSP do Intl).
 * Ex.: 4550 → "R$ 45,50"; 0 → "R$ 0,00"
 */
export const centsToMaskedBRL = (cents: number): string => {
  const safe = Math.max(0, Math.floor(cents));
  const str = String(safe).padStart(3, '0');
  const dec = str.slice(-2);
  let int = str.slice(0, -2);
  int = parseInt(int, 10).toString();
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${int},${dec}`;
};

/**
 * Aplica a máscara BRL sobre o texto digitado pelo usuário.
 * Filtra não-dígitos e reconstrói "R$ 1.234,56".
 * Retorna string vazia se não houver dígito (permite placeholder).
 */
export const applyBRLMask = (text: string): string => {
  const numeric = text.replace(/\D/g, '');
  if (!numeric) return '';
  const capped = numeric.slice(0, 12);
  return centsToMaskedBRL(parseInt(capped, 10));
};

/**
 * Converte a máscara BRL de volta para centavos (int).
 * Ex.: "R$ 45,50" → 4550; "" → 0
 * Observação: o app trata valor zero como "não informado" na camada de validação.
 */
export const parseBRLToCents = (masked: string): number => {
  const digits = masked.replace(/\D/g, '');
  if (!digits) return 0;
  const cents = parseInt(digits, 10);
  if (!Number.isFinite(cents)) return 0;
  return Math.min(cents, MAX_CENTS);
};
