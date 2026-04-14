export type TransactionType = 'income' | 'expense';

export interface UnifiedTransaction {
  id: string;
  type: TransactionType;
  amountCents: number;
  date: string;           // ISO 8601 string
  label: string;          // nome da fonte (receita) ou categoria (despesa)
  color: string | null;   // cor da fonte ou categoria
  icon: string | null;    // nome do ícone Ionicons
  notes: string | null;
}

export interface TransactionSection {
  title: string;          // "Hoje", "Ontem", "10/04/2026"
  dateKey: string;        // "2026-04-10" — chave para agrupamento
  data: UnifiedTransaction[];
}
