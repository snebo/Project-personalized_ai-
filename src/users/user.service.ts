// src/users/users.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_CLIENT } from 'src/superbase/superbase.constants';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @Inject(SUPABASE_ADMIN_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  findAll() {
    return this.usersRepository.find();
  }

  async testSupabase() {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .limit(1);
    if (error) throw error;
    return data;
  }
}
