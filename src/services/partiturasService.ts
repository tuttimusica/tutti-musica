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
    file_size_bytes: Number(row.tamanho_bytes ?? row.file_size_bytes ?? 0),
    categoria: row.categoria === 'paga' ? 'paga' : 'gratuita',
    preco: Number(row.preco ?? 0),
    publicado: row.publicado !== false,
    youtube_url: row.youtube_url || null,
    cifras: Array.isArray(row.cifras) ? row.cifras : [],
    melodia_notas: Array.isArray(row.melodia_notas) ? row.melodia_notas : [],
    visualizacoes: Number(row.visualizacoes ?? 0),
    downloads: Number(row.downloads ?? 0),
    created_at: row.created_at,
    created_by: row.enviado_por || row.created_by || null,
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

  // A Pro purchase unlocks ALL current and future paid PDFs dynamically.
  // Server-side Storage RLS remains authoritative for actual download.
  try {
    const {data:memberships,error:membershipsError}=await supabase
      .from('assinaturas_usuarios')
      .select('plano_id,status,data_inicio,data_fim')
      .eq('user_id',userId).eq('status','ativo');
    const now=Date.now();
    const eligible=!membershipsError && memberships?.some((m:any)=>
      ['pro','mensal','trimestral','semestral'].includes(m.plano_id) &&
      new Date(m.data_inicio).getTime()<=now &&
      (!m.data_fim || new Date(m.data_fim).getTime()>now)
    );
    if(eligible){
      const {data:library,error:libraryError}=await supabase.from('partituras')
        .select('id').eq('categoria','paga').eq('publicado',true);
      if(!libraryError)(library||[]).forEach((p:any)=>unlocked.add(String(p.id)));
    }
  }catch(error){
    console.warn('Não foi possível atualizar o indicador da biblioteca Pro',error);
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
    // Preview may intentionally run without a privileged Vercel service key.
    // Supabase Storage RLS must independently authorize BOTH free and paid PDFs.
    // Only fall back when the backend explicitly lacks configuration; never bypass
    // a 401/403/404 result or an entitlement verification failure.
    if (res.status === 503 && json.error === 'storage_unconfigured') {
      if (!partitura.storage_path) throw new Error('Esta partitura ainda não possui PDF publicado.');
      const { data: signed, error: storageError } = await supabase.storage
        .from('tutti-partituras')
        .createSignedUrl(partitura.storage_path, isPaid ? 120 : 300);
      if (storageError || !signed?.signedUrl) {
        throw new Error('Acesso ao PDF negado ou arquivo indisponível.');
      }
      return { url: signed.signedUrl, protected: isPaid };
    }
    throw new Error(json.error || 'Acesso negado a esta partitura.');
  }

  if (json.url) {
    return { url: json.url, protected: Boolean(json.protected) };
  }

  return { url: null, protected: isPaid };
}

export async function createPaidSheetCheckout(_partituraId: string): Promise<{ url: string }> {
  throw new Error('Partituras exclusivas estão incluídas no Tutti Pro Vitalício. Adquira o plano na área de planos.');
}

export interface DbConjuntoPartituras {
  id: string;
  titulo: string;
  descricao: string | null;
  preco: number;
  publicado: boolean;
  categoria?: string | null;
  capa_url?: string | null;
  created_at?: string;
  itens_count?: number;
  partituras?: DbPartitura[];
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
  const {data:links,error:linksError}=await supabase.from('conjuntos_partituras_itens').select('conjunto_id');
  const counts=new Map<string,number>();
  if(!linksError)for(const link of links||[])counts.set(String(link.conjunto_id),(counts.get(String(link.conjunto_id))||0)+1);
  return (data || []).map(row => ({
    ...row, preco:Number(row.preco||0),itens_count:counts.get(String(row.id))||0,
    categoria:'pro',capa_url:null
  }));
}

export async function createBundleCheckout(_conjuntoId: string): Promise<string> {
  throw new Error('A biblioteca exclusiva agora faz parte do Tutti Pro Vitalício. Não vendemos PDFs em checkout separado.');

}


