// The restricted Stripe key must support the webhook's read operations
// BEFORE any customer can be sent to a payable production Checkout.
export async function ensureProWebhookReadPermissions(stripe) {
  if (!stripe?.checkout?.sessions?.list || !stripe?.paymentIntents?.list ||
      !stripe?.charges?.list) throw new Error('stripe_read_clients_unavailable');
  // Empty lists are valid: the check verifies authorization, not a real sale.
  await Promise.all([
    stripe.checkout.sessions.list({limit:1}),
    stripe.paymentIntents.list({limit:1}),
    stripe.charges.list({limit:1}),
  ]);
}
