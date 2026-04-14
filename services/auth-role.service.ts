import { env, hasSupabase } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { GlobalRole, Profile } from '@/types/domain';

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
    .in('role', ['admin', 'backoffice_admin'])
    .maybeSingle();

  if (roleRow?.role === 'backoffice_admin') return 'backoffice_admin';
  return roleRow?.role === 'admin' ? 'admin' : 'user';
}

export function isBackofficeAdmin(user: Pick<Profile, 'global_role'> | null | undefined) {
  return user?.global_role === 'backoffice_admin';
}
