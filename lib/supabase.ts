import { createClient } from '@supabase/supabase-js';
import { env, hasSupabase, hasSupabaseConfig, getMissingSupabaseEnvMessage } from './env';

if (process.env.NODE_ENV === 'development' && !hasSupabaseConfig) {
  // eslint-disable-next-line no-console
  console.warn(getMissingSupabaseEnvMessage());
}

export const supabase = hasSupabase
  ? createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;
