import { UUID, IsoDateString } from '@/types/database';

export interface Income {
  id: UUID;
  sourceId: UUID;
  amountCents: number;
  receivedAt: IsoDateString;
  paymentMethod?: string | null;
  notes?: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
