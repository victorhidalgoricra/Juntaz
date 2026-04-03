const toBool = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  enableMocks: toBool(process.env.NEXT_PUBLIC_ENABLE_MOCKS, true)
};

export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseAnonKey && !env.enableMocks);
