import { z } from 'zod';

const MAX_NAME_LEN = 80;
const MAX_ACTIVITY_LEN = 80;

export const profileSchema = z.object({
  fullName: z
    .string({ error: 'Informe seu nome ou apelido.' })
    .trim()
    .min(1, 'Informe seu nome ou apelido.')
    .max(MAX_NAME_LEN, `Máximo de ${MAX_NAME_LEN} caracteres.`),

  activityType: z
    .string()
    .trim()
    .max(MAX_ACTIVITY_LEN, `Máximo de ${MAX_ACTIVITY_LEN} caracteres.`)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : '')),
});

export type ProfileInput = z.infer<typeof profileSchema>;
