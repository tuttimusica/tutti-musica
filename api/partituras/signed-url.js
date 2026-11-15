import { createClient } from '@supabase/supabase-js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const send = (res, status, body) => { res.statusCode = status; res.end(JSON.stringify(body)); };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'method_not_allowed' });
  }
  const id = req.body?.partitura_id;
  if (typeof id !== 'string' || !uuidPattern.test(id)) {
    return send(res, 400, { error: 'partitura_id inválido' });
  }
  // Until the server key is verified for this exact Supabase project,
  // direct Storage RLS is authoritative; never use a key from another project.
  if (process.env.TUTTI_PRIVILEGED_BACKEND_ENABLED !== 'true')
    return send(res,503,{error:'storage_unconfigured'});
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Security boundary: the backend must never query a different Supabase project
  // from the frontend build. Fail closed instead of crossing production/staging.
  if (!url || !process.env.VITE_SUPABASE_URL || url !== process.env.VITE_SUPABASE_URL)
    return send(res,503,{error:'supabase_environment_mismatch'});

  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !anonKey || !serviceKey) return send(res, 503, { error: 'storage_unconfigured' });

  try {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: sheet, error: sheetError } = await admin.from('partituras')
      .select('id,publicado,categoria,storage_bucket,storage_path').eq('id', id).maybeSingle();
    if (sheetError) return send(res, 503, { error: 'sheet_lookup_failed' });
    if (!sheet) return send(res, 404, { error: 'partitura_not_found' });

    const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
    let user = null;
    if (bearer) {
      const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const result = await auth.auth.getUser(bearer[1]);
      if (!result.error) user = result.data?.user || null;
    }
    let isAdmin = false;
    if (user?.email && user.email_confirmed_at) {
      const { data, error } = await admin.from('administradores_autorizados').select('email');
      if (error) return send(res, 503, { error: 'authorization_unavailable' });
      isAdmin = (data || []).some(row => String(row.email).trim().toLowerCase() === user.email.trim().toLowerCase());
    }
    if (!sheet.publicado && !isAdmin) return send(res, 403, { error: 'partitura_nao_publicada' });

    const paid = sheet.categoria === 'paga';
    if (paid && !isAdmin) {
      if (!user) return send(res, 401, { error: 'login_required' });
      const direct = await admin.from('partituras_acessos').select('partitura_id')
        .eq('user_id', user.id).eq('partitura_id', id).limit(1);
      if (direct.error) return send(res, 503, { error: 'entitlements_unavailable' });
      let allowed = (direct.data || []).length > 0;
      if (!allowed) {
        const items = await admin.from('conjuntos_partituras_itens').select('conjunto_id').eq('partitura_id', id);
        if (items.error) return send(res, 503, { error: 'bundle_access_unavailable' });
        const ids = (items.data || []).map(row => row.conjunto_id);
        if (ids.length) {
          const bundles = await admin.from('conjuntos_acessos').select('conjunto_id')
            .eq('user_id', user.id).in('conjunto_id', ids).limit(1);
          if (bundles.error) return send(res, 503, { error: 'bundle_access_unavailable' });
          allowed = (bundles.data || []).length > 0;
        }
      }
      if (!allowed) return send(res, 403, { error: 'partitura_nao_adquirida' });
    }
    if (!sheet.storage_path || sheet.storage_bucket !== 'tutti-partituras') {
      return send(res, 503, { error: 'pdf_storage_not_configured' });
    }
    const signed = await admin.storage.from('tutti-partituras').createSignedUrl(sheet.storage_path, paid ? 120 : 300);
    if (signed.error || !signed.data?.signedUrl) return send(res, 503, { error: 'pdf_unavailable' });
    return send(res, 200, { url: signed.data.signedUrl, protected: paid, expiresIn: paid ? 120 : 300 });
  } catch {
    return send(res, 503, { error: 'pdf_unavailable' });
  }
}
