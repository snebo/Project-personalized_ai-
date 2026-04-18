export type Metadata = Record<string, any>;

export interface BaseEntity {
  id: string;
  user_id: string;
  created_at: Date;
}
