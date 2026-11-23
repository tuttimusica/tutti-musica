// Independent and non-sensitive Stripe preflight probes for the Tutti Pro admin dashboard.
// Do not return exception messages, Stripe response bodies, IDs, or credential values.
export function classifyStripePreflightError(error) {
  if (error?.statusCode === 403 || error?.type === 'StripePermissionError') return 'permissao_negada';
  if (error?.statusCode === 401 || error?.type === 'StripeAuthenticationError') return 'credencial_invalida';
  if (error?.statusCode === 404) return 'recurso_nao_encontrado';
  return 'falha_de_consulta';
}

export async function inspectStripePreflight(stripe, priceId, expectedAccountId) {
  const checks={stripeAccount:false,stripePrice:false,stripeRequiredReads:false};
  const issues={};
  const account=async()=>{
    try {
      const owner=await stripe.accounts.retrieve();
      checks.stripeAccount=owner?.id===expectedAccountId && owner.charges_enabled===true;
      if(!checks.stripeAccount) issues.stripeAccount='conta_incorreta_ou_bloqueada';
    }catch(error){issues.stripeAccount=classifyStripePreflightError(error);}
  };
  const price=async()=>{
    try {
      const value=await stripe.prices.retrieve(priceId);
      checks.stripePrice=value?.active===true&&value?.livemode===true&&
        value.currency==='brl'&&value.unit_amount===1990&&!value.recurring;
      if(!checks.stripePrice) issues.stripePrice='preco_incorreto_ou_inativo';
    }catch(error){issues.stripePrice=classifyStripePreflightError(error);}
  };
  const reads=async()=>{
    const ops=[
      ['checkoutSessions',()=>stripe.checkout.sessions.list({limit:1})],
      ['paymentIntents',()=>stripe.paymentIntents.list({limit:1})],
      ['charges',()=>stripe.charges.list({limit:1})]
    ];
    const results=await Promise.all(ops.map(async([name,fn])=>{
      try {await fn();return {name,ok:true};}
      catch(error){return {name,ok:false,reason:classifyStripePreflightError(error)};}
    }));
    checks.stripeRequiredReads=results.every(v=>v.ok);
    for(const entry of results)if(!entry.ok)issues[entry.name]=entry.reason;
  };
  await Promise.all([account(),price(),reads()]);
  return {checks,issues};
}
