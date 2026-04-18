import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('people')
export class Person {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  user_id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  relationship!: string;

  @Column('jsonb', { default: [] })
  facts!: any;

  @CreateDateColumn()
  first_mentioned_at!: Date;

  @UpdateDateColumn()
  last_mentioned_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
