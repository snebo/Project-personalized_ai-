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

  @Column({ type: 'uuid', nullable: true })
  document_id!: string | null;

  @Column()
  user_id!: string;

  @Column('text')
  content!: string;

  @Column({
    type: 'text',
    name: 'embedding',
    nullable: true,
  })
  embedding!: string;

  @Column()
  source!: string; // message/document/memory

  @Column('jsonb', { default: {} })
  metadata!: any;

  @CreateDateColumn()
  created_at!: Date;
}
