# Supabase staging bootstrap — 2026-11-15

**Staging project only:** `vscuqfoyrycfzthexvjy` (Tutti Música — Testes), separate from production `viwxalwpvuvgcyxsdjbi`.

Applied migration: `tutti_staging_core_billing_baseline`. This establishes only the **billing foundation**, not the full Tutti app schema.

Verified after migration:
- public.planos: 4 rows; pro 1990, mensal 29990, trimestral 79990, semestral 164990 cents, all `recorrencia='unico'`.
- public.assinaturas_usuarios: 0 rows, RLS enabled, authenticated users SELECT own rows only.
- public.pagamentos: 0 rows, RLS enabled, authenticated users SELECT own rows only.
- tutti_private.plan_checkout_grants: 0 rows, private schema, RLS enabled, **no client policies by design**. Supabase advisor INFO 'RLS enabled no policy' is intentional here.
- No real payments, production changes, Stripe keys, email credentials, or Vercel preview variables configured.

**Important blockers before using checkout:**
1. Staging baseline has not yet installed the trusted grant/revoke RPCs or verified refund handling.
2. The SQL draft `20261115_plan_grants_STAGING_REVIEW_ONLY.sql` is for the legacy production schema; **do not run it as-is** on this staging baseline: tables/constraints already exist and the draft requires reconciliation.
3. Frontend depends on additional school tables, roles, profiles, sheets and bookings. Build migrations and test from a consistent schema before connecting preview.
4. Keep `TUTTI_PAYMENT_TEST_MODE` disabled until signed Stripe webhook, RLS, test-only keys and isolated Supabase are verified.
5. No production deploy or merge without user approval.
