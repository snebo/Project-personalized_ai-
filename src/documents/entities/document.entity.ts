import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  user_id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  file_type!: string;

  @Column({ nullable: true })
  file_size!: number;

  @Column({ nullable: true })
  storage_path!: string;

  @Column('jsonb', { default: {} })
  metadata!: any;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
