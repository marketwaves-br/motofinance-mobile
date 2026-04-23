import { z } from 'zod';

/**
 * Metas mensais. Ambos os campos podem ser `null` (desativado).
 * Valor 0 também é tratado como "não informado" na UI, mas o schema
 * aceita 0 explícito caso o usuário queira zerar uma meta.
 */

const MAX_CENTS = 999_999_999_99;

const goalCentsField = z
  .number()
  .int('Valor inválido.')
  .min(0, 'Valor inválido.')
  .max(MAX_CENTS, 'Valor acima do limite permitido.')
  .nullable();

export const goalsSchema = z.object({
  incomeCents: goalCentsField,
  netCents: goalCentsField,
});

export type GoalsInput = z.infer<typeof goalsSchema>;
