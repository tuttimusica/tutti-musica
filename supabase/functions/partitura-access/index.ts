// Supabase Edge Function: partitura-access
// Emite URL assinada temporária para partituras pagas somente após validação de permissão no backend.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEVELOPER_EMAILS = ['eliandrolucas.el@gmail.com', 'desenvolvedor@tutti.mus.br'];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://viwxalwpvuvgcyxsdjbi.supabase.co';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
      return new Response(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { partitura_id } = await req.json();

    if (!partitura_id) {
      return new Response(JSON.stringify({ error: 'partitura_id é obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: partitura, error: pErr } = await supabaseAdmin
      .from('partituras')
      .select('id, titulo, categoria, preco, publicado, arquivo_pdf_url, storage_path')
      .eq('id', partitura_id)
      .single();

    if (pErr || !partitura) {
      return new Response(JSON.stringify({ error: 'Partitura não encontrada.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Identificar usuário se houver token
    let user: any = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data } = await supabaseAdmin.auth.getUser(token);
      user = data?.user || null;
    }

    const isAdmin = Boolean(
      user?.email && DEVELOPER_EMAILS.includes(String(user.email).toLowerCase())
    );

    if (!partitura.publicado && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Partitura não publicada.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Partitura gratuita: pode retornar URL pública ou signed URL
    if (partitura.categoria !== 'paga') {
      if (partitura.storage_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from('partituras')
          .createSignedUrl(partitura.storage_path, 300);
        return new Response(
          JSON.stringify({ url: signed?.signedUrl || partitura.arquivo_pdf_url, protected: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ url: partitura.arquivo_pdf_url, protected: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Partitura PAGA: exige usuário autenticado e autorização
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Faça login e adquira esta partitura para visualizar o PDF.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      try {
        const { data: bundleItens } = await supabaseAdmin
          .from('conjuntos_partituras_itens')
          .select('conjunto_id')
          .eq('partitura_id', partitura.id);
        const conjuntoIds = (bundleItens || []).map((i: any) => i.conjunto_id).filter(Boolean);
        if (conjuntoIds.length > 0) {
          const { data: bundleAccess } = await supabaseAdmin
            .from('conjuntos_acessos')
            .select('id')
            .eq('user_id', user.id)
            .in('conjunto_id', conjuntoIds)
            .limit(1);
          hasAccess = Boolean(bundleAccess && bundleAccess.length > 0);
        }
      } catch {
        // tabela de conjuntos opcional
      }
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Acesso bloqueado: partitura paga não adquirida por esta conta.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!partitura.storage_path) {
      return new Response(
        JSON.stringify({ url: partitura.arquivo_pdf_url || null, protected: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Tenta bucket privado 'partituras-pagas' primeiro e faz fallback apenas para bucket 'partituras'
    const { data: signedPaid, error: signErr } = await supabaseAdmin.storage
      .from('partituras-pagas')
      .createSignedUrl(partitura.storage_path, 120);

    if (!signErr && signedPaid?.signedUrl) {
      return new Response(JSON.stringify({ url: signedPaid.signedUrl, protected: true, expiresIn: 120 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: signedFree } = await supabaseAdmin.storage
      .from('partituras')
      .createSignedUrl(partitura.storage_path, 120);

    return new Response(
      JSON.stringify({ url: signedFree?.signedUrl || null, protected: true, expiresIn: 120 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Erro interno.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
