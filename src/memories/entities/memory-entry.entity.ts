import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('memory_entries')
export class MemoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  user_id!: string;

  @Column('text')
  content!: string;

  @Column()
  category!: string; // fact/preference/relationship/emotion

  @Column({ type: 'uuid', nullable: true })
  entity_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  embedding_id!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
