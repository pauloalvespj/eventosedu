import { CERT_PRINT_CSS, NIVEL_LABELS } from "../config/gamificacao";

// ── Tipo de atividade ─────────────────────────────────────────
export const TIPO_LABEL = { palestra: "Palestra", mesa_redonda: "Mesa Redonda", solenidade: "Solenidade", intervalo: "Intervalo", painel: "Painel", encerramento: "Encerramento" };
export const TIPO_COLOR = { palestra: "var(--navy)", mesa_redonda: "var(--teal)", solenidade: "var(--gold)", intervalo: "var(--border2)", painel: "#6a4a9a", encerramento: "#1a5a3a" };
export const TIPO_BG    = { palestra: "#e8f0fb", mesa_redonda: "#e1f3f3", solenidade: "var(--gold-pale)", intervalo: "var(--surface2)", painel: "#f0eafb", encerramento: "var(--success-bg)" };
export const TIPO_ICON  = { palestra: "🎤", mesa_redonda: "🗣️", solenidade: "🏛", intervalo: "☕", painel: "🗣️", encerramento: "🎓" };

// ── Role labels ───────────────────────────────────────────────
export const ROLE_LABEL = { admin: "Administrador", credenciador: "Credenciador", palestrante: "Palestrante", participante: "Participante" };
export const ROLE_COLOR = { admin: "navy", credenciador: "teal", palestrante: "gold", participante: "navy" };

