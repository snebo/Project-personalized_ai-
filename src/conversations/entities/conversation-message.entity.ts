import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('conversation_messages')
export class ConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  conversation_id!: string;

  @Column()
  user_id!: string;

  @Column()
  role!: string; // user/assistant

  @Column('text')
  content!: string;

  @Column('jsonb', { default: {} })
  metadata!: any;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation;

  @CreateDateColumn()
  created_at!: Date;
}
