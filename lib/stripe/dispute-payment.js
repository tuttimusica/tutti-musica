// Resolve the original payment intent for a charge/dispute webhook.
// Dispute payloads may omit payment_intent but include the charge ID.
export async function resolveReversalPaymentIntent(stripe, eventType, object) {
  if (!object || typeof object !== 'object') return null;
  const direct = object.payment_intent;
  if (typeof direct === 'string' && direct.startsWith('pi_')) return direct;
  if (direct && typeof direct === 'object' && typeof direct.id === 'string' && direct.id.startsWith('pi_')) return direct.id;
  if (eventType !== 'charge.dispute.created') return null;
  const charge = object.charge;
  const chargeId = typeof charge === 'string' ? charge : charge?.id;
  if (typeof chargeId !== 'string' || !chargeId.startsWith('ch_')) return null;
  const retrieved = await stripe.charges.retrieve(chargeId);
  const payment = retrieved?.payment_intent;
  const id = typeof payment === 'string' ? payment : payment?.id;
  return typeof id === 'string' && id.startsWith('pi_') ? id : null;
}
