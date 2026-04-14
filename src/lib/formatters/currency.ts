/**
 * Formata um valor em centavos para a representação monetária BRL.
 * Ex.: 4550 → "R$ 45,50"
 */
export const formatBRL = (cents: number): string => {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
