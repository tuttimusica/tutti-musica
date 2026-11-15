import { createClient } from '@supabase/supabase-js';

/**
 * Verifies an access token with Supabase Auth. This endpoint never returns
 * user records, roles, e-mail addresses, or administrative credentials.
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

  const authHeader = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) {
    res.statusCode = 401;
    res.end(JSON.stringify({ authenticated: false }));
    return;
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Reject backend tokens targeting another Supabase project than this frontend.
  if (!url || !process.env.VITE_SUPABASE_URL || url !== process.env.VITE_SUPABASE_URL) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'supabase_environment_mismatch' }));
    return;
  }

  const publishableKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'auth_service_unconfigured' }));
    return;
  }

  try {
    const client = createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await client.auth.getUser(match[1]);
    if (error || !data.user) {
      res.statusCode = 401;
      res.end(JSON.stringify({ authenticated: false }));
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ authenticated: true }));
  } catch {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'auth_service_unavailable' }));
  }
}
