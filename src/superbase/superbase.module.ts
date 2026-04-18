import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_ADMIN_CLIENT = 'SUPABASE_ADMIN_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_ADMIN_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createClient(
          config.getOrThrow<string>('SUPABASE_URL'),
          config.getOrThrow<string>('SUPABASE_SECRET_KEY'),
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          },
        ),
    },
  ],
  exports: [SUPABASE_ADMIN_CLIENT],
})
export class SupabaseModule {}