/** Library browsing helpers — read-only, RLS-backed, using the real production schema. */
export type DbConjunto = DbConjuntoPartituras;
export interface PartituraFilterOptions {
  instrumentos:{id:string;label:string}[];
  estilos:string[];
  compositores:string[];
}
export interface PartiturasPaginationParams {
  page:number;
  pageSize:number;
  search?:string;
  instrumento?:string;
  estilo?:string;
  compositor?:string;
  acesso?:'todas'|'gratuitas'|'pro'|'destaques';
  conjuntoId?:string|null;
}
export interface PartiturasPaginatedResult {
  items:DbPartitura[];
  total:number;
  page:number;
  pageSize:number;
  totalPages:number;
}
export async function fetchPartituraFilterOptions():Promise<PartituraFilterOptions>{
  const {data,error}=await supabase.from('partituras')
    .select('instrumento_id,estilo_musical,compositor').eq('publicado',true);
  if(error)throw error;
  const instruments=new Map<string,string>();
  const estilos=new Set<string>(),compositores=new Set<string>();
  for(const row of data||[]){
    if(row.instrumento_id) {
      const k=String(row.instrumento_id);
      instruments.set(k, INSTRUMENT_LABELS[k]||k.replace(/_/g,' '));
    }
    if(row.estilo_musical)estilos.add(String(row.estilo_musical));
    if(row.compositor)compositores.add(String(row.compositor));
  }
  return {
    instrumentos:[...instruments].map(([id,label])=>({id,label})).sort((a,b)=>a.label.localeCompare(b.label,'pt-BR')),
    estilos:[...estilos].sort((a,b)=>a.localeCompare(b,'pt-BR')),
    compositores:[...compositores].sort((a,b)=>a.localeCompare(b,'pt-BR'))
  };
}
export async function fetchPartiturasPaginated(params:PartiturasPaginationParams):Promise<PartiturasPaginatedResult>{
  const page=Math.max(1,Math.floor(params.page||1));
  const pageSize=Math.min(48,Math.max(1,Math.floor(params.pageSize||12)));
  let query=supabase.from('partituras').select('*',{count:'exact'}).eq('publicado',true);
  if(params.conjuntoId){
    const {data:links,error}=await supabase.from('conjuntos_partituras_itens')
      .select('partitura_id').eq('conjunto_id',params.conjuntoId);
    if(error)throw error;
    const ids=(links||[]).map(l=>l.partitura_id).filter(Boolean);
    if(!ids.length)return {items:[],total:0,page,pageSize,totalPages:1};
    query=query.in('id',ids);
  }
  if(params.instrumento&&params.instrumento!=='todos')query=query.eq('instrumento_id',params.instrumento);
  if(params.estilo&&params.estilo!=='todos')query=query.eq('estilo_musical',params.estilo);
  if(params.compositor&&params.compositor!=='todos')query=query.eq('compositor',params.compositor);
  if(params.acesso==='gratuitas')query=query.eq('categoria','gratuita');
  else if(params.acesso==='pro')query=query.eq('categoria','paga');
  else if(params.acesso==='destaques')query=query.eq('is_featured',true);
  const raw=String(params.search||'').trim().slice(0,80).replace(/[%*,()]/g,'');
  if(raw)query=query.or('titulo.ilike.%'+raw+'%,compositor.ilike.%'+raw+'%');
  const {data,count,error}=await query
    .order('is_featured',{ascending:false}).order('created_at',{ascending:false})
    .range((page-1)*pageSize,page*pageSize-1);
  if(error)throw error;
  const total=count||0;
  return {items:(data||[]).map(normalizeDbPartitura),total,page,pageSize,totalPages:Math.max(1,Math.ceil(total/pageSize))};
}
export async function fetchConjuntoWithItems(id:string):Promise<DbConjunto|null>{
  const {data:conjunto,error}=await supabase.from('conjuntos_partituras')
    .select('id,titulo,descricao,preco,publicado,created_at').eq('id',id).eq('publicado',true).maybeSingle();
  if(error)throw error;
  if(!conjunto)return null;
  const {data:links,error:linksErr}=await supabase.from('conjuntos_partituras_itens')
    .select('partitura_id').eq('conjunto_id',id);
  if(linksErr)throw linksErr;
  const ids=(links||[]).map(l=>l.partitura_id).filter(Boolean);
  const partituras:DbPartitura[]=[];
  if(ids.length){
    const {data,error:sheetErr}=await supabase.from('partituras')
      .select('*').eq('publicado',true).in('id',ids);
    if(sheetErr)throw sheetErr;
    partituras.push(...(data||[]).map(normalizeDbPartitura));
  }
  return {...conjunto,preco:Number(conjunto.preco||0),categoria:'pro',capa_url:null,
    itens_count:partituras.length,partituras};
}
export async function fetchUserLibraryAccess(userId?:string, _userPlan?:'free'|'pro'|'ultra', _isAdmin?:boolean):
Promise<{hasFullProAccess:boolean;unlockedIds:Set<string>}>{
  if(!userId)return {hasFullProAccess:false,unlockedIds:new Set()};
  const unlockedIds=await fetchUnlockedPartituraIds(userId);
  const {data,error}=await supabase.from('assinaturas_usuarios')
    .select('plano_id,status,data_inicio,data_fim').eq('user_id',userId).eq('status','ativo');
  const now=Date.now();
  const hasFullProAccess=!error&&(data||[]).some(s=>
    ['pro','mensal','trimestral','semestral'].includes(s.plano_id)&&
    new Date(s.data_inicio).getTime()<=now&&
    (!s.data_fim||new Date(s.data_fim).getTime()>now));
  // Browser view state never grants download. /api/partituras/signed-url verifies RLS.
  return {hasFullProAccess,unlockedIds};
}
