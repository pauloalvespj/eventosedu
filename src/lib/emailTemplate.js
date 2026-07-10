export const DEFAULT_MENSAGEM = "É com grande satisfação que convidamos você a participar do nosso evento. A participação é gratuita e garante certificado de participação. Faça sua inscrição agora mesmo!";

export function gerarTemplateHTML({ event, bannerUrl, inscricaoUrl, assunto, mensagem, anexoUrl, anexoNome }) {
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
      </td></tr>`}
      <tr><td style="padding:40px 48px;">
        <p style="font-size:15px;color:#4a5568;line-height:1.7;margin:0 0 20px;white-space:pre-line;">${mensagem || DEFAULT_MENSAGEM}</p>
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
      <tr><td style="background:#0a1f40;padding:24px 48px;text-align:center;">
        <div style="font-size:13px;color:rgba(255,255,255,0.5);">
          ${event.nome}
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
