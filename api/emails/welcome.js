import { createClient } from '@supabase/supabase-js';

const reply=(res,status,data)=>{res.setHeader('Cache-Control','no-store');return res.status(status).json(data);};
const safe=(x)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export default async function handler(req,res) {
 if(req.method!=='POST'){res.setHeader('Allow','POST');return reply(res,405,{error:'method_not_allowed'});}
 const bearer=/^Bearer\s+(.+)$/i.exec(req.headers.authorization||'');
 if(!bearer)return reply(res,401,{error:'unauthorized'});
 if(process.env.VERCEL_ENV!=='production')return reply(res,503,{error:'welcome_not_enabled_here'});
 const url=process.env.VITE_SUPABASE_URL;
 const key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 const resendKey=process.env.TUTTI_LESSON_RESEND_API_KEY;
 if(!url||!key||!resendKey)return reply(res,503,{error:'welcome_not_configured'});
 try{if(new URL(url).hostname!=='viwxalwpvuvgcyxsdjbi.supabase.co')
   return reply(res,503,{error:'wrong_auth_project'});}
 catch{return reply(res,503,{error:'wrong_auth_project'});}
 const token=bearer[1];
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await client.auth.getUser(token);
 if(authError||!user?.id||!user.email||!user.email_confirmed_at)
   return reply(res,401,{error:'email_not_verified'});

 // Edge Function runs on the same production Supabase project as the users.
 // Server-only admin privileges remain inside Supabase; Vercel holds only
 // the public project key, the user's JWT, and a domain-restricted Resend key.
 async function state(action,resendId){
   const response=await fetch(url+'/functions/v1/tutti-welcome-state',{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,apikey:key},
      body:JSON.stringify(action==='mark'?{action,resendId}:{action})
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error('welcome_state_error');
   return data.ok===true;
 }
 let claimed;
 try{claimed=await state('claim');}
 catch{return reply(res,503,{error:'welcome_tracking_unavailable'});}
 if(!claimed)return reply(res,200,{status:'already_queued_or_not_eligible',alreadySent:true});
 const name=safe(String(user.user_metadata?.full_name||user.user_metadata?.name||user.email.split('@')[0]).slice(0,100));
 const html='<!doctype html><html lang="pt-BR"><meta charset="UTF-8"><body style="background:#0e0d18;color:#f8fafc;font-family:Arial,sans-serif;margin:0;padding:32px 12px">'
   +'<main style="max-width:560px;margin:auto;background:#1c1529;border:1px solid #51386e;border-radius:18px;padding:32px">'
   +'<h1 style="color:#fbbf24">Tutti Escola de Música 🎵</h1><p style="color:#d8b4fe;font-weight:bold">Cada som faz parte.</p>'
   +'<h2>Olá, '+name+'!</h2><p>Seu cadastro foi confirmado. Bem-vindo(a) à comunidade musical da Tutti!</p>'
   +'<p>Explore aulas, partituras e recursos para aprender e praticar música.</p>'
   +'<p>Se você se cadastrou como professor, seu acesso docente será liberado apenas após aprovação da equipe.</p>'
   +'<a style="display:inline-block;padding:13px 20px;background:#fbbf24;color:#181322;font-weight:bold;text-decoration:none;border-radius:12px" href="https://tutti-musica.vercel.app">Acessar a Tutti</a>'
   +'<p style="color:#cbd5e1;font-size:12px;margin-top:30px">Você recebeu este e-mail porque se cadastrou na Tutti Escola de Música.</p>'
   +'</main></body></html>';
 try{
   const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:'Bearer '+resendKey,'Content-Type':'application/json',
         'Idempotency-Key':'tutti-welcome-'+user.id},
      body:JSON.stringify({
        from:'Tutti Escola de Música <naoresponda@tuttimusica.is-a.si>',
        to:[user.email],
        subject:'Bem-vindo(a) à Tutti Escola de Música!',html
      })
   });
   const payload=await response.json().catch(()=>({}));
   if(!response.ok||typeof payload.id!=='string')throw Error('resend_send_failed');
   try{if(!await state('mark',payload.id))return reply(res,503,{error:'welcome_tracking_unavailable'});}
   catch{return reply(res,503,{error:'welcome_tracking_unavailable'});}
   return reply(res,200,{status:'sent',sent:true});
 }catch{
   try{await state('release');}catch{}
   return reply(res,503,{error:'welcome_send_unavailable'});
 }
}
