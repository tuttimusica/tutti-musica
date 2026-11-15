# Tutti Escola de Música — publicação para avaliação como novo visitante
Data: 15 de novembro de 2026

## Site oficial
- URL: https://tutti-musica.vercel.app
- GitHub: `tuttimusica/tutti-musica`, branch `main`.
- Release: PR #1, merge commit `412dc57342906734e0c16194bf1e1955f45f5356`.
- Primeira versão publicada na Vercel para esse merge: `tutti-musica-odcqf7hao-tutti8.vercel.app`, target `production`, status `READY`.
- GET `/` e bundle JS: HTTP 200; o frontend publicado incorpora apenas o projeto Supabase `viwxalwpvuvgcyxsdjbi`, sem referências aos IDs de staging ou ao terceiro projeto identificado.
- GET `/api/health`: HTTP 200 (`{"service":"tutti-api","status":"ok"}`).

## Banco principal
Preservados os quatro usuários existentes; testes foram feitos em transações `BEGIN ... ROLLBACK`, com e-mails `invalid.example`. As migrações de produção adicionaram estrutura de compositores, conjuntos, biblioteca, grants, aprovação de professor e agendamento sem remover tabelas ou registros existentes.

### Migrações já instaladas no Supabase principal
- `tutti_prod_additive_catalog_compatibility_20261115`
- `tutti_prod_profile_pdf_rls_hardening_20261115`
- `tutti_prod_teacher_approval_compatibility_20261115`
- `tutti_prod_role_trigger_admin_approval_fix_20261115`
- `tutti_prod_paid_ledger_disabled_20261115`
- `tutti_prod_paid_lesson_booking_20261115`
- `tutti_prod_teacher_booking_trigger_fix_20261115`
- `tutti_prod_postmigration_security_cleanup_20261115`

Os scripts revisados estão versionados em `docs/security/20261115_PROD_*.sql`. **Não reaplicá-los diretamente** sem verificar migrações e dados. Não foi realizado dump/restore externo do banco neste turno: backups gerenciados precisam ser verificados no painel.

## Testes confirmados (sem geração de cobrança)
- Dois cadastros simulados ativam gatilhos de perfil sem criar registros permanentes.
- Professor pendente pode solicitar análise e desenvolvedor verificado pode aprová-lo; `usuarios.role=teacher` com aprovação, preservando a restrição `profiles.role=user/admin` do esquema existente.
- Concessão de Ultra via função em modo de teste, agendamento de 60 minutos, bloqueio de reserva sobreposta, reembolso e recusa de novo agendamento depois de reembolso.
- Usuários anônimos não visualizam a tabela de perfis privados; diretório de professores retorna somente campos públicos curados.
- PDF Storage `tutti-partituras` é privado; políticas distinguem materiais gratuitos de materiais pagos com concessões explícitas.
- O GitHub Actions da branch auditada passou antes do merge. Workflow atualizado para executar também em push da branch `main`.
- Supabase Security Advisor: avisos de função SECURITY DEFINER indevida removidos. Resta alerta `auth_leaked_password_protection`: habilitar proteção contra senhas comprometidas no painel Supabase Auth.

## Configuração segura de produção
- Produção Vercel: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` configuradas para o projeto `viwxalwpvuvgcyxsdjbi`, equivalente ao site principal anteriormente publicado.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` e variáveis públicas equivalentes atualizadas para a mesma origem.
- Antes, as configurações de backend da Vercel apontavam para um **terceiro** Supabase sem acesso no conector; as credenciais privilegiadas antigas NÃO foram usadas nesta publicação.
- `TUTTI_PRIVILEGED_BACKEND_ENABLED=false`: APIs administrativas privilegiadas e assinatura de PDFs pelo service-role retornam erro de configuração; leitura PDF usa RLS do Supabase como alternativa segura.
- `TUTTI_PAYMENT_TEST_MODE=false` e cliente também exige `VITE_TUTTI_PAYMENTS_ENABLED=true` para oferecer Checkout. Portanto, cobrança real/desenvolvimento de checkout estão bloqueados.
- `api/emails/welcome.js` permanece desativado em produção até verificação do domínio Resend e configuração de remetente.

## O que o usuário pode avaliar agora
Em uma janela anônima/privada, acessar homepage, menus públicos, catálogo, páginas de planos e autenticação. Conferir responsividade e compreensão de fluxos. 
**Limitações observadas**: Não existem professores aprovados nem PDFs cadastrados no banco principal até o momento; portanto, os respectivos catálogos reais estarão vazios. Login Google, e-mail de confirmação, boas-vindas, uploads reais e reuniões Google Meet não tiveram teste E2E via navegador. Não se deve criar uma compra real; Checkout está desativado e exibirá indisponibilidade.

## Impedimentos comerciais
- Configuração e entrega de e-mail de confirmação no Supabase Auth; domínio próprio opcional para marca própria, mas Resend remetente verificado ainda inexistente.
- Google OAuth/redirecionamentos verificados; Google Calendar/Meet via integração backend autorizada.
- Chave privilegiada correta do Supabase de produção (credenciais existentes na Vercel não devem ser presumidas válidas); configuração segura e específica do ambiente.
- Produtos/fluxo de pagamento Stripe **live** com webhooks assinados, chargebacks, idempotência, reembolso, proteção da Vercel e conciliação real, antes de ativar vendas.
- Upload e download real de PDFs via Storage, permissões de conjuntos e casos de borda com diferentes contas.
- Backup e restauração, QA de interface real e segurança, acessibilidade, privacidade LGPD e suporte.

## Decisão
**PUBLICAÇÃO PARA AVALIAÇÃO DE VISITANTE: SIM. LIBERAÇÃO COMERCIAL: NÃO.** Site e banco principal atualizados sem apagar os usuários existentes; pagamentos e acessos privilegiados ainda desligados para evitar cobranças ou vazamentos.
