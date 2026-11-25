
/** Temporary read-only branch Preview connectivity probe; revert after testing. */
export default async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='GET'){res.statusCode=405;res.end(JSON.stringify({error:'method_not_allowed'}));return;}
 const base={service:'tutti-api',status:'ok'};
 if(process.env.VERCEL_ENV!=='preview'||req.query?.preview_db!=='1'){
   res.statusCode=200;res.end(JSON.stringify(base));return;
 }
 const url=process.env.VITE_SUPABASE_URL;
 const key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
 const correctProject=typeof url==='string'&&url==='https://vscuqfoyrycfzthexvjy.supabase.co';
 const hasPublicKey=typeof key==='string'&&key.startsWith('sb_publishable_');
 if(!correctProject||!hasPublicKey){
   res.statusCode=200;res.end(JSON.stringify({...base,preview:{correctProject,hasPublicKey,connected:false}}));return;
 }
 try {
   const response=await fetch(url+'/rest/v1/planos?select=id,preco_centavos&ativo=eq.true&order=id',{
     method:'GET',
     headers:{apikey:key,Accept:'application/json'},
     signal:AbortSignal.timeout(7000)
   });
   const data=response.ok?await response.json():[];
   const names=Array.isArray(data)?data.map(p=>p.id).filter(p=>['pro','mensal','trimestral','semestral'].includes(p)):[];
   res.statusCode=200;res.end(JSON.stringify({...base,preview:{
     correctProject:true,hasPublicKey:true,connected:response.ok,
     planCount:response.ok?names.length:0,remoteStatus:response.status
   }}));
 }catch{res.statusCode=200;res.end(JSON.stringify({...base,preview:{correctProject:true,hasPublicKey:true,connected:false,networkError:true}}));}
}
