import { UUID, IsoDateString } from '@/types/database';

export interface FinancialGoal {
  id: UUID;
  period: 'daily' | 'weekly' | 'monthly';
  goalType: 'gross' | 'net';
  targetAmountCents: number;
  isActive: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
