import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('message_embeddings')
export class MessageEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  message_id!: string | null;

  @Column()
  user_id!: string;

  @Column('text')
  content!: string;

  // Use a raw type for the vector column
  @Column({
    type: 'text', // In TypeScript we handle it as text for TypeORM, but it is 'vector' in DB
    name: 'embedding',
    nullable: true,
  })
  embedding!: string; // TypeORM sees it as string, we'll cast in raw queries

  @Column()
  source!: string; // message/document/memory

  @Column('jsonb', { default: {} })
  metadata!: any;

  @CreateDateColumn()
  created_at!: Date;
}
