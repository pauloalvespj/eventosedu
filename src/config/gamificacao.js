// ============================================================
// CONFIGURAÇÃO DE GAMIFICAÇÃO E FÓRUM
// ============================================================

// Pontos por ação
export const PONTOS = {
  presenca:          10, // confirmar presença numa atividade
  avaliacao:          5, // avaliar uma palestra com estrelas
  topico:            15, // criar tópico no fórum
  resposta:           8, // responder tópico
  curtida_recebida:   3, // receber curtida em post/resposta
  primeiro_dia:       5, // bônus por ser um dos primeiros 10 a confirmar presença
  topico_destaque:   20, // tópico marcado como destaque pelo admin
};

export const NIVEL_LABELS = [
  { min: 0,   label: "Observador",   icon: "👁",  cor: "#888" },
  { min: 20,  label: "Participante", icon: "🌱",  cor: "#1d6a6a" },
  { min: 60,  label: "Engajado",     icon: "⭐",  cor: "#a07020" },
  { min: 120, label: "Destaque",     icon: "🏅",  cor: "#0f3460" },
  { min: 200, label: "Embaixador",   icon: "🏆",  cor: "#b03030" },
];

export const CATEGORIAS_FORUM = [
  { id: "geral",       label: "Geral",        cor: "#0f3460" },
  { id: "duvidas",     label: "Dúvidas",      cor: "#1d6a6a" },
  { id: "networking",  label: "Networking",   cor: "#6a4a9a" },
  { id: "conteudo",    label: "Conteúdo",     cor: "#a07020" },
  { id: "organizacao", label: "Organização",  cor: "#1a7a4a" },
];

export const CERT_PRINT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem}.cert{width:210mm;min-height:148mm;border:6px double #0f3460;padding:3rem;text-align:center;position:relative;background:#fff}.cert::before{content:'';position:absolute;inset:12px;border:1px solid #c9a84c;pointer-events:none}h1{font-family:'Playfair Display',serif;font-size:14px;color:#0f3460;margin-bottom:.5rem}h2{font-family:'Playfair Display',serif;font-size:28px;color:#0a1f40;margin-bottom:.25rem}.cargo{font-size:13px;color:#555;margin-bottom:2rem}p{font-size:13px;color:#333;line-height:1.8;margin-bottom:1.5rem}.gold{color:#9a7a20;font-weight:600}.ch-box{display:inline-block;background:#fdf8ee;border:1px solid #c9a84c;padding:.4rem 1.5rem;border-radius:50px;font-size:13px;color:#7a5a10;font-weight:600;margin-bottom:2rem}.ativs{text-align:left;background:#f8f7ff;border-radius:8px;padding:1rem 1.5rem;margin:0 auto 2rem;max-width:500px;font-size:11px;color:#444;line-height:1.8}.ativs div{border-bottom:1px solid #e0dff0;padding:.25rem 0}.ativs div:last-child{border:none}.assinaturas{display:flex;justify-content:center;gap:4rem;margin-top:2rem}.ass{text-align:center;font-size:10px;color:#555}.ass-linha{width:140px;border-top:1px solid #333;margin:0 auto .25rem}.footer{font-size:9px;color:#aaa;margin-top:1.5rem}@media print{body{background:#fff;padding:0}@page{size:A4 landscape;margin:0}}`;
