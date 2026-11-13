export interface WelcomeEmailContent {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildWelcomeEmailContent(params: {
  nome: string;
  platformUrl?: string;
}): WelcomeEmailContent {
  const safeName = escapeHtml((params.nome || 'Aluno(a)').trim() || 'Aluno(a)');
  const rawBaseUrl = (
    params.platformUrl ||
    'https://tutti-musica-2sbahjsww-tutti8.vercel.app'
  ).replace(/\/+$/, '');
  const ctaUrl = `${rawBaseUrl}/aluno`;

  const subject = 'Seja bem-vindo(a) à Tutti Escola de Música!';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#07090e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#07090e;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#11141d;border:1px solid rgba(245,158,11,0.28);border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,#0f172a 0%,#131722 100%);border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;">
              <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#f59e0b;font-weight:700;margin-bottom:6px;">
                Tutti Escola de Música
              </div>
              <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;font-weight:800;">
                Seja bem-vindo(a) à Tutti Escola de Música!
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#ffffff;">
                Olá, ${safeName}!
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#cbd5e1;">
                É uma grande alegria receber você em nossa escola. Seu cadastro foi confirmado com sucesso e sua conta já está ativa na plataforma <strong style="color:#ffffff;">Tutti Escola de Música</strong>.
              </p>
              <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#94a3b8;">
                A partir de agora, você já pode explorar o ecossistema pedagógico da Tutti com:
              </p>
              <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.8;color:#e2e8f0;">
                <li>Acesso a partituras e materiais de estudo</li>
                <li>Estúdio e ferramentas musicais</li>
                <li>Acompanhamento com professores e conteúdos da escola</li>
                <li>Recursos exclusivos para alunos cadastrados</li>
              </ul>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
                <tr>
                  <td align="center" style="border-radius:12px;background:linear-gradient(90deg,#f59e0b,#d97706);">
                    <a href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:800;color:#0b0d14;text-decoration:none;border-radius:12px;">
                      Acessar Plataforma Tutti
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);font-size:14px;font-weight:700;color:#fbbf24;">
                Tutti — Onde a música encontra a inovação.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background-color:#0b0d14;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#64748b;text-align:center;">
              Secretaria e Atendimento Tutti: (21) 92037-5422
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Olá, ${params.nome || 'Aluno(a)'}!

Seu cadastro foi confirmado com sucesso na Tutti Escola de Música.

O que você encontra na plataforma:
- Acesso a partituras e materiais de estudo
- Estúdio e ferramentas musicais
- Acompanhamento com professores e conteúdos da escola
- Recursos exclusivos para alunos cadastrados

Acesse agora: ${ctaUrl}

Tutti — Onde a música encontra a inovação.`;

  return { subject, html, text };
}
