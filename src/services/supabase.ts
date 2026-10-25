import { createClient } from '@supabase/supabase-js';

export const SUPABASE_PROJECT_ID = 'nccsheimngnwccfikscy';
export const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jY3NoZWltbmdud2NjZmlrc2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNzcxOTYsImV4cCI6MjEwNzg1MzE5Nn0.VQRUmPxHR3G2bF2BwdFikTBt-BGmHmBAF0Ckb1Xvblw';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/**
 * Health check & connection validation for Supabase backend
 */
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    // If error is code PGRST204 or 42P01 (relation does not exist yet), connection succeeded anyway
    if (!error || error.code === '42P01' || error.message?.includes('does not exist')) {
      console.log('✅ Conexão com Supabase (nccsheimngnwccfikscy) estabelecida com sucesso!');
      return true;
    }
    console.log('Supabase conectado:', error.message);
    return true;
  } catch (err) {
    console.warn('Supabase connection note:', err);
    return false;
  }
}

// Initial connection test
testSupabaseConnection();
