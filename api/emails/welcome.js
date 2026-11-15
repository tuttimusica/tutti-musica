import { createClient } from '@supabase/supabase-js';

const send=(res,status,body)=>{res.statusCode=status;res.end(JSON.stringify(body));};
const htmlEscape=(s)=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const testProjectId='vscuqfoyrycfzthexvjy';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return send(res,405,{error:'method_not_allowed'});}
  // Never send from production before staging delivery and consent are verified.
  if(process.env.VERCEL_ENV==='production'||process.env.TUTTI_WELCOME_EMAIL_ENABLED!=='true')
    return send(res,503,{error:'welcome_email_disabled'});
  const token=/^Bearer\s+(.+)$/i.exec(req.headers.authorization||'')?.[1];
  if(!token) return send(res,401,{error:'unauthorized'});
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const resendKey=process.env.RESEND_API_KEY;
  const sender=process.env.TUTTI_EMAIL_FROM;
  if(!url||new URL(url).hostname!==testProjectId+'.supabase.co'||!key||!resendKey||!sender||
     !/^[^<>\r\n]+<[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+>$/.test(sender))
     return send(res,503,{error:'welcome_email_unconfigured'});
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await admin.auth.getUser(token);
  if(error||!user?.id||!user.email||!user.email_confirmed_at) return send(res,401,{error:'email_not_verified'});
  const claim=await admin.rpc('tutti_claim_welcome_email',{p_user_id:user.id});
  if(claim.error) return send(res,503,{error:'welcome_tracking_unavailable'});
  if(!claim.data) return send(res,200,{status:'already_queued_or_sent'});
  const name=htmlEscape(String(user.user_metadata?.full_name||user.email.split('@')[0]).slice(0,100));
  try{
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{
        Authorization:'Bearer '+resendKey,
        'Content-Type':'application/json',
        'Idempotency-Key':'tutti-welcome-'+user.id
      },
      body:JSON.stringify({
        from:sender,
        to:[user.email],
        subject:'Bem-vindo(a) à Tutti Escola de Música!',
        html:`<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;background:#101927;color:#f8fafc;padding:28px">
        <main style="max-width:580px;margin:auto"><h1 style="color:#fbbf24">Bem-vindo(a) à Tutti! 🎵</h1>
        <p>Olá, ${name}!</p><p>Seu e-mail foi confirmado. Você já pode explorar nossas partituras, conteúdos musicais e recursos de aprendizagem.</p>
        <p>Se você se cadastrou como professor, seu acesso de professor será liberado somente após a aprovação da equipe.</p>
        <p>Até breve, <strong>Equipe Tutti Escola de Música</strong></p>
        </main></body></html>`
      })
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok||typeof body.id!=='string') throw Error('resend_send_failed');
    const saved=await admin.rpc('tutti_mark_welcome_email',{p_user_id:user.id,p_resend_id:body.id});
    if(saved.error||saved.data!==true) return send(res,503,{error:'welcome_tracking_unavailable'});
    return send(res,200,{status:'sent'});
  }catch{
    await admin.rpc('tutti_release_welcome_email',{p_user_id:user.id,p_error:'resend_error'}).catch(()=>{});
    return send(res,503,{error:'welcome_send_unavailable'});
  }
}
