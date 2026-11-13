import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { buildWelcomeEmailContent } from './src/services/welcomeEmailTemplate';

dotenv.config();

// Ensure valid Supabase URL and Key in environment (discards dummy values like "123")
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_URL.startsWith('http')) {
  process.env.VITE_SUPABASE_URL = 'https://viwxalwpvuvgcyxsdjbi.supabase.co';
}
if (!process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY.length < 15) {
  process.env.VITE_SUPABASE_ANON_KEY = 'sb_publishable_lmlaQ5wY_WDUa5G8O9SRVw_PKStIgXy';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://viwxalwpvuvgcyxsdjbi.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_lmlaQ5wY_WDUa5G8O9SRVw_PKStIgXy';
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const stripe = stripeKey ? new Stripe(stripeKey) : null;

  // Serve static public folder files
  app.use(express.static(path.resolve(__dirname, 'public')));

  // Endpoint de download e visualização do PDF da Estrutura do Banco de Dados
  app.get(['/api/download-db-pdf', '/tutti_estrutura_banco_de_dados.pdf'], (req, res) => {
    const pdfFilePath = path.resolve(__dirname, 'public/tutti_estrutura_banco_de_dados.pdf');
    if (fs.existsSync(pdfFilePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="tutti_estrutura_banco_de_dados.pdf"');
      return res.sendFile(pdfFilePath);
    }
    return res.status(404).send('PDF da estrutura não encontrado.');
  });

  // Endpoint de download do arquivo SQL bruto
  app.get(['/api/download-db-sql', '/tutti_database_full_schema.sql'], (req, res) => {
    const sqlFilePath = path.resolve(__dirname, 'tutti_database_full_schema.sql');
    if (fs.existsSync(sqlFilePath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="tutti_database_full_schema.sql"');
      return res.sendFile(sqlFilePath);
    }
    return res.status(404).send('Arquivo SQL não encontrado.');
  });

  // Endpoint de download do arquivo SQL de atualização master
  app.get(['/api/download-master-sql', '/tutti_master_update_schema.sql'], (req, res) => {
    const sqlFilePath = path.resolve(__dirname, 'tutti_master_update_schema.sql');
    if (fs.existsSync(sqlFilePath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="tutti_master_update_schema.sql"');
      return res.sendFile(sqlFilePath);
    }
    return res.status(404).send('Arquivo SQL master não encontrado.');
  });

  const DEVELOPER_EMAILS = ['eliandrolucas.el@gmail.com', 'desenvolvedor@tutti.mus.br'];

  // Helper: Extrair e validar usuário autenticado do Supabase
  async function getAuthUser(req: express.Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error('Token de autenticação não fornecido.');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) throw new Error('Sessão expirada ou usuário não autenticado.');
    return user;
  }

  // Helper: Usuário opcional
  async function getOptionalAuthUser(req: express.Request) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return null;
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      return user || null;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // E-MAIL AUTOMÁTICO DE BOAS-VINDAS (APÓS CONFIRMAÇÃO DE E-MAIL + IDEMPOTENTE)
  // ============================================================================
  app.post('/api/emails/welcome', async (req, res) => {
    try {
      let user: any = null;
      const authHeader = req.headers.authorization;
      const webhookSecret = process.env.WELCOME_WEBHOOK_SECRET;
      const providedSecret = req.headers['x-webhook-secret'];

      if (authHeader) {
        user = await getAuthUser(req);
      } else if (webhookSecret && providedSecret === webhookSecret && req.body?.record?.id) {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(req.body.record.id);
        if (error || !data?.user) {
          return res.status(404).json({ sent: false, error: 'Usuário do webhook não encontrado.' });
        }
        user = data.user;
      } else {
        return res.status(401).json({ sent: false, error: 'Token de autenticação obrigatório.' });
      }

      if (!user.email) {
        return res.status(400).json({ sent: false, error: 'Usuário sem endereço de e-mail.' });
      }

      // Somente envia após confirmação efetiva do e-mail
      if (!user.email_confirmed_at) {
        return res.json({ sent: false, skipped: true, reason: 'email_not_confirmed' });
      }

      // Idempotência: nunca duplica envio já concluído
      const { data: existingLog } = await supabaseAdmin
        .from('welcome_email_logs')
        .select('id, status, sent_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLog?.status === 'sent') {
        return res.json({ sent: false, alreadySent: true, sentAt: existingLog.sent_at });
      }

      const nome =
        req.body?.nome ||
        user.user_metadata?.full_name ||
        user.user_metadata?.display_name ||
        user.email.split('@')[0] ||
        'Aluno(a)';

      const platformUrl =
        req.body?.platformUrl ||
        process.env.APP_URL ||
        req.headers.origin ||
        'https://tutti-musica-2sbahjsww-tutti8.vercel.app';

      const { subject, html, text } = buildWelcomeEmailContent({ nome, platformUrl });
      const emailFrom = process.env.EMAIL_FROM || 'Tutti Escola de Música <nao-responda@tuttimusica.com.br>';
      const resendApiKey = process.env.RESEND_API_KEY;
      const smtpHost = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      // 1. Tentar via Resend API se configurada
      if (resendApiKey) {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: emailFrom,
            to: [user.email],
            subject,
            html,
            text,
          }),
        });
        const resendJson: any = await resendRes.json().catch(() => ({}));
        if (!resendRes.ok) {
          await supabaseAdmin.from('welcome_email_logs').upsert(
            {
              user_id: user.id,
              email: user.email,
              nome,
              status: 'failed',
              provider: 'resend',
              error_message: resendJson?.message || `HTTP ${resendRes.status}`,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
          return res.status(502).json({ sent: false, error: resendJson?.message || 'Erro ao enviar via Resend.' });
        }

        const sentAt = new Date().toISOString();
        await supabaseAdmin.from('welcome_email_logs').upsert(
          {
            user_id: user.id,
            email: user.email,
            nome,
            status: 'sent',
            provider: 'resend',
            provider_message_id: resendJson?.id || null,
            error_message: null,
            sent_at: sentAt,
            updated_at: sentAt,
          },
          { onConflict: 'user_id' }
        );
        return res.json({ sent: true, provider: 'resend', id: resendJson?.id || null, sentAt });
      }

      // 2. Tentar via SMTP (Nodemailer) se configurado
      if (smtpHost && smtpUser && smtpPass) {
        const port = Number(process.env.SMTP_PORT) || 587;
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port,
          secure: port === 465,
          auth: { user: smtpUser, pass: smtpPass },
        });
        const info = await transporter.sendMail({
          from: emailFrom,
          to: user.email,
          subject,
          text,
          html,
        });
        const sentAt = new Date().toISOString();
        await supabaseAdmin.from('welcome_email_logs').upsert(
          {
            user_id: user.id,
            email: user.email,
            nome,
            status: 'sent',
            provider: 'smtp',
            provider_message_id: info.messageId || null,
            error_message: null,
            sent_at: sentAt,
            updated_at: sentAt,
          },
          { onConflict: 'user_id' }
        );
        return res.json({ sent: true, provider: 'smtp', id: info.messageId || null, sentAt });
      }

      // 3. Nenhum provedor configurado: nunca simular envio bem-sucedido
      await supabaseAdmin.from('welcome_email_logs').upsert(
        {
          user_id: user.id,
          email: user.email,
          nome,
          status: 'unconfigured',
          provider: 'none',
          error_message: 'Nenhum provedor transacional configurado (RESEND_API_KEY ou SMTP_*).',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      return res.json({
        sent: false,
        configured: false,
        reason: 'Provedor transacional (RESEND_API_KEY ou SMTP) não configurado no ambiente.',
      });
    } catch (err: any) {
      return res.status(500).json({ sent: false, error: err?.message || 'Erro no envio do e-mail de boas-vindas.' });
    }
  });

  // ============================================================================
  // PARTITURAS PAGAS & GRATUITAS: URL ASSINADA TEMPORÁRIA + CHECKOUT STRIPE
  // ============================================================================
  app.post('/api/partituras/signed-url', async (req, res) => {
    try {
      const partituraId = Number(req.body?.partitura_id);
      if (!partituraId) {
        return res.status(400).json({ error: 'partitura_id inválido.' });
      }

      const { data: partitura, error: pErr } = await supabaseAdmin
        .from('partituras')
        .select('id, titulo, categoria, preco, publicado, arquivo_pdf_url, storage_path')
        .eq('id', partituraId)
        .single();

      if (pErr || !partitura) {
        return res.status(404).json({ error: 'Partitura não encontrada.' });
      }

      const user = await getOptionalAuthUser(req);
      const isAdmin = Boolean(user?.email && DEVELOPER_EMAILS.includes(user.email.toLowerCase()));

      if (!partitura.publicado && !isAdmin) {
        return res.status(403).json({ error: 'Esta partitura não está publicada.' });
      }

      if (partitura.categoria !== 'paga') {
        if (partitura.storage_path) {
          const { data: signed } = await supabaseAdmin.storage
            .from('partituras')
            .createSignedUrl(partitura.storage_path, 300);
          return res.json({ url: signed?.signedUrl || partitura.arquivo_pdf_url, protected: false });
        }
        return res.json({ url: partitura.arquivo_pdf_url || null, protected: false });
      }

      if (!user) {
        return res.status(401).json({ error: 'Faça login para acessar partituras pagas adquiridas.' });
      }

      let hasAccess = isAdmin;
      if (!hasAccess) {
        const { data: acesso } = await supabaseAdmin
          .from('partituras_acessos')
          .select('id')
          .eq('user_id', user.id)
          .eq('partitura_id', partitura.id)
          .maybeSingle();
        hasAccess = Boolean(acesso);
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Partitura paga ainda não adquirida por esta conta.' });
      }

      if (!partitura.storage_path) {
        return res.json({ url: partitura.arquivo_pdf_url || null, protected: true });
      }

      const { data: signedPaid, error: signErr } = await supabaseAdmin.storage
        .from('partituras-pagas')
        .createSignedUrl(partitura.storage_path, 120);

      if (!signErr && signedPaid?.signedUrl) {
        return res.json({ url: signedPaid.signedUrl, protected: true, expiresIn: 120 });
      }

      const { data: signedFallback } = await supabaseAdmin.storage
        .from('partituras')
        .createSignedUrl(partitura.storage_path, 120);

      return res.json({ url: signedFallback?.signedUrl || null, protected: true, expiresIn: 120 });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Erro ao autorizar leitura da partitura.' });
    }
  });

  app.post('/api/stripe/create-sheet-checkout', async (req, res) => {
    try {
      const user = await getAuthUser(req);
      const partituraId = Number(req.body?.partitura_id);
      if (!partituraId) {
        return res.status(400).json({ error: 'partitura_id é obrigatório.' });
      }

      const { data: partitura, error: pErr } = await supabaseAdmin
        .from('partituras')
        .select('id, titulo, compositor, instrumento, categoria, preco, publicado')
        .eq('id', partituraId)
        .single();

      if (pErr || !partitura || !partitura.publicado) {
        return res.status(404).json({ error: 'Partitura paga não encontrada ou indisponível.' });
      }

      if (partitura.categoria !== 'paga' || Number(partitura.preco) <= 0) {
        return res.status(400).json({ error: 'Esta partitura não exige pagamento.' });
      }

      if (!stripe) {
        return res.status(503).json({
          error: 'STRIPE_SECRET_KEY não configurada no servidor para processar pagamentos de partituras.',
        });
      }

      const origin = req.body?.return_url || req.headers.origin || 'https://tutti-musica-2sbahjsww-tutti8.vercel.app';
      const sessionParams: any = {
        mode: 'payment',
        customer_email: user.email,
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: `Partitura Tutti: ${partitura.titulo}`,
                description: `${partitura.compositor} • ${partitura.instrumento}`,
              },
              unit_amount: Math.round(Number(partitura.preco) * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/partituras?partitura_pago=${partitura.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/partituras?status=cancelled`,
        client_reference_id: user.id,
        metadata: {
          tipo: 'partitura',
          user_id: user.id,
          partitura_id: String(partitura.id),
        },
      };

      const checkoutSession = await stripe.checkout.sessions.create(sessionParams);
      return res.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Erro ao iniciar compra da partitura.' });
    }
  });

  // ============================================================================
  // LOJA TUTTI: CHECKOUT STRIPE COM VALIDAÇÃO DE PREÇOS NO BACKEND
  // ============================================================================
  app.post('/api/stripe/create-store-checkout-session', async (req, res) => {
    try {
      const user = await getOptionalAuthUser(req);
      const { items, couponCode, customerEmail, customerName, shippingAddress, return_url } = req.body || {};

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Carrinho vazio.' });
      }

      const productIds = items.map((i: any) => Number(i.id)).filter((id: number) => !isNaN(id));
      const { data: dbProducts, error: prodErr } = await supabaseAdmin
        .from('produtos_loja')
        .select('id, nome, preco, em_estoque, publicado, imagem_principal, imagem_url')
        .in('id', productIds);

      if (prodErr || !dbProducts || dbProducts.length === 0) {
        return res.status(404).json({ error: 'Produtos não encontrados no catálogo.' });
      }

      const verifiedItems: any[] = [];
      let subtotal = 0;

      for (const reqItem of items) {
        const qty = Math.max(1, Math.min(20, Number(reqItem.quantity) || 1));
        const prod = dbProducts.find((p: any) => Number(p.id) === Number(reqItem.id));
        if (!prod || prod.publicado === false || prod.em_estoque === false) {
          return res.status(400).json({ error: `Produto indisponível ou fora de estoque (ID ${reqItem.id}).` });
        }
        const unitPrice = Number(prod.preco);
        subtotal += unitPrice * qty;
        verifiedItems.push({
          id: prod.id,
          name: prod.nome,
          price: unitPrice,
          quantity: qty,
          image: prod.imagem_principal || prod.imagem_url || null,
        });
      }

      let discountPercent = 0;
      if (couponCode) {
        const cleanCode = String(couponCode).trim().toUpperCase();
        const { data: coupon } = await supabaseAdmin
          .from('cupons_desconto')
          .select('codigo, percentual_desconto, ativo, valido_ate')
          .eq('codigo', cleanCode)
          .eq('ativo', true)
          .maybeSingle();

        if (coupon && (!coupon.valido_ate || new Date(coupon.valido_ate) > new Date())) {
          discountPercent = Number(coupon.percentual_desconto) || 0;
        }
      }

      const discountValue = Number(((subtotal * discountPercent) / 100).toFixed(2));
      const total = Math.max(0.5, Number((subtotal - discountValue).toFixed(2)));
      const orderId = `TT-${Date.now().toString().slice(-6)}`;

      const targetEmail = user?.email || customerEmail;
      if (!targetEmail) {
        return res.status(400).json({ error: 'E-mail de contato obrigatório para registro do pedido.' });
      }

      // Registrar pedido inicialmente como pendente de pagamento
      await supabaseAdmin.from('orders').insert({
        id: orderId,
        user_id: user?.id || 'guest',
        user_email: targetEmail,
        items: verifiedItems,
        subtotal,
        discount: discountValue,
        total,
        coupon: discountPercent > 0 ? String(couponCode).trim().toUpperCase() : null,
        payment_method: stripe ? 'stripe' : 'pending_manual',
        status: 'pending_payment',
        shipping_address: shippingAddress || '',
      });

      if (!stripe) {
        return res.status(503).json({
          orderId,
          status: 'pending_payment',
          configured: false,
          error: 'STRIPE_SECRET_KEY não configurada no servidor. Pedido registrado como pendente de pagamento para atendimento da secretaria.',
        });
      }

      const origin = return_url || req.headers.origin || 'https://tutti-musica-2sbahjsww-tutti8.vercel.app';
      const factor = subtotal > 0 ? total / subtotal : 1;

      const sessionParams: any = {
        mode: 'payment',
        customer_email: targetEmail,
        line_items: verifiedItems.map((item) => ({
          price_data: {
            currency: 'brl',
            product_data: {
              name: item.name,
            },
            unit_amount: Math.max(50, Math.round(item.price * factor * 100)),
          },
          quantity: item.quantity,
        })),
        success_url: `${origin}/loja?pedido=${orderId}&status=paid&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/loja?pedido=${orderId}&status=cancelled`,
        client_reference_id: user?.id || orderId,
        metadata: {
          tipo: 'loja',
          order_id: orderId,
          user_id: user?.id || 'guest',
          customer_name: customerName || '',
        },
      };

      const checkoutSession = await stripe.checkout.sessions.create(sessionParams);
      await supabaseAdmin
        .from('orders')
        .update({ stripe_session_id: checkoutSession.id })
        .eq('id', orderId);

      return res.json({ url: checkoutSession.url, sessionId: checkoutSession.id, orderId });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Erro ao processar checkout da Loja Tutti.' });
    }
  });

  // 1. ENDPOINT: Criar Sessão do Stripe Checkout
  app.post('/api/stripe/create-checkout-session', async (req, res) => {
    try {
      const user = await getAuthUser(req);
      const { plano_id, return_url } = req.body;

      if (!plano_id) {
        return res.status(400).json({ error: 'O identificador do plano (plano_id) é obrigatório.' });
      }

      // Buscar plano no banco de dados (validação estrita no backend)
      let plano: any = null;
      try {
        const { data: dbPlano } = await supabaseAdmin
          .from('planos')
          .select('*')
          .eq('id', plano_id)
          .single();
        plano = dbPlano;
      } catch (e) {
        console.warn('Busca no banco falhou, verificando catálogo oficial:', e);
      }

      // Fallback para catálogo oficial se ainda não tiver rodado a migration
      if (!plano) {
        const fallbackPlans: Record<string, any> = {
          mensal: { id: 'mensal', nome: 'Tutti Ultra Mensal', preco: 299.90, recorrencia: 'mensal', stripe_product_id: 'prod_Vb7a4cZFfk1zKO', intervalo: 'month', intervalo_count: 1, ativo: true },
          trimestral: { id: 'trimestral', nome: 'Tutti Ultra Trimestral', preco: 799.90, recorrencia: 'trimestral', stripe_product_id: 'prod_Vb7bFGhgGPvHtW', intervalo: 'month', intervalo_count: 3, ativo: true },
          semestral: { id: 'semestral', nome: 'Tutti Ultra Semestral', preco: 1649.90, recorrencia: 'semestral', stripe_product_id: 'prod_Vb7e0rGvV0Hqhf', intervalo: 'month', intervalo_count: 6, ativo: true },
          pro: { id: 'pro', nome: 'Tutti Pro Vitalício', preco: 49.90, recorrencia: 'vitalicio', stripe_product_id: null, ativo: true },
        };
        plano = fallbackPlans[plano_id];
      }

      if (!plano) {
        return res.status(404).json({ error: 'Plano não encontrado no catálogo da Tutti.' });
      }

      if (plano.ativo === false) {
        return res.status(400).json({ error: 'Este plano não está disponível para novas contratações.' });
      }

      const origin = return_url || req.headers.origin || 'https://tutti-musica-2sbahjsww-tutti8.vercel.app';
      const successUrl = `${origin}/?session_id={CHECKOUT_SESSION_ID}&status=success&tab=assinatura`;
      const cancelUrl = `${origin}/?status=cancelled&tab=assinatura`;

      // Se a chave Stripe não estiver configurada no ambiente local, retornar instrução
      if (!stripe) {
        console.warn('STRIPE_SECRET_KEY não encontrada no .env do servidor local.');
        return res.json({
          url: `${origin}/?status=stripe_mock_checkout&plano=${plano.id}&session_id=mock_cs_${Date.now()}`,
          sessionId: `mock_session_${Date.now()}`,
          isMock: true,
          message: 'STRIPE_SECRET_KEY não configurada no servidor. Redirecionando para visualização em modo de teste.'
        });
      }

      // Localizar ou criar cliente no Stripe
      let customerId: string | null = null;
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const newCustomer = await stripe.customers.create({
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0],
          metadata: { supabase_user_id: user.id },
        });
        customerId = newCustomer.id;
      }

      const sessionMode = plano.recorrencia === 'vitalicio' ? 'payment' : 'subscription';
      const lineItems: any[] = plano.stripe_price_id
        ? [{ price: plano.stripe_price_id, quantity: 1 }]
        : [
            {
              price_data: {
                currency: 'brl',
                product: plano.stripe_product_id || undefined,
                product_data: plano.stripe_product_id ? undefined : {
                  name: plano.nome,
                  description: plano.descricao || 'Assinatura Tutti Escola de Música',
                },
                unit_amount: Math.round(Number(plano.preco) * 100),
                ...(sessionMode === 'subscription' ? {
                  recurring: {
                    interval: plano.intervalo || 'month',
                    interval_count: plano.intervalo_count || 1,
                  }
                } : {}),
              },
              quantity: 1,
            },
          ];

      const sessionParams: any = {
        customer: customerId,
        mode: sessionMode,
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: user.id,
        metadata: {
          user_id: user.id,
          plano_id: plano.id,
        },
      };

      const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

      return res.json({
        url: checkoutSession.url,
        sessionId: checkoutSession.id,
      });
    } catch (err: any) {
      console.error('Erro em /api/stripe/create-checkout-session:', err);
      return res.status(500).json({ error: err.message || 'Erro ao criar sessão de checkout.' });
    }
  });

  // 2. ENDPOINT: Stripe Webhook com validação de assinatura e idempotência
  app.post('/api/stripe/webhook', async (req: any, res) => {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret || !stripe) {
      return res.status(400).send('Webhook Secret ou assinatura Stripe não configurados.');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error('Falha de validação da assinatura do Webhook:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Verificar idempotência no banco
    const { data: existing } = await supabaseAdmin
      .from('stripe_eventos')
      .select('id, processado')
      .eq('id', event.id)
      .maybeSingle();

    if (existing?.processado) {
      return res.json({ received: true, status: 'already_processed' });
    }

    await supabaseAdmin.from('stripe_eventos').upsert({
      id: event.id,
      tipo: event.type,
      payload: event.data.object,
      processado: false,
      created_at: new Date().toISOString(),
    });

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          const userId = session.client_reference_id || session.metadata?.user_id;
          const tipo = session.metadata?.tipo || 'assinatura';

          if (tipo === 'partitura') {
            const partituraId = Number(session.metadata?.partitura_id);
            if (userId && partituraId) {
              await supabaseAdmin.from('partituras_acessos').upsert(
                {
                  user_id: userId,
                  partitura_id: partituraId,
                  tipo_acesso: 'compra',
                  stripe_session_id: session.id,
                  valor_pago: (session.amount_total || 0) / 100,
                  granted_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,partitura_id' }
              );
            }
            break;
          }

          if (tipo === 'loja') {
            const orderId = session.metadata?.order_id;
            if (orderId) {
              await supabaseAdmin
                .from('orders')
                .update({ status: 'paid', stripe_session_id: session.id })
                .eq('id', orderId);
            }
            break;
          }

          const planoId = session.metadata?.plano_id || 'mensal';
          if (userId) {
            let dataFim = null;
            if (session.subscription && stripe) {
              const sub: any = await stripe.subscriptions.retrieve(session.subscription as string);
              if (sub?.current_period_end) {
                dataFim = new Date(sub.current_period_end * 1000).toISOString();
              }
            }
            await supabaseAdmin.from('assinaturas_usuarios').upsert({
              user_id: userId,
              plano_id: planoId,
              status: 'ativo',
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: (session.subscription as string) || null,
              data_fim: dataFim,
              valor_pago: (session.amount_total || 0) / 100,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'stripe_subscription_id' });
          }
          break;
        }

        case 'customer.subscription.updated': {
          const sub = event.data.object as any;
          let mappedStatus = 'ativo';
          if (sub.status === 'past_due') mappedStatus = 'inadimplente';
          else if (sub.status === 'canceled' || sub.status === 'unpaid') mappedStatus = 'cancelado';

          await supabaseAdmin.from('assinaturas_usuarios').update({
            status: mappedStatus,
            data_fim: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', sub.id);
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as any;
          await supabaseAdmin.from('assinaturas_usuarios').update({
            status: 'cancelado',
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', sub.id);
          break;
        }

        case 'invoice.paid': {
          const invoice = event.data.object as any;
          if (invoice.subscription) {
            const periodEnd = invoice.lines?.data?.[0]?.period?.end;
            await supabaseAdmin.from('assinaturas_usuarios').update({
              status: 'ativo',
              ...(periodEnd ? { data_fim: new Date(periodEnd * 1000).toISOString() } : {}),
              updated_at: new Date().toISOString(),
            }).eq('stripe_subscription_id', invoice.subscription as string);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as any;
          if (invoice.subscription) {
            await supabaseAdmin.from('assinaturas_usuarios').update({
              status: 'inadimplente',
              updated_at: new Date().toISOString(),
            }).eq('stripe_subscription_id', invoice.subscription as string);
          }
          break;
        }
      }

      await supabaseAdmin.from('stripe_eventos').update({
        processado: true,
        processado_em: new Date().toISOString(),
      }).eq('id', event.id);

      return res.json({ received: true });
    } catch (e: any) {
      console.error('Erro no processamento do evento:', e);
      return res.status(500).json({ error: e.message });
    }
  });

  // 3. ENDPOINT: Criar Sessão do Stripe Customer Portal
  app.post('/api/stripe/create-portal-session', async (req, res) => {
    try {
      const user = await getAuthUser(req);
      if (!stripe) {
        return res.status(400).json({ error: 'STRIPE_SECRET_KEY não configurada no servidor.' });
      }

      const { data: sub } = await supabaseAdmin
        .from('assinaturas_usuarios')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .not('stripe_customer_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub?.stripe_customer_id) {
        return res.status(404).json({ error: 'Nenhum cadastro Stripe encontrado para sua conta.' });
      }

      const origin = req.headers.origin || 'https://tutti-musica-2sbahjsww-tutti8.vercel.app';
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: `${origin}/?tab=assinatura`,
      });

      return res.json({ url: portal.url });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Erro ao gerar portal do cliente.' });
    }
  });

  // 4. ENDPOINT: Consultar Assinatura do Aluno Autenticado
  app.get('/api/stripe/my-subscription', async (req, res) => {
    try {
      const user = await getAuthUser(req);
      const { data: sub } = await supabaseAdmin
        .from('assinaturas_usuarios')
        .select('*, planos(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: pagamentos } = await supabaseAdmin
        .from('pagamentos')
        .select('*')
        .eq('user_id', user.id)
        .order('data_pagamento', { ascending: false });

      return res.json({
        subscription: sub || null,
        payments: pagamentos || [],
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Erro ao buscar assinatura.' });
    }
  });

  // Maestro IA API endpoint using @google/genai
  app.post('/api/maestro', async (req, res) => {
    try {
      const { prompt, instrument, level, context } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      const systemInstruction = `Você é o "Maestro Lucas", o maestro e mentor de IA da plataforma Tutti ♪ - a principal escola de música digital do Brasil.
Seu nome é Maestro Lucas. Seu tom é caloroso, pedagógico, inspirador, técnico quando necessário e extremamente refinado e acessível.
Você guia estudantes de todos os níveis em instrumentos como Saxofone, Teclado/Piano, Canto, Violão/Guitarra, Bateria, Violino e Teoria Musical.
Dê respostas práticas com explicações claras, cifras quando apropriado, dicas de digitação, respiração diafragmática, afinação, ritmo, harmonia funcional e exercícios diários de prática.
Assine carinhosamente suas orientações como "Maestro Lucas 🎼". Mantenha as respostas concisas e práticas (2 a 4 parágrafos ou passos pontuais).
Instrumento atual do aluno: ${instrument || 'Geral'}
Nível atual: ${level || 'Iniciante/Intermediário'}
${context ? `Contexto da aula/partitura: ${context}` : ''}`;

      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nPergunta do aluno: ${prompt}` }]
            }
          ]
        });

        const reply = response.text || 'Continue praticando com foco no ritmo e na postura!';
        return res.json({ reply });
      } else {
        // Fallback intelligent music educator responses when key is not configured
        const smartReplies: Record<string, string> = {
          default: `Olá! Sou o **Maestro Lucas**, seu mentor de IA no Tutti ♪, pronto para afinar cada detalhe do seu aprendizado. 
Para dominar o ${instrument || 'seu instrumento'}, divida sua rotina diária em 3 blocos de 10 minutos:
1. **Aquecimento & Respiração**: notas longas e consciência corporal.
2. **Técnica & Escalas**: foco na precisão rítmica com o metrônomo (comece a 60 BPM).
3. **Repertório**: toque trechos difíceis bem devagar antes de acelerar!

Abraço musical,
*Maestro Lucas 🎼*`,
          campo: `🎼 **Campo Harmônico de Sol Maior (G):**
- I: G (Tônica)
- ii: Am (Super dominante / menor)
- iii: Bm (Mediante)
- IV: C (Subdominante)
- V: D ou D7 (Dominante com tensão)
- vi: Em (Relativa menor)
- vii°: F#m7(b5) (Sensível diminuta)
💡 *Dica do Maestro Lucas:* A progressão mais famosa da música brasileira e do jazz é ii - V - I (Am7 - D7 - Gmaj7). Pratique tocando e cantando as terças e sétimas!`,
          respiracao: `🌬️ **Respiração Diafragmática (Sopro & Canto):**
1. **Postura:** Coluna ereta, ombros relaxados e peito aberto sem tensão.
2. **Inspiração Baixa:** Ao puxar o ar pelo nariz ou boca aberta, sinta o abdômen e as costelas expandirem 360°, sem levantar os ombros.
3. **Apoio (Suporte):** Mantenha uma leve sustentação na musculatura abdominal enquanto expira em "Tssss" contínuo por 16 tempos a 60 BPM.
4. **Aplicação:** No ${instrument || 'instrumento'}, nunca empurre o som com a garganta; o motor é a coluna de ar!`,
          improvisacao: `🎷 **Improvisação sobre Autumn Leaves (G Menor / Bb Maior):**
1. Comece pelas **notas do acorde** (arpejos 1, 3, 5, 7) nos tempos fortes (1 e 3).
2. A progressão clássica é Cm7 - F7 - Bbmaj7 - Ebmaj7 - Am7(b5) - D7 - Gm.
3. Use a escala de **Sol Menor Natural** e adicione a sensível (F#) sobre o acorde D7 para criar a escala Menor Harmônica.
4. Menos é mais: toque uma frase rítmica curta de 3 notas e responda a ela!`,
        };

        const lower = (prompt || '').toLowerCase();
        let selectedReply = smartReplies.default;
        if (lower.includes('campo') || lower.includes('harmon') || lower.includes('acorde')) {
          selectedReply = smartReplies.campo;
        } else if (lower.includes('respir') || lower.includes('ar') || lower.includes('sopr') || lower.includes('voz')) {
          selectedReply = smartReplies.respiracao;
        } else if (lower.includes('improv') || lower.includes('leaves') || lower.includes('solo') || lower.includes('escala')) {
          selectedReply = smartReplies.improvisacao;
        }

        return res.json({ reply: selectedReply });
      }
    } catch (error: any) {
      console.error('Error in /api/maestro:', error);
      res.status(500).json({ 
        error: 'Não foi possível consultar o Maestro IA no momento.',
        details: error?.message || 'Erro desconhecido'
      });
    }
  });

  // Vite integration
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎵 Tutti ♪ server rodando na porta ${PORT}`);
  });
}

startServer();
