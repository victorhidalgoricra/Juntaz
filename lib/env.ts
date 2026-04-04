const toBool = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

const parseCsv = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const resolveSupabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

const resolveSupabaseKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

export const env = {
  supabaseUrl: resolveSupabaseUrl(),
  supabaseAnonKey: resolveSupabaseKey(),
  enableMocks: toBool(process.env.NEXT_PUBLIC_ENABLE_MOCKS, false),
  mockAdminEmails: parseCsv(process.env.NEXT_PUBLIC_ADMIN_EMAILS)
};

export const hasSupabaseConfig = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const hasSupabase = hasSupabaseConfig && !env.enableMocks;

export function getMissingSupabaseEnvMessage() {
  return 'Faltan variables de Supabase. Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (o ANON_KEY legado).';
}
