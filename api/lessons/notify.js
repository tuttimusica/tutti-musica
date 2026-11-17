import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

const send = (res, code, body) => { res.status(code).json(body); };
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[char]));

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'POST') { res.setHeader('Allow','POST');return send(res,405,{error:'method_not_allowed'}); }
  const token=/^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1];
  if(!token) return send(res,401,{error:'unauthorized'});
  const {bookingId,event} = req.body || {};
  if(typeof bookingId !== 'string' || !/^[0-9a-f-]{36}$/i.test(bookingId) ||
    !['scheduled','canceled','meet_ready'].includes(event))
    return send(res,400,{error:'invalid_request'});
  const url = process.env.VITE_SUPABASE_URL;
  const publicKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const apiKey=process.env.TUTTI_LESSON_RESEND_API_KEY;
  if(!url || !publicKey || !apiKey) return send(res,503,{error:'email_unconfigured'});
  const client=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{Authorization:'Bearer '+token}}});
  const {data:{user},error:authError}=await client.auth.getUser(token);
  if(authError || !user?.id || !user.email_confirmed_at) return send(res,401,{error:'unauthorized'});
  const {data:booking,error:bookingError}=await client.from('marcacoes_aulas')
    .select('id,aluno_id,professor_id,aluno_email,professor_nome,data_aula,hora_inicio,status,link_meet')
    .eq('id',bookingId).maybeSingle();
  if(bookingError || !booking || booking.professor_id !== user.id)
    return send(res,403,{error:'not_authorized'});
  if(event==='canceled' ? booking.status!=='cancelada' : booking.status!=='agendada')
    return send(res,409,{error:'invalid_booking_status'});
  if(event==='meet_ready' && !/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/.test(booking.link_meet || ''))
    return send(res,409,{error:'meeting_not_configured'});
  // The recipient, time and meeting are sourced from a row protected by Supabase RLS.
  const date = booking.data_aula.split('-').reverse().join('/');
  const time=booking.hora_inicio.slice(0,5);
  const subject = event==='scheduled' ? 'Tutti — sua aula foi agendada'
    : event==='canceled' ? 'Tutti — sua aula foi cancelada'
    : 'Tutti — seu link do Google Meet está disponível';
  const details = event==='scheduled'
    ? 'Uma aula foi agendada para você.'
    : event==='canceled'
    ? 'A aula abaixo foi cancelada.'
    : 'O professor disponibilizou o link da sua aula.';
  const meet = event==='meet_ready' ? `<p><a href="${escapeHtml(booking.link_meet)}">Entrar na aula pelo Google Meet</a></p>` : '';
  const html=`<div style="font-family:Arial,sans-serif;max-width:600px">
    <h2>Tutti Escola de Música</h2><p>${escapeHtml(details)}</p>
    <p>Professor: ${escapeHtml(booking.professor_nome)}</p>
    <p>Data: ${escapeHtml(date)} às ${escapeHtml(time)} (Brasília)</p>
    ${meet}<p>Acesse sua Agenda de Aula na Tutti para acompanhar atualizações.</p>
    </div>`;
  // Prevent accidental double delivery on client retries within the provider's
  // idempotency window. No transactional email secret is ever exposed to browser.
  const eventHash=createHash('sha256').update(booking.id+'|'+event+'|'+(event==='meet_ready'?booking.link_meet:'')).digest('hex');
  try {
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json',
        'Idempotency-Key':'lesson-'+eventHash.slice(0,55)},
      body:JSON.stringify({
        from:'Tutti Escola de Música <naoresponda@tuttimusica.is-a.si>',
        to:[booking.aluno_email],subject,html
      })
    });
    if(!response.ok) return send(res,502,{error:'delivery_provider_error'});
    return send(res,200,{status:'sent'});
  } catch {
    return send(res,503,{error:'email_temporarily_unavailable'});
  }
}
