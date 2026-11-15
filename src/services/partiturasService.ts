import { supabase } from '../lib/supabase';

export const SHEET_STORAGE_BUCKETS = {
  FREE: 'tutti-partituras',
  PAID: 'tutti-partituras',
} as const;

export const MUSICAL_STYLE_OPTIONS = [
  'Bossa Nova',
  'Choro',
  'MPB',
  'Jazz',
  'Clássico',
  'Samba',
  'Pagode/Samba',
  'Sertanejo',
  'Gospel',
  'Internacional',
  'Outro',
] as const;

export function getMusicalStyleOptions(currentValue?: string | null): string[] {
  const base: string[] = [...MUSICAL_STYLE_OPTIONS];
  const trimmed = (currentValue || '').trim();
  if (trimmed && !base.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
    return [trimmed, ...base];
  }
  return base;
}

export interface DbCompositor {
  id: string;
  nome: string;
  nome_normalizado: string;
  created_by?: string | null;
  created_at?: string;
}

export function normalizeComposerDisplay(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function normalizeComposerKey(name: string): string {
  return normalizeComposerDisplay(name).toLowerCase();
}

export function normalizeSearchText(text: string): string {
  return normalizeComposerKey(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export interface DbPartitura {
  id: string;
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
  created_by?: string | null;
}

const INSTRUMENT_LABELS: Record<string, string> = {
  saxofone_alto: 'Saxofone Alto', saxofone_tenor: 'Saxofone Tenor',
  saxofone_soprano: 'Saxofone Soprano', clarinete: 'Clarinete',
  trombone: 'Trombone', trompete: 'Trompete', teclado: 'Teclado',
  contrabaixo: 'Contrabaixo', guitarra: 'Guitarra',
  outros: 'Outros instrumentos',
};

export function normalizeDbPartitura(row: any): DbPartitura {
  return {
    id: String(row.id),
    titulo: row.titulo,
    compositor: row.compositor || 'Compositor Tutti',
    instrumento: row.instrumento || INSTRUMENT_LABELS[row.instrumento_id] || row.instrumento_id || 'Saxofone Alto',
    tonalidade: row.tonalidade || 'C',
    tom_original: row.tom_original || row.tonalidade || 'C',
    nivel: row.nivel || row.nivel_dificuldade || 'Intermediário',
    genero: row.genero || row.estilo_musical || 'Bossa Nova',
    tempo_bpm: row.tempo_bpm ?? 120,
    compasso: row.compasso || '4/4',
    descricao: row.descricao || '',
    arquivo_pdf_url: row.arquivo_pdf_url || null,
    storage_path: row.storage_path || null,
    is_featured: Boolean(row.is_featured),
    featured_order: Number(row.featured_order ?? 0),
    file_size_bytes: Number(row.file_size_bytes ?? 0),
    categoria: row.categoria === 'paga' ? 'paga' : 'gratuita',
    preco: Number(row.preco ?? 0),
    publicado: row.publicado !== false,
    youtube_url: row.youtube_url || null,
    cifras: Array.isArray(row.cifras) ? row.cifras : [],
    melodia_notas: Array.isArray(row.melodia_notas) ? row.melodia_notas : [],
    visualizacoes: Number(row.visualizacoes ?? 0),
    downloads: Number(row.downloads ?? 0),
    created_at: row.created_at,
    created_by: row.created_by || null,
  };
}

export async function fetchCompositores(): Promise<DbCompositor[]> {
  const { data, error } = await supabase
    .from('compositores')
    .select('id, nome, nome_normalizado, created_by, created_at')
    .order('nome', { ascending: true });

  if (error) {
    throw error;
  }
  return (data || []) as DbCompositor[];
}

export async function ensureCompositorInDb(
  rawName: string,
  userId?: string | null
): Promise<DbCompositor | null> {
  const nome = normalizeComposerDisplay(rawName);
  const nome_normalizado = normalizeComposerKey(nome);
  if (!nome || !nome_normalizado) return null;

  const { data: existing } = await supabase
    .from('compositores')
    .select('id, nome, nome_normalizado, created_by, created_at')
    .eq('nome_normalizado', nome_normalizado)
    .maybeSingle();

  if (existing) {
    return existing as DbCompositor;
  }

  const { data: inserted, error } = await supabase
    .from('compositores')
    .upsert(
      {
        nome,
        nome_normalizado,
        ...(userId ? { created_by: userId } : {}),
      },
      { onConflict: 'nome_normalizado' }
    )
    .select('id, nome, nome_normalizado, created_by, created_at')
    .single();

  if (error) throw error;
  return inserted as DbCompositor;
}

export async function fetchPublishedPartituras(): Promise<DbPartitura[]> {
  const { data, error } = await supabase
    .from('partituras')
    .select('*')
    .eq('publicado', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeDbPartitura);
}

export async function fetchUnlockedPartituraIds(userId?: string): Promise<Set<string>> {
  if (!userId) return new Set();
  const unlocked = new Set<string>();
  try {
    const { data, error } = await supabase
      .from('partituras_acessos')
      .select('partitura_id')
      .eq('user_id', userId);
    if (error) {
      console.warn('Não foi possível verificar os acessos individuais às partituras:', error.code);
    } else if (data) {
      data.forEach((row: any) => unlocked.add(String(row.partitura_id)));
    }
  } catch (accessErr) {
    console.warn('Falha inesperada ao verificar acessos individuais às partituras:', accessErr);
  }

  // Também libera partituras pertencentes a conjuntos adquiridos pelo aluno
  try {
    const { data: bundleAccess, error: bundleAccessError } = await supabase
      .from('conjuntos_acessos')
      .select('conjunto_id')
      .eq('user_id', userId);

    if (bundleAccessError) {
      console.warn('Não foi possível verificar o acesso aos conjuntos:', bundleAccessError.code);
    } else {
      const bundleIds = (bundleAccess || []).map((b: any) => b.conjunto_id).filter(Boolean);
      if (bundleIds.length > 0) {
        const { data: bundleItems, error: bundleItemsError } = await supabase
          .from('conjuntos_partituras_itens')
          .select('partitura_id')
          .in('conjunto_id', bundleIds);
        if (bundleItemsError) {
          console.warn('Não foi possível verificar as partituras dos conjuntos:', bundleItemsError.code);
        } else {
          (bundleItems || []).forEach((item: any) => unlocked.add(String(item.partitura_id)));
        }
      }
    }
  } catch {
    // fallback silencioso caso conjuntos ainda não existam na instância
  }

  return unlocked;
}

/**
 * Obtém URL autorizada (ou URL assinada temporária para partituras pagas) via Backend / Edge Function.
 */
export async function resolvePartituraPdfUrl(partitura: DbPartitura): Promise<{
  url: string | null;
  protected: boolean;
}> {
  const isPaid = partitura.categoria === 'paga';

  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  // URLs assinadas são emitidas apenas pela API Vercel após autorização no servidor.
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

  return { url: null, protected: isPaid };
}

export async function createPaidSheetCheckout(partituraId: string): Promise<{ url: string }> {
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

export interface DbConjuntoPartituras {
  id: string;
  titulo: string;
  descricao: string | null;
  preco: number;
  publicado: boolean;
}

export async function fetchPublishedConjuntos(): Promise<DbConjuntoPartituras[]> {
  const { data, error } = await supabase.from('conjuntos_partituras')
    .select('id,titulo,descricao,preco,publicado')
    .eq('publicado', true)
    .order('titulo', { ascending: true });
  if (error) {
    console.warn('Catálogo de conjuntos indisponível:', error.code);
    return [];
  }
  return (data || []).map(row => ({ ...row, preco: Number(row.preco || 0) }));
}

export async function createBundleCheckout(conjuntoId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Entre na sua conta para comprar conjuntos.');
  const res = await fetch('/api/stripe/create-sheet-checkout', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ conjunto_id: conjuntoId }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || typeof result.url !== 'string') {
    throw new Error(result.error || 'Não foi possível iniciar o pagamento do conjunto.');
  }
  return result.url;
}
