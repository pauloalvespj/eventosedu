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

function gerarTemplateHTML({ event, bannerUrl, inscricaoUrl, assunto, mensagem }: any) {
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
      <tr><td style="background:linear-gradient(135deg,#0a1f40,#1d6a6a);padding:40px 48px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#c9a84c;letter-spacing:1px;">${event.nome}</div>
        <div style="font-size:14px;color:rgba(255,255,255,0.7);margin-top:8px;">${event.nome_completo || ""}</div>
      </td></tr>`}
      <tr><td style="padding:40px 48px;">
        <p style="font-size:15px;color:#4a5568;line-height:1.7;margin:0 0 20px;white-space:pre-line;">${mensagem || DEFAULT_MENSAGEM}</p>
        ${event.subtitulo ? `<p style="font-size:14px;color:#718096;font-style:italic;border-left:3px solid #c9a84c;padding-left:12px;margin:0 0 20px;">"${event.subtitulo}"</p>` : ""}
        <table cellpadding="0" cellspacing="0" style="background:#f7f9fc;border-radius:8px;padding:20px;margin:0 0 28px;width:100%;">
          <tr><td style="font-size:14px;color:#4a5568;padding:4px 0;">📍 <strong>Local:</strong> ${event.local || ""}</td></tr>
          <tr><td style="font-size:14px;color:#4a5568;padding:4px 0;">📅 <strong>Data:</strong> ${event.data_inicio || ""} a ${event.data_fim || ""}</td></tr>
          ${event.realizacao ? `<tr><td style="font-size:14px;color:#4a5568;padding:4px 0;">🏛 <strong>Realização:</strong> ${event.realizacao}</td></tr>` : ""}
        </table>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
          <tr><td align="center" style="border-radius:8px;background:#0a1f40;">
            <a href="${inscricaoUrl}" style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:700;color:#c9a84c;text-decoration:none;letter-spacing:0.5px;">
              Quero me inscrever →
            </a>
          </td></tr>
        </table>
        <p style="font-size:13px;color:#a0aec0;text-align:center;margin:0;">
          Se o botão não funcionar, acesse: <a href="${inscricaoUrl}" style="color:#0a1f40;">${inscricaoUrl}</a>
        </p>
      </td></tr>
      <tr><td style="background:#0a1f40;padding:24px 48px;text-align:center;">
        <div style="font-size:13px;color:rgba(255,255,255,0.5);">
          ${event.nome} · ${event.local || ""}<br/>
          Este é um convite pessoal. Encaminhe com cuidado.
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

    const { leads, event, bannerUrl, inscricaoUrl, assunto, mensagem, anexoUrl, anexoNome } = await req.json();
    if (!Array.isArray(leads) || !leads.length) {
      return json({ error: "leads é obrigatório e não pode ser vazio" }, 400);
    }

    // Baixa o anexo uma única vez (reaproveitado em todos os envios)
    let attachments: { filename: string; content: string; encoding: string }[] = [];
    if (anexoUrl) {
      try {
        const res = await fetch(anexoUrl);
        if (res.ok) {
          const bytes = new Uint8Array(await res.arrayBuffer());
          let binary = "";
          for (const b of bytes) binary += String.fromCharCode(b);
          attachments = [{
            filename: anexoNome || "anexo",
            content: btoa(binary),
            encoding: "base64",
          }];
        }
      } catch (_err) {
        // Se não conseguir baixar o anexo, envia sem ele em vez de falhar tudo
      }
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

    for (const lead of leads) {
      try {
        const html = gerarTemplateHTML({ event: event || {}, bannerUrl, inscricaoUrl, assunto, mensagem });
        await client.send({
          from: `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`,
          to: lead.email,
          subject: assunto || `Convite — ${event?.nome || "Evento"}`,
          html,
          attachments,
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
