import { createClient } from '@supabase/supabase-js';

/**
 * Backend-only administrator check.
 * The requester's identity comes from Supabase Auth, never from a submitted
 * email, client-side role, or editable user metadata.
 */
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
    const { data: { user }, error } = await authClient.auth.getUser(bearer[1]);
    if (error || !user || !user.email || !user.email_confirmed_at) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    // Only server-side code may use the privileged Supabase key.
    const adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error: dbError } = await adminClient
      .from('administradores_autorizados')
      .select('email')
      .limit(1000);

    if (dbError) {
      res.statusCode = 503;
      res.end(JSON.stringify({ error: 'authorization_unavailable' }));
      return;
    }
    res.statusCode = 200;
    const authenticatedEmail = user.email.trim().toLowerCase();
    const isAdmin = Array.isArray(data) && data.some(row =>
      typeof row.email === 'string' && row.email.trim().toLowerCase() === authenticatedEmail
    );
    res.end(JSON.stringify({ isAdmin }));
  } catch {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'authorization_unavailable' }));
  }
}
