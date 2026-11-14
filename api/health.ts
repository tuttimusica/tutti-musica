import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Non-sensitive deployment probe for Tutti's Vercel Node.js backend.
 * Deliberately does not check or expose environment variables, credentials,
 * database records, or privileged services.
 */
export default function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'method_not_allowed' }));
    return;
  }
  res.statusCode = 200;
  res.end(JSON.stringify({ service: 'tutti-api', status: 'ok' }));
}
