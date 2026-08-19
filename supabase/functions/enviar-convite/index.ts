import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Envia convites por e-mail via SMTP para uma lista de leads.
//
// Secrets obrigatórios (defina com `supabase secrets set NOME=valor`):
//   SMTP_HOST        ex: smtp.gmail.com
//   SMTP_PORT        ex: 465 (SSL) ou 587 (STARTTLS)
//   SMTP_USER        usuário/login SMTP (ex: seuemail@gmail.com)
//   SMTP_PASS        senha do SMTP — para Gmail, use uma "Senha de App" (não a senha normal da conta)
// Opcionais:
//   SMTP_FROM_NAME   nome exibido no remetente (default: nome do evento)
//   SMTP_FROM_EMAIL  e-mail do remetente (default: SMTP_USER)

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

const DEFAULT_MENSAGEM = "É com grande satisfação que convidamos você a participar do nosso evento. A participação é gratuita e garante certificado de participação. Faça sua inscrição agora mesmo!";

function formatDataBR(d: string | undefined): string {
  if (!d) return "";
  const [y, m, dia] = d.split("-");
  return `${dia}/${m}/${y}`;
}

function gerarTemplateHTML({ event, bannerUrl, inscricaoUrl, assunto, mensagem, anexoUrl, anexoNome, corCabecalho, corRodape, corBotao, ctaTexto }: any) {
  const corTopo = corCabecalho || "#0a1f40";
  const corBase = corRodape || "#0a1f40";
  const corCta = corBotao || "#0a1f40";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${assunto || `Convite — ${event.nome}`}</title></head>
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
        <p style="font-size:15px;color:#4a5568;line-height:1.7;margin:0 0 20px;white-space:pre-line;">${mensagem || DEFAULT_MENSAGEM}</p>
        <table cellpadding="0" cellspacing="0" style="background:#f7f9fc;border-radius:8px;padding:20px;margin:0 0 28px;width:100%;">
          <tr><td style="font-size:14px;color:#4a5568;padding:4px 0;">📍 <strong>Local:</strong> ${event.local || ""}</td></tr>
          <tr><td style="font-size:14px;color:#4a5568;padding:4px 0;">📅 <strong>Data:</strong> ${formatDataBR(event.data_inicio)} a ${formatDataBR(event.data_fim)}</td></tr>
          ${event.realizacao ? `<tr><td style="font-size:14px;color:#4a5568;padding:4px 0;">🏛 <strong>Realização:</strong> ${event.realizacao}</td></tr>` : ""}
        </table>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
          <tr><td align="center" style="border-radius:8px;background:${corCta};">
            <a href="${inscricaoUrl}" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;color:#c9a84c;text-decoration:none;letter-spacing:0.5px;">
              ${ctaTexto || "Quero me inscrever →"}
            </a>
          </td></tr>
        </table>
        <p style="font-size:13px;color:#a0aec0;text-align:center;margin:0 0 ${anexoUrl ? "20" : "0"}px;">
          Se o botão não funcionar, acesse: <a href="${inscricaoUrl}" style="color:#0a1f40;">${inscricaoUrl}</a>
        </p>
        ${anexoUrl ? `
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr><td align="center" style="border-radius:8px;border:1.5px solid #0a1f40;">
            <a href="${anexoUrl}" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:700;color:#0a1f40;text-decoration:none;">
              📎 Baixar ${anexoNome || "anexo"}
            </a>
          </td></tr>
        </table>` : ""}
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

    const { leads, event, bannerUrl, inscricaoUrl, assunto, mensagem, anexoUrl, anexoNome, corCabecalho, corRodape, corBotao, ctaTexto, magicLink, origin } = await req.json();
    if (!Array.isArray(leads) || !leads.length) {
      return json({ error: "leads é obrigatório e não pode ser vazio" }, 400);
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

    // Base64 evita o bug de quoted-printable do denomailer que deixava "=20" visível no corpo do e-mail
    function toBase64Utf8(str: string): string {
      const bytes = new TextEncoder().encode(str);
      let binary = "";
      for (const b of bytes) binary += String.fromCharCode(b);
      return btoa(binary);
    }

    // Sem magicLink: mesmo HTML pra todo mundo, gerado uma vez só
    const htmlPadrao = magicLink ? null : gerarTemplateHTML({ event: event || {}, bannerUrl, inscricaoUrl, assunto, mensagem, anexoUrl, anexoNome, corCabecalho, corRodape, corBotao, ctaTexto });
    const mimeContentPadrao = htmlPadrao ? [{
      mimeType: 'text/html; charset="utf-8"',
      content: toBase64Utf8(htmlPadrao),
      transferEncoding: "base64",
    }] : null;

    // Reenvia até 2x em caso de falha transitória de rede/SMTP antes de marcar como falho
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

    for (const lead of leads) {
      try {
        let mimeContent = mimeContentPadrao;

        if (magicLink) {
          // Link de login direto (sem precisar digitar e-mail/senha de novo) —
          // só funciona pra quem já tem conta; se falhar, cai pro link estático.
          let linkFinal = inscricaoUrl;
          try {
            const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
              type: "magiclink",
              email: lead.email,
              options: { redirectTo: `${origin || inscricaoUrl}/auth/callback` },
            });
            if (linkError) throw linkError;
            if (linkData?.properties?.action_link) linkFinal = linkData.properties.action_link;
          } catch {
            // Segue com o link estático (inscricaoUrl) como fallback
          }
          const html = gerarTemplateHTML({ event: event || {}, bannerUrl, inscricaoUrl: linkFinal, assunto, mensagem, anexoUrl, anexoNome, corCabecalho, corRodape, corBotao, ctaTexto });
          mimeContent = [{
            mimeType: 'text/html; charset="utf-8"',
            content: toBase64Utf8(html),
            transferEncoding: "base64",
          }];
        }

        await enviarComRetry({
          from: `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`,
          to: lead.email,
          subject: assunto || `Convite — ${event?.nome || "Evento"}`,
          mimeContent,
        });
        sent.push(lead.id);
      } catch (err) {
        failed.push({ id: lead.id, email: lead.email, error: String(err) });
      }
      // Evita estourar limites de taxa do provedor SMTP
      await new Promise((r) => setTimeout(r, 300));
    }

    await client.close();

    return json({ sent, failed });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
