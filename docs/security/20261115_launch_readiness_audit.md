# Tutti — avaliação de prontidão para lançamento (2026-11-15)

## Conclusão
**Não aprovar lançamento comercial ainda.** A Vercel tem preview READY, mas não há evidência de fluxo integrado validado para cadastro, aprovação, pagamentos, aulas ou PDFs. PR #1 permanece draft, aberta e não mesclada. Nenhuma alteração de produção foi autorizada nesta auditoria.

## 14 frentes abertas
1. Staging Supabase isolado e backup/restauração.
2. Cadastro de aluno, confirmação e reenvio de email.
3. Cadastro, solicitação e aprovação de professor.
4. RBAC de desenvolvedor/professor/aluno, funções privilegiadas e RLS.
5. Partituras: UUID, colunas, compositores, upload, publicação, destaques.
6. PDFs privados, conjuntos pagos, compras e controle de acesso.
7. Preços Stripe de testes one-time para Pro e três Ultra.
8. Checkout e webhook Stripe com persistência transacional e idempotência.
9. Renovação manual, expiração e Pro vitalício.
10. Estornos, agendamentos, visibilidade de professores e cobertura de aulas.
11. E-mails transacionais e SMTP/Resend.
12. Variáveis Vercel Preview, rotas serverless, observabilidade e smoke tests.
13. Testes de regressão, segurança, CI e teste de jornada ponta a ponta.
14. Contratos, privacidade/LGPD, atendimento, termos e checklist de lançamento.

## Evidências diretas verificadas
- PR #1: draft/open, 34 arquivos, 83 commits, não mesclada (2026-11-15).
- Vercel: preview READY da branch de auditoria; READY não prova comportamento da API.
- Supabase security advisors: 3 funções SECURITY DEFINER executáveis por anon; 4 exposições para authenticated (incluindo aprovação de professor); 3 tabelas com RLS sem policy; proteção contra senhas vazadas desabilitada. Alguns achados podem ser intencionais e exigem revisão, não remoção cega.
- Supabase performance advisors: 12 FKs sem índice; 12 alertas de inicialização de auth em RLS, prioridade secundária.
- Auditorias anteriores: quatro triggers em auth.users; desencontro de lógica de admin; inconsistências críticas de UUID/Storage/colunas de partituras.
- Planos atuais em Supabase: ultra_trimestral e ultra_semestral; IDs divergentes do novo checkout, conforme consulta somente leitura.
- Não há staging Supabase isolado comprovado, nem testes end-to-end de Stripe, cadastro, PDF e aulas.

## Ordem de execução sugerida
**Fase 1 — Bloqueadores:** staging + backup; corrigir RBAC/RLS; cadastro e aprovação; armazenamento de partituras.
**Fase 2 — Receita segura:** Stripe test mode one-time, webhooks, acesso, estornos, renovação manual e agendamentos.
**Fase 3 — Validação:** SMTP, PDFs, testes com perfis reais de staging, segurança, CI, rollback e revisão contratual.
**Fase 4 — Publicação:** revisão humana, autorização explícita, migrações versionadas, deploy gradual, monitoramento e plano de reversão.

## Critérios mínimos para go-live
- Cadastro confirmado, professor aprovado e perfil correto após login.
- Nenhum aluno sem pagamento pode acessar aulas; professor só vê alunos elegíveis.
- Pro vitalício preservado; Ultra expira e só renova após nova compra manual.
- Nenhuma assinatura recorrente Stripe para os quatro planos.
- PDFs pagos inacessíveis sem direito; PDFs gratuitos acessíveis conforme regra.
- Webhook idempotente; estornos e falhas revogam acesso conforme política.
- Testes de permissões com alunos/professores/admins, inclusive acesso direto via API.
- Backups e recuperação testados; variáveis de produção isoladas do preview.
- Termos, privacidade, comunicação e responsabilidades revisados.
- Nenhum bloqueador crítico aberto e autorização explícita de publicação.

## Observação
As 14 frentes são pacotes de trabalho, não contagem exata de bugs nem percentual de conclusão. O esforço depende de staging, compatibilidade do banco, disponibilidade de credenciais e resultados de testes. Não afirmar prazo sem testes e estimativa técnica.
