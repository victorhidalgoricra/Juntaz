import { createClient } from '@supabase/supabase-js';
import { env, hasSupabase } from './env';

export const supabase = hasSupabase
  ? createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: { persistSession: true }
    })
  : null;
