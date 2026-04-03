const toBool = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

const parseCsv = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  enableMocks: toBool(process.env.NEXT_PUBLIC_ENABLE_MOCKS, true),
  mockAdminEmails: parseCsv(process.env.NEXT_PUBLIC_ADMIN_EMAILS)
};

export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseAnonKey && !env.enableMocks);
