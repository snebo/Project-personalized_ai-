import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_CLIENT } from 'src/superbase/superbase.constants';
import { DataSource } from 'typeorm';

@Injectable()
export class DbHealthService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(SUPABASE_ADMIN_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {}

  async checkDatabase() {
    const result = await this.dataSource.query('select 1 as ok;');

    return {
      connected: this.dataSource.isInitialized,
      result,
    };
  }

  async checkSupabase() {
    const { data, error, status, statusText } = await this.supabase
      .from('healthcheck')
      .select('id')
      .limit(1);

    return {
      ok: !error,
      status,
      statusText,
      error: error?.message ?? null,
      data,
    };
  }

  async checkAll() {
    const [database, supabase] = await Promise.all([
      this.checkDatabase(),
      this.checkSupabase(),
    ]);

    return {
      database,
      supabase,
    };
  }
}
