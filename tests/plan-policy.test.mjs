import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAN_CATALOG, getPlan, isPaidCheckout, calculateAccessEnd, hasTeacherAccess, hasProDigitalAccess } from '../api/stripe/plan-policy.js';

test('all four plans have fixed server-side amounts and manual one-time checkout', () => {
  assert.deepEqual(Object.entries(PLAN_CATALOG).map(([id,p])=>[id,p.amountCents]), [
    ['pro',1990],['mensal',29990],['trimestral',79990],['semestral',164990]
  ]);
  assert.throws(()=>getPlan('__proto__'),/invalid_plan/);
});

test('unpaid, recurring or mismatched checkout never grants access', () => {
  const base={mode:'payment',payment_status:'paid',currency:'brl',amount_total:29990,
    client_reference_id:'student',metadata:{tipo:'tutti_plano',user_id:'student',plano_id:'mensal'}};
  assert.equal(isPaidCheckout(base,'student','mensal'),true);
  for (const change of [
    {payment_status:'unpaid'}, {mode:'subscription'}, {amount_total:1990},
    {client_reference_id:'other'}, {metadata:{...base.metadata,user_id:'other'}},
    {currency:'usd'}
  ]) assert.equal(isPaidCheckout({...base,...change},'student','mensal'),false);
});

test('monthly purchase expires and manual renewal extends existing access', () => {
  assert.equal(calculateAccessEnd('mensal','2026-01-31T10:00:00Z'),'2026-02-28T10:00:00.000Z');
  assert.equal(calculateAccessEnd('mensal','2026-02-10T10:00:00Z','2026-02-28T10:00:00Z'),'2026-03-28T10:00:00.000Z');
  assert.equal(calculateAccessEnd('trimestral','2026-01-31T10:00:00Z'),'2026-04-30T10:00:00.000Z');
  assert.equal(calculateAccessEnd('pro','2026-01-01T00:00:00Z'),null);
});

test('teacher access requires paid active Ultra period; Pro remains digital-only', () => {
  const at='2026-02-15T12:00:00Z';
  const active={plano_id:'mensal',status:'ativo',data_inicio:'2026-02-01T00:00:00Z',data_fim:'2026-03-01T00:00:00Z'};
  assert.equal(hasTeacherAccess(active,at),true);
  assert.equal(hasTeacherAccess({...active,status:'pendente'},at),false);
  assert.equal(hasTeacherAccess({...active,data_fim:'2026-02-01T00:00:00Z'},at),false);
  assert.equal(hasTeacherAccess({...active,plano_id:'pro',data_fim:null},at),false);
  assert.equal(hasProDigitalAccess({plano_id:'pro',status:'ativo',data_inicio:'2026-01-01T00:00:00Z',data_fim:null},at),true);
  assert.equal(hasProDigitalAccess({plano_id:'pro',status:'reembolsado',data_inicio:'2026-01-01T00:00:00Z'},at),false);
});
