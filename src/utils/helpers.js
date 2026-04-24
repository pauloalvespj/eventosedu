import { CERT_PRINT_CSS, NIVEL_LABELS } from "../config/gamificacao";

// ── Tipo de atividade ─────────────────────────────────────────
export const TIPO_LABEL = { palestra: "Palestra", mesa_redonda: "Mesa Redonda", solenidade: "Solenidade", intervalo: "Intervalo", painel: "Painel", encerramento: "Encerramento" };
export const TIPO_COLOR = { palestra: "var(--navy)", mesa_redonda: "var(--teal)", solenidade: "var(--gold)", intervalo: "var(--border2)", painel: "#6a4a9a", encerramento: "#1a5a3a" };
export const TIPO_BG    = { palestra: "#e8f0fb", mesa_redonda: "#e1f3f3", solenidade: "var(--gold-pale)", intervalo: "var(--surface2)", painel: "#f0eafb", encerramento: "var(--success-bg)" };
export const TIPO_ICON  = { palestra: "🎤", mesa_redonda: "🗣️", solenidade: "🏛", intervalo: "☕", painel: "🗣️", encerramento: "🎓" };

// ── Role labels ───────────────────────────────────────────────
export const ROLE_LABEL = { super_admin: "Super Admin", admin: "Administrador", credenciador: "Credenciador", palestrante: "Palestrante", participante: "Participante" };
export const ROLE_COLOR = { super_admin: "danger", admin: "navy", credenciador: "teal", palestrante: "gold", participante: "navy" };

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

// ── Presença e certificado ────────────────────────────────────
export function calcPresenca(participante_id, atividades, presencas, event) {
  const atividadesContam = atividades.filter(a => a.conta_certificado);
  const chTotal = atividadesContam.reduce((s, a) => s + a.carga_horaria, 0);
  const presIds = presencas.filter(p => p.participante_id === participante_id).map(p => p.atividade_id);
  const chCumprida = atividadesContam.filter(a => presIds.includes(a.id)).reduce((s, a) => s + a.carga_horaria, 0);
  const pct = chTotal > 0 ? Math.round((chCumprida / chTotal) * 100) : 0;
  return { chCumprida, chTotal, pct, apto: pct >= (event?.percentual_minimo || 75) };
}

// ── QR Code ───────────────────────────────────────────────────
export function qrPresencaValue(atividadeId) {
  return `${window.location.origin}/presenca/${atividadeId}`;
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

// Com Supabase Auth o id já é o UUID direto — retorna user.id
export function getUserId(user) {
  if (!user) return null;
  return user.id;
}

// ── Certificado (impressão PDF) ───────────────────────────────
export function imprimirCertificado(user, event, presencaCalc, minasPresencas, atividades, tipo = "participante", minhasPalestras = [], totalCH_pal = 0) {
  const w = window.open("", "_blank");
  if (!w) return;
  if (tipo === "palestrante") {
    const lista = minhasPalestras.map(a => `<div>• ${a.titulo} <span style="color:#888">(${a.carga_horaria}h)</span></div>`).join("");
    w.document.write(`<html><head><title>Certificado Palestrante</title><style>${CERT_PRINT_CSS}</style></head><body><div class="cert"><div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#888;margin-bottom:1rem">Certificado de Palestrante</div><div style="font-size:11px;color:#555;margin-bottom:2rem">${event.nome_completo || event.nome}</div><h1>Certificamos que</h1><h2>${user.nome}</h2><div class="cargo">${user.titulo || ""} ${user.instituicao ? `· ${user.instituicao}` : ""}</div><p>atuou como <span class="gold">palestrante convidado(a)</span> no <span class="gold">${event.nome_completo || event.nome}</span>,<br>realizado de ${formatData(event.data_inicio)} a ${formatData(event.data_fim)}, em ${event.local}.</p><div class="ch-box">Carga horária: ${totalCH_pal}h</div><div class="ativs">${lista}</div><div class="assinaturas"><div class="ass"><div class="ass-linha"></div>Coordenação</div><div class="ass"><div class="ass-linha"></div>Comissão Organizadora</div></div><div class="footer">Emitido em ${new Date().toLocaleDateString("pt-BR")} · ${event.nome}</div></div><script>window.onload=()=>window.print()</script></body></html>`);
  } else {
    const ativsMarcadas = atividades.filter(a => a.conta_certificado && minasPresencas.some(p => p.atividade_id === a.id));
    const listaAtivs = ativsMarcadas.length ? `<div class="ativs">${ativsMarcadas.map(a => `<div>• ${a.titulo} <span style="color:#888">(${formatData(a.dia)} · ${a.carga_horaria}h)</span></div>`).join("")}</div>` : "";
    w.document.write(`<html><head><title>Certificado – ${user.nome}</title><style>${CERT_PRINT_CSS}</style></head><body><div class="cert"><div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#888;margin-bottom:1rem">Certificado de Participação</div><div style="font-size:11px;color:#555;margin-bottom:2rem">${event.nome_completo || event.nome}</div><h1>Certificamos que</h1><h2>${user.nome}</h2><div class="cargo">${user.cargo || ""} — ${user.instituicao || ""} · CPF: ${user.cpf || ""}</div><p>participou do <span class="gold">${event.nome_completo || event.nome}</span>,<br>realizado de ${formatData(event.data_inicio)} a ${formatData(event.data_fim)},<br>em ${event.local}, Fortaleza – CE.</p><div class="ch-box">Carga Horária: ${presencaCalc.chCumprida}h · ${presencaCalc.pct}%</div>${listaAtivs}<div class="assinaturas"><div class="ass"><div class="ass-linha"></div>Coordenação do Evento</div><div class="ass"><div class="ass-linha"></div>Comissão Organizadora</div></div><div class="footer">Emitido em ${new Date().toLocaleDateString("pt-BR")} · ${event.nome}</div></div><script>window.onload=()=>window.print()</script></body></html>`);
  }
  w.document.close();
}
