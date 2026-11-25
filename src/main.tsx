import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const root=createRoot(document.getElementById('root')!);
const env=import.meta.env;
const url=env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key=env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fail closed before importing App/AuthContext, whose Supabase module throws
// if Preview is missing credentials. Never inherit production values implicitly.
if (typeof url !== 'string' || !/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url) ||
    typeof key !== 'string' || key.length < 20) {
  root.render(
    <main style={{minHeight:'100vh',background:'#0d1019',color:'#f4f5fa',
      display:'grid',placeItems:'center',fontFamily:'system-ui, sans-serif',padding:24}}>
      <section role="alert" style={{maxWidth:580,border:'1px solid #6e5c30',
        background:'#191b25',padding:32,borderRadius:20}}>
        <h1 style={{fontSize:25,marginBottom:12}}>Tutti Música — Pré-visualização não configurada</h1>
        <p style={{lineHeight:1.6}}>Esta versão de teste ainda não possui as variáveis públicas
          de conexão com o Supabase. Para preservar os dados dos alunos e os pagamentos,
          ela não será conectada automaticamente ao banco de produção.</p>
        <p style={{lineHeight:1.6}}>Configure <code>VITE_SUPABASE_URL</code> e
          <code> VITE_SUPABASE_PUBLISHABLE_KEY</code> no ambiente Preview da Vercel,
          preferencialmente usando o projeto Supabase de testes, e faça um novo deploy.</p>
        <p style={{color:'#c4b17e',fontSize:13}}>Nenhuma cobrança foi realizada. O site oficial
          continua separado desta prévia.</p>
      </section>
    </main>
  );
} else {
  import('./App').then(({default:App})=>{
    root.render(<App/>);
  }).catch(err=>{
    console.error('Falha ao iniciar a pré-visualização Tutti:',err?.message||'erro inesperado');
    root.render(
      <main role="alert" style={{minHeight:'100vh',display:'grid',placeItems:'center',
        background:'#0d1019',color:'#f4f5fa',fontFamily:'system-ui,sans-serif',padding:24}}>
        <section style={{maxWidth:520}}>
          <h1>Não foi possível iniciar esta versão da Tutti.</h1>
          <p>Ocorreu uma falha de configuração ou inicialização. Nenhuma cobrança foi realizada.</p>
          <p>Verifique os logs de inicialização e as configurações do ambiente Preview.</p>
        </section>
      </main>
    );
  });
}
