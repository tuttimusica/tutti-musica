// Supabase Edge Function: send-welcome-email
// Envia e-mail de boas-vindas de forma idempotente SOMENTE após e-mail confirmado.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildWelcomeHtml(nome: string, baseUrl: string): { subject: string; html: string; text: string } {
  const safeName = escapeHtml((nome || 'Aluno(a)').trim() || 'Aluno(a)');
  const ctaUrl = `${baseUrl.replace(/\/+$/, '')}/aluno`;
  const subject = 'Seja bem-vindo(a) à Tutti Escola de Música!';
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#07090e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#07090e;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#11141d;border:1px solid rgba(245,158,11,0.28);border-radius:20px;overflow:hidden;">
        <tr><td style="padding:28px 32px;background:#0f172a;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#f59e0b;font-weight:700;margin-bottom:6px;">Tutti Escola de Música</div>
          <h1 style="margin:0;font-size:24px;color:#ffffff;font-weight:800;">${subject}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#ffffff;">Olá, ${safeName}!</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#cbd5e1;">
            Seu cadastro foi confirmado com sucesso e sua conta já está ativa na plataforma <strong style="color:#ffffff;">Tutti Escola de Música</strong>.
          </p>
          <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.8;color:#e2e8f0;">
            <li>Acesso a partituras e materiais de estudo</li>
            <li>Estúdio e ferramentas musicais</li>
            <li>Acompanhamento com professores e conteúdos da escola</li>
            <li>Recursos exclusivos para alunos cadastrados</li>
          </ul>
          <a href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:800;color:#0b0d14;background:#f59e0b;text-decoration:none;border-radius:12px;">
            Acessar Plataforma Tutti
          </a>
          <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);font-size:14px;font-weight:700;color:#fbbf24;">
            Tutti — Onde a música encontra a inovação.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Olá, ${nome || 'Aluno(a)'}!\n\nSeu cadastro foi confirmado com sucesso na Tutti Escola de Música.\n- Acesso a partituras e materiais de estudo\n- Estúdio e ferramentas musicais\n- Acompanhamento com professores e conteúdos da escola\n- Recursos exclusivos para alunos cadastrados\n\nAcesse: ${ctaUrl}\n\nTutti — Onde a música encontra a inovação.`;
  return { subject, html, text };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://viwxalwpvuvgcyxsdjbi.supabase.co';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      return new Response(JSON.stringify({ sent: false, error: 'SUPABASE_SERVICE_ROLE_KEY ausente.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));

    let user: any = null;
    const authHeader = req.headers.get('Authorization');
    const webhookSecret = Deno.env.get('WELCOME_WEBHOOK_SECRET');
    const providedSecret = req.headers.get('x-webhook-secret');

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data?.user) {
        return new Response(JSON.stringify({ error: 'Sessão inválida.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      user = data.user;
    } else if (webhookSecret && providedSecret === webhookSecret && body?.record?.id) {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(body.record.id);
      if (error || !data?.user) {
        return new Response(JSON.stringify({ error: 'Usuário do webhook não encontrado.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      user = data.user;
    } else {
      return new Response(JSON.stringify({ error: 'Autorização obrigatória.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Regra obrigatória: somente após confirmação de e-mail
    if (!user.email_confirmed_at) {
      return new Response(JSON.stringify({ sent: false, skipped: true, reason: 'email_not_confirmed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotência: verificar se já foi enviado com sucesso
    const { data: existingLog } = await supabaseAdmin
      .from('welcome_email_logs')
      .select('id, status, sent_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingLog?.status === 'sent') {
      return new Response(JSON.stringify({ sent: false, alreadySent: true, sentAt: existingLog.sent_at }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nome =
      body?.nome ||
      user.user_metadata?.full_name ||
      user.user_metadata?.display_name ||
      user.email?.split('@')[0] ||
      'Aluno(a)';

    const baseUrl =
      body?.platformUrl ||
      Deno.env.get('APP_URL') ||
      'https://tutti-musica-2sbahjsww-tutti8.vercel.app';

    const { subject, html, text } = buildWelcomeHtml(nome, baseUrl);
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'Tutti Escola de Música <onboarding@resend.dev>';

    if (!resendApiKey) {
      await supabaseAdmin.from('welcome_email_logs').upsert(
        {
          user_id: user.id,
          email: user.email,
          nome,
          status: 'unconfigured',
          provider: 'none',
          error_message: 'RESEND_API_KEY não configurada nas secrets da Edge Function.',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      return new Response(
        JSON.stringify({
          sent: false,
          configured: false,
          reason: 'Provedor de e-mail transacional não configurado.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const resendJson = await resendRes.json().catch(() => ({}));
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
      return new Response(
        JSON.stringify({ sent: false, error: resendJson?.message || 'Falha no envio via Resend.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    return new Response(JSON.stringify({ sent: true, id: resendJson?.id || null, sentAt }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ sent: false, error: err?.message || 'Erro interno.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
