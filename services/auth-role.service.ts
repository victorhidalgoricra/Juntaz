import { env, hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { GlobalRole } from '@/types/domain';

export async function resolveGlobalRole(email: string): Promise<GlobalRole> {
  const normalized = email.toLowerCase();

  if (env.mockAdminEmails.includes(normalized)) return 'admin';

  if (!hasSupabase || !supabase) return 'user';

  const { data: profile } = await supabase.from('profiles').select('id').eq('email', normalized).maybeSingle();
  if (!profile?.id) return 'user';

  const { data: roleRow } = await supabase
    .from('user_global_roles')
    .select('role')
    .eq('profile_id', profile.id)
    .eq('role', 'admin')
    .maybeSingle();

  return roleRow?.role === 'admin' ? 'admin' : 'user';
}
