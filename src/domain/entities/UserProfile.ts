import { UUID, IsoDateString } from '@/types/database';

export interface UserProfile {
  id: UUID;
  fullName: string;
  activityType: string | null;
  currencyCode: string;
  weekStartsOn: number;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
