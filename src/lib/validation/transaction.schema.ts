import { z } from 'zod';

/**
 * Schema compartilhado para Receita e Despesa.
 * O campo `amountCents` é validado em centavos (inteiro positivo) —
 * a conversão a partir da máscara "R$" acontece na camada do formulário.
 *
 * `refId` representa categoryId (despesa) ou sourceId (receita).
 */

const MAX_CENTS = 999_999_999_99;
const MAX_NOTES_LEN = 500;

const endOfToday = (): Date => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

export const transactionSchema = z.object({
  amountCents: z
    .number({ error: 'Informe o valor.' })
    .int('Valor inválido.')
    .positive('O valor deve ser maior que zero.')
    .max(MAX_CENTS, 'Valor acima do limite permitido.'),

  refId: z
    .string({ error: 'Selecione uma opção.' })
    .trim()
    .min(1, 'Selecione uma opção.'),

  date: z
    .date({ error: 'Data inválida.' })
    .max(endOfToday(), 'A data não pode ser futura.'),

  notes: z
    .string()
    .trim()
    .max(MAX_NOTES_LEN, `Máximo de ${MAX_NOTES_LEN} caracteres.`)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

/**
 * Mensagens específicas por variante — útil para customizar o label do erro
 * (ex.: "Selecione a categoria" vs "Selecione a fonte").
 */
export const expenseSchema = transactionSchema.extend({
  refId: z
    .string({ error: 'Selecione a categoria.' })
    .trim()
    .min(1, 'Selecione a categoria.'),
});

export const incomeSchema = transactionSchema.extend({
  refId: z
    .string({ error: 'Selecione a fonte.' })
    .trim()
    .min(1, 'Selecione a fonte.'),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
export type IncomeInput = z.infer<typeof incomeSchema>;
