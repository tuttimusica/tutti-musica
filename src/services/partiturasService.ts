import { supabase } from '../lib/supabase';

export interface DbPartitura {
  id: number;
  titulo: string;
  compositor: string;
  instrumento: string;
  tonalidade: string;
  tom_original?: string | null;
  nivel: 'Iniciante' | 'Intermediário' | 'Avançado' | string;
  genero?: string | null;
  tempo_bpm?: number | null;
  compasso?: string | null;
  descricao?: string | null;
  arquivo_pdf_url?: string | null;
  storage_path?: string | null;
  is_featured?: boolean;
  featured_order?: number;
  file_size_bytes?: number;
  categoria?: 'gratuita' | 'paga';
  preco?: number;
  publicado?: boolean;
  youtube_url?: string | null;
  cifras?: string[];
  melodia_notas?: { note: string; duration: number; lyric?: string }[];
  visualizacoes?: number;
  downloads?: number;
  created_at?: string;
}

export async function fetchPublishedPartituras(): Promise<DbPartitura[]> {
  const { data, error } = await supabase
    .from('partituras')
    .select('*')
    .neq('publicado', false)
    .order('is_featured', { ascending: false })
    .order('featured_order', { ascending: true })
    .order('id', { ascending: false });

  if (error) {
    // Fallback caso a coluna 'publicado' ainda não exista na instância
    const fallback = await supabase
      .from('partituras')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('id', { ascending: false });
    if (fallback.error) throw fallback.error;
    return (fallback.data || []) as DbPartitura[];
  }
  return (data || []) as DbPartitura[];
}

export async function fetchUnlockedPartituraIds(userId?: string): Promise<Set<number>> {
  if (!userId) return new Set();
  try {
    const { data, error } = await supabase
      .from('partituras_acessos')
      .select('partitura_id')
      .eq('user_id', userId);
    if (error || !data) return new Set();
    return new Set(data.map((row: any) => Number(row.partitura_id)));
  } catch {
    return new Set();
  }
}

/**
 * Obtém URL autorizada (ou URL assinada temporária para partituras pagas) via Backend / Edge Function.
 */
export async function resolvePartituraPdfUrl(partitura: DbPartitura): Promise<{
  url: string | null;
  protected: boolean;
}> {
  const isPaid = partitura.categoria === 'paga';

  // Para gratuitas com URL pública direta sem bloqueio
  if (!isPaid && partitura.arquivo_pdf_url && !partitura.storage_path) {
    return { url: partitura.arquivo_pdf_url, protected: false };
  }

  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  // 1. Tentar Edge Function 'partitura-access'
  try {
    const { data, error } = await supabase.functions.invoke('partitura-access', {
      body: { partitura_id: partitura.id },
    });
    if (!error && data?.url) {
      return { url: data.url, protected: Boolean(data.protected) };
    }
    if (error && (error as any)?.context?.status === 403) {
      throw new Error('Partitura paga: adquira ou solicite liberação para visualizar o PDF.');
    }
  } catch (edgeErr: any) {
    if (edgeErr?.message?.includes('Partitura paga')) throw edgeErr;
  }

  // 2. Endpoint backend Express (/api/partituras/signed-url)
  const res = await fetch('/api/partituras/signed-url', {
    method: 'POST',
    headers,
    body: JSON.stringify({ partitura_id: partitura.id }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'Acesso negado a esta partitura.');
  }

  if (json.url) {
    return { url: json.url, protected: Boolean(json.protected) };
  }

  // Fallback apenas para partitura gratuita já pública
  if (!isPaid && partitura.arquivo_pdf_url) {
    return { url: partitura.arquivo_pdf_url, protected: false };
  }

  return { url: null, protected: isPaid };
}

export async function createPaidSheetCheckout(partituraId: number): Promise<{ url: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Faça login para adquirir esta partitura.');
  }

  const res = await fetch('/api/stripe/create-sheet-checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      partitura_id: partituraId,
      return_url: window.location.origin,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) {
    throw new Error(json.error || 'Não foi possível iniciar o pagamento desta partitura.');
  }

  return { url: json.url };
}
