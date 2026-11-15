/**
 * Tutti payment/access policy. Pure server-side helpers; no database writes.
 * Never grant access based on a browser redirect or unverified client claims.
 */
export const PLAN_CATALOG = Object.freeze({
  pro: Object.freeze({ amountCents: 1990, months: null, lifetime: true, teacherLessons: false }),
  mensal: Object.freeze({ amountCents: 29990, months: 1, lifetime: false, teacherLessons: true }),
  trimestral: Object.freeze({ amountCents: 79990, months: 3, lifetime: false, teacherLessons: true }),
  semestral: Object.freeze({ amountCents: 164990, months: 6, lifetime: false, teacherLessons: true }),
});

export function getPlan(planId) {
  if (!Object.hasOwn(PLAN_CATALOG, planId)) throw new Error('invalid_plan');
  return PLAN_CATALOG[planId];
}

export function isPaidCheckout(session, expectedUserId, expectedPlanId) {
  if (!session || session.mode !== 'payment' || session.payment_status !== 'paid') return false;
  if (!expectedUserId || !expectedPlanId || !Object.hasOwn(PLAN_CATALOG, expectedPlanId)) return false;
  if (session.client_reference_id !== expectedUserId ||
      session.metadata?.user_id !== expectedUserId ||
      session.metadata?.plano_id !== expectedPlanId ||
      session.metadata?.tipo !== 'tutti_plano') return false;
  return session.currency?.toLowerCase() === 'brl' &&
    session.amount_total === PLAN_CATALOG[expectedPlanId].amountCents;
}

export function calculateAccessEnd(planId, paidAt, previousEnd = null) {
  const plan = getPlan(planId);
  if (plan.lifetime) return null;
  const paid = new Date(paidAt);
  if (!Number.isFinite(paid.getTime())) throw new Error('invalid_paid_at');
  const previous = previousEnd == null ? null : new Date(previousEnd);
  if (previous && !Number.isFinite(previous.getTime())) throw new Error('invalid_previous_end');
  // Manual renewal extends an existing, unexpired period; never shortens access.
  const start = previous && previous > paid ? previous : paid;
  const result = new Date(start);
  const targetMonth = result.getUTCMonth() + plan.months;
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(targetMonth);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDay));
  return result.toISOString();
}

export function hasTeacherAccess(entitlement, at = new Date()) {
  if (!entitlement || entitlement.status !== 'ativo') return false;
  const plan = PLAN_CATALOG[entitlement.plano_id];
  if (!plan?.teacherLessons || !entitlement.data_inicio || !entitlement.data_fim) return false;
  const now = new Date(at).getTime();
  const start = new Date(entitlement.data_inicio).getTime();
  const end = new Date(entitlement.data_fim).getTime();
  return Number.isFinite(now) && Number.isFinite(start) && Number.isFinite(end) &&
    start <= now && now < end;
}

export function hasProDigitalAccess(entitlement, at = new Date()) {
  if (!entitlement || entitlement.status !== 'ativo') return false;
  if (entitlement.plano_id === 'pro') return Boolean(entitlement.data_inicio) &&
    Number.isFinite(new Date(entitlement.data_inicio).getTime()) &&
    new Date(entitlement.data_inicio) <= new Date(at);
  return hasTeacherAccess(entitlement, at);
}
