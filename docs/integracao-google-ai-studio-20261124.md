# Integração Google AI Studio — 24/11/2026

Branch de integração **não publicada**, iniciada a partir da main de produção para preservar a primeira compra Stripe bem-sucedida.

Recebido ZIP completo do frontend do AI Studio. Foram identificados sete arquivos conflitantes:
- src/App.tsx
- src/components/Subscription/PlansModal.tsx
- src/components/Panels/DeveloperPanel.tsx
- src/components/Panels/TeacherPanel.tsx
- src/components/Panels/StudentPanel.tsx
- src/services/stripeService.ts
- src/services/partiturasService.ts

**Não aplicar Keep all nem sobrescrever a main com o ZIP.**

## Incompatibilidades confirmadas
- ZIP aponta para `/api/stripe/create-checkout-session`; produção atende `/api/stripe/create-plan-checkout`.
- ZIP tenta usar `partituras` e `partituras-pagas`; a produção usa o bucket privado `tutti-partituras`.
- ZIP reintroduz compra individual de PDF; na produção a venda é somente por Tutti Pro Vitalício e o endpoint individual retorna 410.
- Nova biblioteca usa campos `ordem` em `conjuntos_partituras_itens` que ainda não existem no schema de produção.
- `server.ts` é Express do AI Studio e não substitui os endpoints serverless existentes em `api/`.
- Preservar checkout piloto e controles de assinatura e RLS existentes.

## Protocolo
Integrar novos componentes de biblioteca e agenda, adaptar os serviços existentes, garantir build/testes e somente então abrir PR de código revisado. Nenhum checkout público deve ser habilitado durante o processo.
