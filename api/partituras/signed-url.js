import { createClient } from '@supabase/supabase-js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROD_HOST = 'viwxalwpvuvgcyxsdjbi.supabase.co';
const send = (res, status, data) => {
  res.statusCode = status;
  res.end(JSON.stringify(data));
};

// Generate signed PDFs as the *requesting user*, not as service_role.
// Supabase Storage RLS is the authoritative entitlement check.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'method_not_allowed' });
  }

  const id = req.body?.partitura_id;
  if (typeof id !== 'string' || !uuidPattern.test(id)) {
    return send(res, 400, { error: 'partitura_id_invalido' });
  }

  // The frontend and backend must use the same Supabase project.
  // Avoid legacy SUPABASE_URL and service keys that belong to other projects.
  const url = process.env.VITE_SUPABASE_URL;
  const publicKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publicKey) return send(res, 503, { error: 'storage_unconfigured' });
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co') ||
        (process.env.VERCEL_ENV === 'production' && parsed.hostname !== PROD_HOST)) {
      return send(res, 503, { error: 'supabase_project_mismatch' });
    }
  } catch {
    return send(res, 503, { error: 'supabase_project_mismatch' });
  }

  const authorization = req.headers.authorization || '';
  const token = /^Bearer\s+(.+)$/i.exec(authorization)?.[1];
  const supabase = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
  });

  try {
    let user = null;
    if (token) {
      const result = await supabase.auth.getUser(token);
      if (result.error || !result.data?.user) return send(res, 401, { error: 'unauthorized' });
      user = result.data.user;
    }

    // Catalog rows are readable under the user's own RLS policies.
    const { data: sheet, error: lookupError } = await supabase.from('partituras')
      .select('id,publicado,categoria,storage_bucket,storage_path')
      .eq('id', id).maybeSingle();
    if (lookupError) return send(res, 503, { error: 'sheet_lookup_failed' });
    if (!sheet) return send(res, 404, { error: 'partitura_not_found' });
    if (!sheet.publicado) return send(res, 403, { error: 'partitura_nao_publicada' });
    if (sheet.storage_bucket !== 'tutti-partituras' || !sheet.storage_path) {
      return send(res, 503, { error: 'pdf_storage_not_configured' });
    }

    const paid = sheet.categoria === 'paga';
    if (paid && !user) return send(res, 401, { error: 'login_required' });
    const lifetime = paid ? 120 : 300;
    const { data, error } = await supabase.storage.from('tutti-partituras')
      .createSignedUrl(sheet.storage_path, lifetime);

    // Do not use a privileged key as fallback: no RLS permission means no PDF.
    if (error || !data?.signedUrl) {
      return send(res, paid ? 403 : 503, { error: paid ? 'pro_required' : 'pdf_unavailable' });
    }
    return send(res, 200, { url: data.signedUrl, protected: paid, expiresIn: lifetime });
  } catch {
    return send(res, 503, { error: 'pdf_unavailable' });
  }
}
