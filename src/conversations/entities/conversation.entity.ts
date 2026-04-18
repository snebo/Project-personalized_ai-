import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ConversationMessage } from './conversation-message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  user_id!: string;

  @Column({ default: 'active' })
  status!: string;

  @Column({ nullable: true })
  title!: string;

  @OneToMany(() => ConversationMessage, (message) => message.conversation)
  messages!: ConversationMessage[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
