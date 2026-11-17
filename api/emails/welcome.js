import { createClient } from '@supabase/supabase-js';
const json=(res,status,data)=>res.status(status).json(data);
const escape=(x)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'method_not_allowed'});}
  const token=/^Bearer\s+(.+)$/i.exec(req.headers.authorization||'')?.[1];
  if(!token) return json(res,401,{error:'unauthorized'});
  // Production only. Staging remains disabled until separately configured.
  if(process.env.VERCEL_ENV!=='production') return json(res,503,{error:'welcome_not_enabled_here'});
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const resendKey=process.env.TUTTI_LESSON_RESEND_API_KEY;
  if(!url||!key||!resendKey) return json(res,503,{error:'welcome_not_configured'});
  try {
    if(new URL(url).hostname!=='viwxalwpvuvgcyxsdjbi.supabase.co')
      return json(res,503,{error:'wrong_auth_project'});
  } catch { return json(res,503,{error:'wrong_auth_project'}); }
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError||!user?.id||!user.email||!user.email_confirmed_at)
    return json(res,401,{error:'email_not_verified'});
  // Atomic, server-only claim. Previously registered users are excluded by
  // the activation date in Supabase; competing browser calls cannot double-send.
  const claim=await admin.rpc('tutti_claim_welcome_email',{p_user_id:user.id});
  if(claim.error) return json(res,503,{error:'welcome_tracking_unavailable'});
  if(claim.data!==true) return json(res,200,{status:'already_queued_or_not_eligible',alreadySent:true});

  const name=escape(String(user.user_metadata?.full_name ||
    user.user_metadata?.name || user.email.split('@')[0]).slice(0,100));
  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
  <body style="background:#0e0d18;color:#f8fafc;font-family:Arial,sans-serif;margin:0;padding:32px 12px">
    <main style="max-width:560px;margin:auto;background:#1c1529;border:1px solid #51386e;border-radius:18px;padding:32px">
      <h1 style="color:#fbbf24">Tutti Escola de Música 🎵</h1>
      <p style="color:#d8b4fe;font-weight:bold">Cada som faz parte.</p>
      <h2>Olá, ${name}!</h2>
      <p>Seu cadastro foi confirmado. Bem-vindo(a) à comunidade musical da Tutti!</p>
      <p>Explore aulas, partituras e recursos para aprender e praticar música.</p>
      <p>Se você se cadastrou como professor, seu acesso docente será liberado apenas após aprovação da equipe.</p>
      <a style="display:inline-block;padding:13px 20px;background:#fbbf24;color:#181322;font-weight:bold;text-decoration:none;border-radius:12px"
      href="https://tutti-musica.vercel.app">Acessar a Tutti</a>
      <p style="color:#cbd5e1;font-size:12px;margin-top:30px">Você recebeu este e-mail porque se cadastrou na Tutti Escola de Música.</p>
    </main></body></html>`;
  try {
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:'Bearer '+resendKey,'Content-Type':'application/json',
        'Idempotency-Key':'tutti-welcome-'+user.id},
      body:JSON.stringify({
        from:'Tutti Escola de Música <naoresponda@tuttimusica.is-a.si>',
        to:[user.email],subject:'Bem-vindo(a) à Tutti Escola de Música!',html
      })
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok||typeof body.id!=='string') throw Error('resend_delivery_failed');
    const saved=await admin.rpc('tutti_mark_welcome_email',{p_user_id:user.id,p_resend_id:body.id});
    if(saved.error||saved.data!==true) return json(res,503,{error:'welcome_tracking_unavailable'});
    return json(res,200,{status:'sent',sent:true});
  } catch {
    await admin.rpc('tutti_release_welcome_email',{p_user_id:user.id,p_error:'send_failed'}).catch(()=>{});
    return json(res,503,{error:'welcome_send_unavailable'});
  }
}