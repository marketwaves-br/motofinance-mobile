import { UUID, IsoDateString } from '@/types/database';

export interface Expense {
  id: UUID;
  categoryId: UUID;
  amountCents: number;
  spentAt: IsoDateString;
  expenseKind: 'fixed' | 'variable';
  isRecurring: boolean;
  notes?: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
