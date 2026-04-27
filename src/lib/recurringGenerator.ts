import { RecurringRulesRepository } from '@/infrastructure/repositories/RecurringRulesRepository';
import { TransactionsRepository } from '@/infrastructure/repositories/TransactionsRepository';
import type { RecurringRule } from '@/infrastructure/repositories/RecurringRulesRepository';

// ─── Helpers de data ─────────────────────────────────────────────────────────

/** Retorna a data de hoje como 'YYYY-MM-DD' em horário local. */
function todayKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

/** Constrói um objeto Date no meio-dia local a partir de 'YYYY-MM-DD'. */
function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/** Avança uma data 'YYYY-MM-DD' em N dias, retornando nova string. */
function addDays(key: string, days: number): string {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-CA');
}

/** Último dia do mês (1-indexed). */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// ─── Cálculo de datas devidas ─────────────────────────────────────────────────

/**
 * Retorna todas as datas (como 'YYYY-MM-DD') em que a regra deve gerar
 * um lançamento, dentro do intervalo [fromKey, toKey] (inclusivo).
 */
export function getDueDates(
  rule: Pick<RecurringRule, 'frequency' | 'day_of_week' | 'day_of_month'>,
  fromKey: string,
  toKey: string,
): string[] {
  const dates: string[] = [];
  let current = fromKey;

  while (current <= toKey) {
    const d   = dateFromKey(current);
    let isDue = false;

    if (rule.frequency === 'daily') {
      isDue = true;

    } else if (rule.frequency === 'weekly') {
      isDue = d.getDay() === rule.day_of_week;

    } else if (rule.frequency === 'monthly') {
      const dom       = rule.day_of_month!;
      const lastDay   = lastDayOfMonth(d.getFullYear(), d.getMonth() + 1);
      const effective = Math.min(dom, lastDay);   // ex: dia 31 em fev → dia 28/29
      isDue = d.getDate() === effective;
    }

    if (isDue) dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

// ─── Geração de lançamentos pendentes ────────────────────────────────────────

/**
 * Verifica todas as regras ativas e gera os lançamentos em atraso.
 * Deve ser chamado uma vez por sessão (ex: no startup do app).
 *
 * @returns Número total de lançamentos criados.
 */
export async function generatePendingTransactions(): Promise<number> {
  const rules = await RecurringRulesRepository.getActiveRules();
  const today = todayKey();
  let total   = 0;

  for (const rule of rules) {
    try {
      // fromKey: primeiro dia a verificar para esta regra
      const fromKey = rule.last_generated_date
        ? addDays(rule.last_generated_date, 1)
        : rule.start_date;

      // Nada a fazer ainda (regra com start_date no futuro)
      if (fromKey > today) {
        await RecurringRulesRepository.updateLastGeneratedDate(rule.id, today);
        continue;
      }

      const dueDates = getDueDates(rule, fromKey, today);

      for (const dk of dueDates) {
        const date = dateFromKey(dk);

        if (rule.type === 'income') {
          await TransactionsRepository.addIncome(
            rule.ref_id, rule.amount_cents, date, rule.notes ?? undefined
          );
        } else {
          await TransactionsRepository.addExpense(
            rule.ref_id, rule.amount_cents, date, rule.notes ?? undefined
          );
        }
        total++;
      }

      // Marca a regra como processada até hoje, mesmo se nada foi gerado
      await RecurringRulesRepository.updateLastGeneratedDate(rule.id, today);

    } catch (err) {
      console.error(`[recurringGenerator] Erro na regra ${rule.id}:`, err);
      // Continua para as próximas regras — falha isolada
    }
  }

  if (total > 0) {
    console.log(`[recurringGenerator] ${total} lançamento(s) recorrente(s) gerado(s).`);
  }

  return total;
}
