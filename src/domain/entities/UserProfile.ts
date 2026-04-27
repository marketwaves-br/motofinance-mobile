import { UUID, IsoDateString } from '@/types/database';

export interface UserProfile {
  id: UUID;
  fullName: string;
  currencyCode: string;
  weekStartsOn: number;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
