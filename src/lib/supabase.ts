import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Fail closed: a missing or invalid configuration must never silently connect
// Preview to the production Supabase project.
function requiredSupabaseUrl(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('SUPABASE_URL_NOT_CONFIGURED');
  const parsed = new URL(raw.trim());
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co') || parsed.hostname.split('.').length !== 3 || parsed.pathname !== '/') {
    throw new Error('SUPABASE_URL_INVALID');
  }
  return parsed.origin;
}

function requiredSupabaseKey(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim().length < 20) throw new Error('SUPABASE_PUBLIC_KEY_NOT_CONFIGURED');
  return raw.trim();
}

const env = import.meta.env;
export const SUPABASE_URL: string = requiredSupabaseUrl(env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY: string = requiredSupabaseKey(
  env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
export const SUPABASE_PROJECT_ID = new URL(SUPABASE_URL).hostname.split('.')[0];

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const { error } = await supabase.from('planos').select('id').limit(1);
    if (error) return { ok: false, message: 'Supabase indisponível: ' + error.message };
    return { ok: true, message: 'Conectado ao Supabase (' + SUPABASE_PROJECT_ID + ')' };
  } catch (error: any) {
    return { ok: false, message: error?.message || 'Falha na conexão com Supabase' };
  }
}