// ── Formatação ────────────────────────────────────────────────
export function formatCPF(v) {
  return v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function validateCPF(cpf) {
  const c = cpf.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(c[i]) * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(c[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(c[i]) * (11 - i);
  r = (s * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(c[10]);
}

export function formatData(d) {
  if (!d) return "";
  const [y, m, dia] = d.split("-");
  return `${dia}/${m}/${y}`;
}

const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
export function formatPeriodo(inicio, fim) {
  if (!inicio) return "";
  const [, m1, d1] = inicio.split("-");
  if (!fim) return `${parseInt(d1)} de ${MESES[parseInt(m1)-1]}`;
  const [, m2, d2] = fim.split("-");
  if (m1 === m2) return `${parseInt(d1)} a ${parseInt(d2)} de ${MESES[parseInt(m2)-1]}`;
  return `${parseInt(d1)} de ${MESES[parseInt(m1)-1]} a ${parseInt(d2)} de ${MESES[parseInt(m2)-1]}`;
}

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export function diaSemana(d) {
  const dt = new Date(d + "T12:00:00");
  return DIAS_PT[dt.getDay()];
}

export function timeAgo(dt) {
  const diff = Date.now() - new Date(dt).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `há ${d}d`; if (h > 0) return `há ${h}h`; if (m > 0) return `há ${m}min`; return "agora";
}

// ── Exportação CSV ──────────────────────────────────────────────
// BOM UTF-8 no início: sem ele o Excel (pt-BR) abre o CSV como
// Windows-1252 e quebra acentuação (ç, ã, õ...).
export function baixarCSV(nomeArquivo, conteudo) {
  const bom = String.fromCharCode(0xFEFF);
  const blob = new Blob([bom + conteudo], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Presença e certificado ────────────────────────────────────
// No modo "turno" (event.modo_frequencia === "turno"), a frequência é
// calculada a partir de turnos/presencasTurno (entidade independente das
// atividades) em vez de atividades/presencas.
export function calcPresenca(participante_id, atividades, presencas, event, turnos = [], presencasTurno = []) {
  if (event?.modo_frequencia === "turno") {
    const turnosContam = turnos.filter(t => t.conta_certificado);
    const chTotal = turnosContam.reduce((s, t) => s + Number(t.carga_horaria || 0), 0);
    const presIds = presencasTurno.filter(p => p.participante_id === participante_id).map(p => p.turno_id);
    const chCumprida = turnosContam.filter(t => presIds.includes(t.id)).reduce((s, t) => s + Number(t.carga_horaria || 0), 0);
    const pct = chTotal > 0 ? Math.round((chCumprida / chTotal) * 100) : 0;
    return { chCumprida, chTotal, pct, apto: pct >= (event?.percentual_minimo || 75) };
  }
  const atividadesContam = atividades.filter(a => a.conta_certificado);
  const chTotal = atividadesContam.reduce((s, a) => s + a.carga_horaria, 0);
  const presIds = presencas.filter(p => p.participante_id === participante_id).map(p => p.atividade_id);
  const chCumprida = atividadesContam.filter(a => presIds.includes(a.id)).reduce((s, a) => s + a.carga_horaria, 0);
  const pct = chTotal > 0 ? Math.round((chCumprida / chTotal) * 100) : 0;
  return { chCumprida, chTotal, pct, apto: pct >= (event?.percentual_minimo || 75) };
}

// ── QR Code ───────────────────────────────────────────────────
// O token vem da tabela atividade_qr_tokens e é validado no servidor
// pela RPC registrar_presenca_qr.
export function qrPresencaValue(atividadeId, token) {
  return `${window.location.origin}/presenca/${atividadeId}?t=${token ?? ""}`;
}

// Mesma ideia, para o check-in por turno (RPC registrar_presenca_turno_qr).
export function qrPresencaTurnoValue(turnoId, token) {
  return `${window.location.origin}/presenca-turno/${turnoId}?t=${token ?? ""}`;
}

// ── Gamificação ───────────────────────────────────────────────
export function calcPontos(userId, pontuacoes) {
  return pontuacoes.filter(p => p.user_id === userId).reduce((s, p) => s + p.valor, 0);
}

export function getRanking(participantes, palestrantes, admins, pontuacoes) {
  const todos = [
    ...participantes.map(p => ({ uid: p.id, nome: p.nome, inst: p.instituicao, role: "participante", iniciais: p.foto_iniciais || p.nome.split(" ").map(n => n[0]).slice(0, 2).join("") })),
    ...palestrantes.map(p => ({ uid: p.id, nome: p.nome, inst: p.instituicao, role: "palestrante", iniciais: p.foto_iniciais })),
    ...admins.filter(a => a.ativo).map(a => ({ uid: a.id, nome: a.nome, inst: a.instituicao, role: a.role, iniciais: a.foto_iniciais })),
  ];
  return todos.map(u => ({ ...u, pts: calcPontos(u.uid, pontuacoes) }))
    .filter(u => u.pts > 0)
    .sort((a, b) => b.pts - a.pts);
}

export function getNivel(pts) {
  let n = NIVEL_LABELS[0];
  for (const l of NIVEL_LABELS) if (pts >= l.min) n = l;
  return n;
}

// ── Fórum ─────────────────────────────────────────────────────
export function forumAberto(config) {
  if (!config.ativo) return false;
  const now = Date.now();
  const ini = new Date(config.data_inicio).getTime();
  const fim = new Date(config.data_fim).getTime();
  return now >= ini && now <= fim;
}

// ── Hash de validação do certificado ─────────────────────────
const CERT_SECRET = "enaudin_cert_v1";

export function gerarHashCertificado(userId, eventId) {
  const str = `${CERT_SECRET}:${eventId}:${userId}`;
  let h1 = 5381;
  for (let i = 0; i < str.length; i++) h1 = Math.imul(h1, 33) ^ str.charCodeAt(i);
  let h2 = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h2 ^= str.charCodeAt(i); h2 = Math.imul(h2, 0x01000193); }
  return `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}

export function validarHashCertificado(userId, eventId, sig) {
  return sig === gerarHashCertificado(userId, eventId);
}

// Com Supabase Auth o id já é o UUID direto — retorna user.id
export function getUserId(user) {
  if (!user) return null;
  return user.id;
}

// ── Certificado ───────────────────────────────────────────────
const CERT_DEFAULTS = {
  logo_esq_url: "", logo_dir_url: "",
  titulo_participante: "Certificado de Participação",
  titulo_palestrante:  "Certificado de Palestrante",
  texto_participante:  "participou de todas as atividades do",
  texto_palestrante:   "atuou como palestrante convidado(a) no",
  conteudo_programatico: "",
  mostrar_ch: true, mostrar_lista_ativs: false,
  borda_dupla: true,
  cor_primaria: "#0f3460", cor_secundaria: "#c9a84c",
  assinaturas: [
    { id: 1, nome: "", cargo: "Coordenação do Evento",  assinatura_url: "" },
    { id: 2, nome: "", cargo: "Comissão Organizadora",  assinatura_url: "" },
  ],
};

export function gerarHtmlCertificado(user, event, presencaCalc, minasPresencas = [], atividades = [], tipo = "participante", minhasPalestras = [], totalCH_pal = 0, certConfigRaw = {}, baseUrl = window.location.origin) {
  const cfg = { ...CERT_DEFAULTS, ...certConfigRaw };
  const C1 = cfg.cor_primaria;
  const C2 = cfg.cor_secundaria;
  const nomeEvento = event.nome_completo || event.nome;
  const textoBase = tipo === "palestrante" ? cfg.texto_palestrante : cfg.texto_participante;
  const titulo    = tipo === "palestrante" ? cfg.titulo_palestrante : cfg.titulo_participante;

  // Logos
  const logoEsq = cfg.logo_esq_url
    ? `<img src="${cfg.logo_esq_url}" style="max-height:60px;max-width:160px;object-fit:contain" />`
    : `<div style="width:1px"></div>`;
  const logoDir = cfg.logo_dir_url
    ? `<img src="${cfg.logo_dir_url}" style="max-height:60px;max-width:160px;object-fit:contain" />`
    : `<div style="width:1px"></div>`;

  // Corpo do nome/cargo
  const subInfo = tipo === "palestrante"
    ? [user.titulo, user.instituicao].filter(Boolean).join(" · ")
    : [user.cargo, user.instituicao, user.cpf ? `CPF: ${user.cpf}` : ""].filter(Boolean).join(" · ");

  // CH box
  const chBox = cfg.mostrar_ch
    ? tipo === "palestrante"
      ? `<div class="ch-box" style="background:${C2}18;border-color:${C2};color:${C2}">Carga Horária Total: ${totalCH_pal}h</div>`
      : `<div class="ch-box" style="background:${C2}18;border-color:${C2};color:${C2}">Carga Horária: ${presencaCalc?.chCumprida || 0}h</div>`
    : "";

  // Lista de atividades
  let listaAtivs = "";
  if (cfg.mostrar_lista_ativs && tipo !== "palestrante" && minasPresencas.length > 0) {
    const ativsMarcadas = atividades.filter(a => a.conta_certificado && minasPresencas.some(p => p.atividade_id === a.id));
    if (ativsMarcadas.length) {
      listaAtivs = `<div class="ativs">${ativsMarcadas.map(a => `<div>• ${a.titulo} <span style="color:#888">(${formatData(a.dia)} · ${a.carga_horaria}h)</span></div>`).join("")}</div>`;
    }
  }
  if (tipo === "palestrante" && minhasPalestras.length > 0) {
    listaAtivs = `<div class="ativs">${minhasPalestras.map(a => `<div>• ${a.titulo} <span style="color:#888">(${a.carga_horaria}h)</span></div>`).join("")}</div>`;
  }

  // Conteúdo programático
  const progHtml = cfg.conteudo_programatico
    ? `<div class="prog-box" style="border-color:${C1}33;background:${C1}06"><div class="prog-titulo" style="color:${C1}">Conteúdo Programático</div>${cfg.conteudo_programatico.split("\n").filter(Boolean).map(l => `<div class="prog-linha">${l}</div>`).join("")}</div>`
    : "";

  // Assinaturas
  const assHtml = cfg.assinaturas.map(a => `
    <div class="ass">
      ${a.assinatura_url ? `<img src="${a.assinatura_url}" class="ass-img" />` : `<div style="height:48px"></div>`}
      <div class="ass-linha" style="border-color:${C1}"></div>
      ${a.nome ? `<div class="ass-nome">${a.nome}</div>` : ""}
      <div class="ass-cargo">${a.cargo}</div>
    </div>`).join("");

  // Borda ornamental
  const bordaStyle = cfg.borda_dupla
    ? `.cert::before{content:'';position:absolute;inset:12px;border:1px solid ${C2};pointer-events:none}`
    : "";

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Poppins:wght@400;500;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Poppins',sans-serif;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1.5rem}
    .cert{width:277mm;min-height:190mm;border:5px double ${C1};padding:2rem 2.5rem;text-align:center;position:relative;background:#fff}
    ${bordaStyle}
    .logos{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;min-height:64px}
    .titulo-cert{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#888;margin-bottom:.5rem}
    .evento-sigla{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:${C1};letter-spacing:.04em;line-height:1.1;margin-bottom:.3rem}
    .evento-nome{font-size:11px;color:#666;margin-bottom:.25rem}
    .evento-sep{width:48px;height:2px;background:${C2};margin:.5rem auto 1.25rem}
    h1{font-family:'Playfair Display',serif;font-size:13px;color:${C1};margin-bottom:.4rem;font-weight:600}
    h2{font-family:'Playfair Display',serif;font-size:26px;color:#0a1f40;margin-bottom:.2rem;font-style:italic}
    .subinfo{font-size:12px;color:#555;margin-bottom:1.25rem}
    p{font-size:12.5px;color:#333;line-height:1.8;margin-bottom:1rem}
    .gold{color:${C2};font-weight:600}
    .ch-box{display:inline-block;border:1px solid;padding:.3rem 1.4rem;border-radius:50px;font-size:12px;font-weight:600;margin-bottom:1rem}
    .ativs{text-align:left;background:#f8f7ff;border-radius:8px;padding:.8rem 1.2rem;margin:0 auto .75rem;max-width:480px;font-size:11px;color:#444;line-height:1.8}
    .ativs div{border-bottom:1px solid #e0dff0;padding:.2rem 0}.ativs div:last-child{border:none}
    .prog-box{text-align:left;border:1px solid;border-radius:8px;padding:.8rem 1.2rem;margin:0 auto .75rem;max-width:520px}
    .prog-titulo{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;margin-bottom:.4rem}
    .prog-linha{font-size:11px;color:#444;line-height:1.8;padding:.1rem 0}
    .assinaturas{display:flex;justify-content:center;gap:3rem;margin-top:1.25rem;flex-wrap:wrap}
    .ass{text-align:center;min-width:120px}
    .ass-img{height:48px;max-width:150px;object-fit:contain;display:block;margin:0 auto .25rem}
    .ass-linha{border-top:1px solid;width:140px;margin:.1rem auto .25rem}
    .ass-nome{font-size:10.5px;color:#333;font-weight:600}
    .ass-cargo{font-size:10px;color:#666}
    .footer{position:absolute;bottom:1rem;left:2.5rem;right:2.5rem;font-size:8.5px;color:#bbb;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e8e8e8;padding-top:.4rem}
    .footer-hash{font-family:monospace;color:#aaa;letter-spacing:.04em}
    .footer-link{color:#aaa;text-decoration:none}
    @media print{body{background:#fff;padding:0}@page{size:A4 landscape;margin:0}}
  `;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${titulo} – ${user.nome}</title><style>${css}</style></head><body>
<div class="cert">
  <div class="logos">${logoEsq}${logoDir}</div>
  <div class="titulo-cert">${titulo}</div>
  <div class="evento-sigla">${event.nome}</div>
  ${event.nome_completo && event.nome_completo !== event.nome ? `<div class="evento-nome">${event.nome_completo}</div>` : ""}
  <div class="evento-sep"></div>
  <h1>Certificamos que</h1>
  <h2>${user.nome}</h2>
  <div class="subinfo">${subInfo}</div>
  <p>${textoBase} <span class="gold">${nomeEvento}</span>,<br>
  realizado de ${formatData(event.data_inicio)} a ${formatData(event.data_fim)}, em ${event.local || ""}.</p>
  ${chBox}
  ${listaAtivs}
  ${progHtml}
  <div class="assinaturas">${assHtml}</div>
  <div class="footer">
    <span>Emitido em ${new Date().toLocaleDateString("pt-BR")} · ${event.nome}</span>
    <span>Cód.: <span class="footer-hash">${gerarHashCertificado(user.id, event.id)}</span> · <a class="footer-link" href="${baseUrl}/validar?u=${user.id}&e=${event.id}&s=${gerarHashCertificado(user.id, event.id)}">${baseUrl}/validar</a></span>
  </div>
</div>
<script>window.onload=()=>window.print()</script>
</body></html>`;
}

// Mantém compatibilidade com chamadas existentes
export function imprimirCertificado(user, event, presencaCalc, minasPresencas, atividades, tipo = "participante", minhasPalestras = [], totalCH_pal = 0) {
  const cfg = event.cert_config || {};
  const html = gerarHtmlCertificado(user, event, presencaCalc, minasPresencas, atividades, tipo, minhasPalestras, totalCH_pal, cfg);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
