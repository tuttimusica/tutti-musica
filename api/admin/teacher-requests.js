import { createClient } from '@supabase/supabase-js';

// Server-side list of teacher applications. The service key must never reach the browser.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'method_not_allowed' }));
    return;
  }
  const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!bearer) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Keep browser auth and server authorization on the exact same Supabase project.
  if (!url || !process.env.VITE_SUPABASE_URL || url !== process.env.VITE_SUPABASE_URL) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'supabase_environment_mismatch' }));
    return;
  }

  const publicKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !publicKey || !serviceKey) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'auth_service_unconfigured' }));
    return;
  }

  try {
    const authClient = createClient(url, publicKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(bearer[1]);
    if (authError || !user?.email || !user.email_confirmed_at) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    const adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: admins, error: adminsError } = await adminClient
      .from('administradores_autorizados')
      .select('email')
      .limit(1000);
    if (adminsError) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'authorization_unavailable' }));
      return;
    }
    const email = user.email.trim().toLowerCase();
    const authorized = Array.isArray(admins) && admins.some(row =>
      typeof row.email === 'string' && row.email.trim().toLowerCase() === email
    );
    if (!authorized) {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: 'forbidden' }));
      return;
    }

    const { data: requests, error: listError } = await adminClient
      .from('solicitacoes_professores')
      .select('id,user_id,nome,email,instrumento,bio,status,created_at,decided_at,decided_by')
      .order('created_at', { ascending: false })
      .limit(100);
    if (listError) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'requests_unavailable' }));
      return;
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ requests: requests || [] }));
  } catch {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'requests_unavailable' }));
  }
}
