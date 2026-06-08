import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verifica quem está chamando
    const { data: { user: caller }, error: callerError } = await adminClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Permissão insuficiente" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { nome, email, cpf, cargo, instituicao, role, senha, titulo, area, mini_bio, destaque, is_palestrante, is_credenciador } = await req.json();

    if (!nome || !email) {
      return new Response(JSON.stringify({ error: "nome e email são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailNorm = email.toLowerCase().trim();
    const password = senha || (Math.random().toString(36).slice(2, 10) + "A1!");

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: emailNorm,
      password,
      email_confirm: true,
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const iniciais = nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: created.user.id,
      nome,
      email: emailNorm,
      cpf: cpf || "",
      cargo: cargo || "",
      instituicao: instituicao || "",
      role: role || "participante",
      credenciado: false,
      ativo: true,
      foto_iniciais: iniciais,
      ...(titulo !== undefined && { titulo }),
      ...(area !== undefined && { area }),
      ...(mini_bio !== undefined && { mini_bio }),
      ...(destaque !== undefined && { destaque }),
      is_palestrante: !!is_palestrante,
      is_credenciador: !!is_credenciador,
    });

    if (profileError) {
      // Reverte o usuário criado se o profile falhar
      await adminClient.auth.admin.deleteUser(created.user.id);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      user: {
        id: created.user.id,
        nome,
        email: emailNorm,
        cpf: cpf || "",
        cargo: cargo || "",
        instituicao: instituicao || "",
        role: role || "participante",
        credenciado: false,
        ativo: true,
        foto_iniciais: iniciais,
        titulo: titulo || "",
        area: area || "",
        mini_bio: mini_bio || "",
        destaque: destaque ?? false,
        is_palestrante: !!is_palestrante,
        is_credenciador: !!is_credenciador,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
