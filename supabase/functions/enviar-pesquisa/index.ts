import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Envia o convite da pesquisa de satisfação por e-mail via SMTP.
// Mesmo mecanismo/secrets de supabase/functions/enviar-convite.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const DEFAULT_MENSAGEM = "Sua opinião é muito importante para nós! Reserve alguns minutos para responder à pesquisa de satisfação do evento.";

function gerarTemplateHTML({ event, bannerUrl, pesquisaUrl, assunto, mensagem, corCabecalho, corRodape, corBotao }: any) {
  const corTopo = corCabecalho || "#0a1f40";
  const corBase = corRodape || "#0a1f40";
  const corCta = corBotao || "#0a1f40";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${assunto || `Pesquisa de Satisfação — ${event.nome}`}</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      ${bannerUrl ? `
      <tr><td>
        <img src="${bannerUrl}" alt="Banner do evento" width="600" style="display:block;width:100%;max-height:240px;object-fit:cover;" />
      </td></tr>` : `
      <tr><td style="background:${corTopo};padding:40px 48px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:1px;">${event.nome}</div>
        ${event.nome_completo ? `<div style="font-size:14px;color:rgba(255,255,255,0.7);margin-top:8px;">${event.nome_completo}</div>` : ""}
      </td></tr>`}
      <tr><td style="padding:40px 48px;">
        <p style="font-size:15px;color:#4a5568;line-height:1.7;margin:0 0 28px;white-space:pre-line;">${mensagem || DEFAULT_MENSAGEM}</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
          <tr><td align="center" style="border-radius:8px;background:${corCta};">
            <a href="${pesquisaUrl}" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;color:#c9a84c;text-decoration:none;letter-spacing:0.5px;">
              Responder pesquisa →
            </a>
          </td></tr>
        </table>
        <p style="font-size:13px;color:#a0aec0;text-align:center;margin:0;">
          Se o botão não funcionar, acesse: <a href="${pesquisaUrl}" style="color:#0a1f40;">${pesquisaUrl}</a>
        </p>
      </td></tr>
      <tr><td style="background:${corBase};padding:24px 48px;text-align:center;">
        <div style="font-size:13px;color:rgba(255,255,255,0.5);">
          ${event.nome}
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user: caller }, error: callerError } = await adminClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (callerError || !caller) return json({ error: "Token inválido" }, 401);

    const { data: callerProfile } = await adminClient
      .from("profiles").select("role").eq("id", caller.id).single();
    if (callerProfile?.role !== "admin") return json({ error: "Permissão insuficiente" }, 403);

    const { destinatarios, event, bannerUrl, pesquisaUrl, assunto, mensagem, corCabecalho, corRodape, corBotao } = await req.json();
    if (!Array.isArray(destinatarios) || !destinatarios.length) {
      return json({ error: "destinatarios é obrigatório e não pode ser vazio" }, 400);
    }

    const SMTP_HOST = Deno.env.get("SMTP_HOST");
    const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "465");
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASS = Deno.env.get("SMTP_PASS");
    const SMTP_FROM_NAME = Deno.env.get("SMTP_FROM_NAME") || event?.nome || "Eventos";
    const SMTP_FROM_EMAIL = Deno.env.get("SMTP_FROM_EMAIL") || SMTP_USER;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return json({
        error: "SMTP não configurado. Defina os secrets SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS na função (supabase secrets set ...).",
      }, 500);
    }

    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: SMTP_PORT === 465,
        auth: { username: SMTP_USER, password: SMTP_PASS },
      },
    });

    const sent: (string | number)[] = [];
    const failed: { id: string | number; email: string; error: string }[] = [];

    const html = gerarTemplateHTML({ event: event || {}, bannerUrl, pesquisaUrl, assunto, mensagem, corCabecalho, corRodape, corBotao });

    // Base64 evita o bug de quoted-printable do denomailer que deixava "=20" visível no corpo do e-mail
    function toBase64Utf8(str: string): string {
      const bytes = new TextEncoder().encode(str);
      let binary = "";
      for (const b of bytes) binary += String.fromCharCode(b);
      return btoa(binary);
    }
    const mimeContent = [{
      mimeType: 'text/html; charset="utf-8"',
      content: toBase64Utf8(html),
      transferEncoding: "base64",
    }];

    async function enviarComRetry(payload: Record<string, unknown>, tentativas = 2) {
      let ultimoErro: unknown;
      for (let i = 0; i < tentativas; i++) {
        try {
          await client.send(payload);
          return;
        } catch (err) {
          ultimoErro = err;
          if (i < tentativas - 1) await new Promise((r) => setTimeout(r, 1000));
        }
      }
      throw ultimoErro;
    }

    for (const dest of destinatarios) {
      try {
        await enviarComRetry({
          from: `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`,
          to: dest.email,
          subject: assunto || `Pesquisa de Satisfação — ${event?.nome || "Evento"}`,
          mimeContent,
        });
        sent.push(dest.id);
      } catch (err) {
        failed.push({ id: dest.id, email: dest.email, error: String(err) });
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    await client.close();

    return json({ sent, failed });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
