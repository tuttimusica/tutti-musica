// Pilot access is strictly derived from an authenticated, verified user and
// the server-owned administrative allowlist in Supabase (never from client roles).
export function isAuthorizedProPilot(email, administrators) {
  if (typeof email !== 'string' || !Array.isArray(administrators)) return false;
  const normalized=email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return false;
  return administrators.some(entry=>typeof entry?.email==='string' &&
    entry.email.trim().toLowerCase()===normalized);
}
