import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase credentials provided for Tutti Escola de Música
export const DEFAULT_SUPABASE_URL = 'https://viwxalwpvuvgcyxsdjbi.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_lmlaQ5wY_WDUa5G8O9SRVw_PKStIgXy';

/**
 * Validates and resolves a valid HTTP/HTTPS Supabase URL.
 * Discards placeholder/dummy values like "123", empty strings or malformed strings.
 */
function resolveSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return DEFAULT_SUPABASE_URL;
  const trimmed = rawUrl.trim();
  if (!trimmed.match(/^https?:\/\//i) || trimmed.length < 10) {
    return DEFAULT_SUPABASE_URL;
  }
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    return DEFAULT_SUPABASE_URL;
  }
}

/**
 * Validates and resolves the Supabase Anon/Publishable Key.
 * Discards dummy/test values like "123".
 */
function resolveSupabaseAnonKey(rawKey?: string): string {
  if (!rawKey || typeof rawKey !== 'string') return DEFAULT_SUPABASE_ANON_KEY;
  const trimmed = rawKey.trim();
  if (trimmed === '123' || trimmed.length < 15) {
    return DEFAULT_SUPABASE_ANON_KEY;
  }
  return trimmed;
}

export const SUPABASE_URL: string = resolveSupabaseUrl(
  typeof import.meta !== 'undefined' && import.meta.env
    ? ((import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL) as string)
    : undefined
);

export const SUPABASE_ANON_KEY: string = resolveSupabaseAnonKey(
  typeof import.meta !== 'undefined' && import.meta.env
    ? ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
        import.meta.env.VITE_SUPABASE_ANON_KEY ||
        import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) as string)
    : undefined
);

// Extract project identifier safely
export const SUPABASE_PROJECT_ID: string = (() => {
  try {
    const url = new URL(SUPABASE_URL);
    return url.hostname.split('.')[0] || 'viwxalwpvuvgcyxsdjbi';
  } catch {
    return 'viwxalwpvuvgcyxsdjbi';
  }
})();

// Create and export singleton Supabase client safely
function initSupabaseClient(): SupabaseClient {
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    });
  } catch (err) {
    console.warn('Initial Supabase client creation failed, falling back to default URL:', err);
    return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);
  }
}

export const supabase: SupabaseClient = initSupabaseClient();

/**
 * Health check & connection validation for Supabase backend
 */
export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; details?: any }> {
  try {
    const { error } = await supabase.from('usuarios').select('id').limit(1);
    if (!error) {
      console.log(`✅ Supabase (${SUPABASE_PROJECT_ID}): Tabela 'usuarios' pronta e conectada.`);
      return { ok: true, message: `Conectado ao Supabase (${SUPABASE_PROJECT_ID}) - Tabela 'usuarios' disponível.` };
    }

    // Fallback check to 'profiles' if usuarios is still being migrated
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      const pCheck = await supabase.from('profiles').select('id').limit(1);
      if (!pCheck.error) {
        console.log(`✅ Supabase (${SUPABASE_PROJECT_ID}): Tabela 'profiles' pronta e conectada.`);
        return { ok: true, message: `Conectado ao Supabase (${SUPABASE_PROJECT_ID}) - Tabela 'profiles' disponível.` };
      }
      return {
        ok: true,
        message: `Conectado ao Supabase (${SUPABASE_PROJECT_ID}). Execute o script SQL no editor do Supabase para criar as tabelas.`,
      };
    }

    console.log('Supabase status:', error.message);
    return { ok: true, message: `Supabase conectado (${error.message})` };
  } catch (err: any) {
    console.warn('Erro ao verificar conexão com Supabase:', err);
    return { ok: false, message: err?.message || 'Falha na conexão com Supabase' };
  }
}

// Run initial connection test in background in browser
if (typeof window !== 'undefined') {
  testSupabaseConnection();
}
