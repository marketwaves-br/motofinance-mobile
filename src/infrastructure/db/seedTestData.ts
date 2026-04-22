import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

/**
 * Gera 12 meses de dados realistas para um motofretista.
 * Meses com prejuízo: mês 9 atrás (reforma do motor) e mês 4 atrás (pneus + freios + acidente).
 * Retorna o total de transações inseridas.
 */
export async function seedTestData(db: SQLite.SQLiteDatabase): Promise<number> {
  const now = new Date();
  let totalInserted = 0;

  // Multiplicadores de renda por mês (índice 0 = mês atual, 11 = 11 meses atrás)
  // Valores base: ~R$280/dia trabalhado em receita bruta
  const monthConfig: Array<{
    incomeMultiplier: number;
    workingDays: number;
    label: string;
    bigExpense?: { categoriaId: string; amountCents: number; notes: string };
  }> = [
    { incomeMultiplier: 1.05, workingDays: 22, label: 'Mês atual — bom movimento' },
    { incomeMultiplier: 0.95, workingDays: 21, label: '' },
    { incomeMultiplier: 1.10, workingDays: 23, label: '' },
    { incomeMultiplier: 1.00, workingDays: 22, label: '' },
    // Mês 4 atrás: pneus + freios + acidente → prejuízo
    {
      incomeMultiplier: 0.85,
      workingDays: 18,
      label: 'Acidente leve — moto na oficina',
      bigExpense: { categoriaId: '3', amountCents: 370000, notes: 'Pneus + freios + danos do acidente' },
    },
    { incomeMultiplier: 1.15, workingDays: 24, label: '' },
    { incomeMultiplier: 0.90, workingDays: 20, label: '' },
    { incomeMultiplier: 1.00, workingDays: 22, label: '' },
    // Mês 9 atrás: troca de motor → grande prejuízo
    {
      incomeMultiplier: 0.60,
      workingDays: 12,
      label: 'Troca de motor — moto parada 2 semanas',
      bigExpense: { categoriaId: '3', amountCents: 380000, notes: 'Troca de motor' },
    },
    { incomeMultiplier: 1.05, workingDays: 22, label: '' },
    { incomeMultiplier: 0.95, workingDays: 21, label: '' },
    { incomeMultiplier: 1.10, workingDays: 23, label: '' },
  ];

  // Notas possíveis para receitas (~15% das transações)
  const incomeNotes = [
    'Corrida na chuva',
    'Surge hora do rush',
    'Feriado — bom movimento',
    'Evento no centro',
    'Corrida longa',
    'Show no estádio',
    'Madrugada — tarifa dinâmica',
    'Fim de semana',
    null, null, null, null, null, null, // 6 nulos = ~42% chance de nota (ajuste abaixo)
  ];

  // Fontes de receita com seus pesos (probabilidade de uso)
  const incomeSources: Array<{ id: string; weight: number; avgCents: number }> = [
    { id: '1', weight: 40, avgCents: 18000 },  // Uber   — R$180 médio/dia
    { id: '2', weight: 30, avgCents: 16000 },  // 99     — R$160 médio/dia
    { id: '3', weight: 20, avgCents: 14000 },  // iFood  — R$140 médio/dia
    { id: '4', weight:  7, avgCents: 25000 },  // Particular — R$250 médio/dia
    { id: '5', weight:  3, avgCents:  3500 },  // Gorjeta — R$35 médio
  ];

  const totalWeight = incomeSources.reduce((s, x) => s + x.weight, 0);

  // Seleciona fonte de receita aleatoriamente com pesos
  const pickSource = (rand: number) => {
    let acc = 0;
    for (const s of incomeSources) {
      acc += s.weight / totalWeight;
      if (rand < acc) return s;
    }
    return incomeSources[0];
  };

  // PRNG determinística simples (LCG) para resultados reproduzíveis
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(seed) / 0x7fffffff;
  };

  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const cfg = monthConfig[monthsAgo];

    // Primeiro dia do mês alvo
    const targetDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth(); // 0-based

    // Total de dias no mês
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Para o mês atual, limita ao dia de hoje
    const lastDay = monthsAgo === 0 ? now.getDate() : daysInMonth;

    // Distribui os dias trabalhados aleatoriamente no mês
    const allDays = Array.from({ length: lastDay }, (_, i) => i + 1);
    // Embaralha dias via Fisher-Yates usando nosso PRNG
    for (let i = allDays.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [allDays[i], allDays[j]] = [allDays[j], allDays[i]];
    }
    const workDays = allDays.slice(0, Math.min(cfg.workingDays, lastDay)).sort((a, b) => a - b);

    // Despesas fixas mensais
    // 1. Internet/Celular — dia 5 de cada mês (ou dia 5 se disponível)
    const phoneDay = Math.min(5, lastDay);
    const phoneCents = 4900 + Math.floor(rand() * 200); // R$49~51
    const phoneDate = new Date(year, month, phoneDay, 10, 0, 0);
    await db.runAsync(
      `INSERT INTO expenses (id, category_id, amount_cents, spent_at, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [Crypto.randomUUID(), '4', phoneCents, phoneDate.toISOString(), 'Plano celular mensal', phoneDate.toISOString(), phoneDate.toISOString()]
    );
    totalInserted++;

    // 2. Grande despesa do mês (se configurada — meses de prejuízo)
    if (cfg.bigExpense) {
      const bigDay = Math.max(3, Math.min(15, lastDay));
      const bigDate = new Date(year, month, bigDay, 9, 0, 0);
      await db.runAsync(
        `INSERT INTO expenses (id, category_id, amount_cents, spent_at, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [Crypto.randomUUID(), cfg.bigExpense.categoriaId, cfg.bigExpense.amountCents, bigDate.toISOString(), cfg.bigExpense.notes, bigDate.toISOString(), bigDate.toISOString()]
      );
      totalInserted++;
    }

    // Processa cada dia trabalhado
    for (const day of workDays) {
      const date = new Date(year, month, day);

      // ── Receita do dia ─────────────────────────────────────────────────────
      // Neste dia, gera 1-3 lançamentos de receita (turnos/apps diferentes)
      const numIncomes = rand() < 0.3 ? 3 : rand() < 0.6 ? 2 : 1;
      for (let i = 0; i < numIncomes; i++) {
        const source = pickSource(rand());
        // Variação: ±35% sobre a média da fonte, ajustada pelo multiplicador do mês
        const variation = 0.65 + rand() * 0.70;
        const amountCents = Math.round(source.avgCents * variation * cfg.incomeMultiplier);
        const hour = 7 + Math.floor(rand() * 13); // 7h-19h
        const minute = Math.floor(rand() * 60);
        const incomeDate = new Date(year, month, day, hour, minute, 0);

        // ~15% de chance de ter nota
        const noteIdx = Math.floor(rand() * incomeNotes.length);
        const notes = rand() < 0.15 ? incomeNotes[noteIdx % 7] : null;

        await db.runAsync(
          `INSERT INTO incomes (id, source_id, amount_cents, received_at, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [Crypto.randomUUID(), source.id, amountCents, incomeDate.toISOString(), notes, incomeDate.toISOString(), incomeDate.toISOString()]
        );
        totalInserted++;
      }

      // ── Combustível — ~2x por semana ────────────────────────────────────────
      // Aproximadamente a cada 3-4 dias trabalhados
      if (rand() < 0.35) {
        const fuelCents = 6000 + Math.floor(rand() * 4000); // R$60-100
        const fuelHour = 6 + Math.floor(rand() * 3); // cedo
        const fuelDate = new Date(year, month, day, fuelHour, Math.floor(rand() * 60), 0);
        await db.runAsync(
          `INSERT INTO expenses (id, category_id, amount_cents, spent_at, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [Crypto.randomUUID(), '1', fuelCents, fuelDate.toISOString(), null, fuelDate.toISOString(), fuelDate.toISOString()]
        );
        totalInserted++;
      }

      // ── Alimentação — ~60% dos dias trabalhados ────────────────────────────
      if (rand() < 0.60) {
        const foodCents = 1500 + Math.floor(rand() * 2000); // R$15-35
        const foodHour = 11 + Math.floor(rand() * 3); // almoço
        const foodDate = new Date(year, month, day, foodHour, Math.floor(rand() * 60), 0);
        await db.runAsync(
          `INSERT INTO expenses (id, category_id, amount_cents, spent_at, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [Crypto.randomUUID(), '2', foodCents, foodDate.toISOString(), null, foodDate.toISOString(), foodDate.toISOString()]
        );
        totalInserted++;
      }

      // ── Manutenção pequena — ~1x/mês (óleo, filtro, pneus etc.) ────────────
      // Chance de ~4% por dia trabalhado ≈ 1 vez/mês em ~23 dias
      if (rand() < 0.04) {
        const maintNotes = ['Troca de óleo', 'Corrente e pinhão', 'Filtro de ar', 'Revisão rápida', 'Troca de pneu traseiro'];
        const maintCents = 8000 + Math.floor(rand() * 12000); // R$80-200
        const maintDate = new Date(year, month, day, 8, 0, 0);
        const maintNote = maintNotes[Math.floor(rand() * maintNotes.length)];
        await db.runAsync(
          `INSERT INTO expenses (id, category_id, amount_cents, spent_at, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [Crypto.randomUUID(), '3', maintCents, maintDate.toISOString(), maintNote, maintDate.toISOString(), maintDate.toISOString()]
        );
        totalInserted++;
      }
    }
  }

  return totalInserted;
}
