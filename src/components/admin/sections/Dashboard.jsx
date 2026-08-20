import { useNavigate } from "react-router-dom";
import { useAdmin } from "./AdminContext";

// ── helpers locais ─────────────────────────────────────────────
const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

function periodoCompacto(ini, fim) {
  if (!ini) return "–";
  const d1 = new Date(ini + "T00:00:00");
  const d2 = fim ? new Date(fim + "T00:00:00") : d1;
  if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear())
    return `${d1.getDate()}–${d2.getDate()} ${MESES[d1.getMonth()]}. ${d1.getFullYear()}`;
  return `${d1.getDate()} ${MESES[d1.getMonth()]}–${d2.getDate()} ${MESES[d2.getMonth()]}. ${d2.getFullYear()}`;
}

function abreviarLocal(local) {
  if (!local) return "–";
  const parts = local.split(/\s*[–-]\s*/);
  if (parts.length >= 2) {
    const venue = parts[0].trim().split(" ").slice(0, 2).join(" ");
    return `${venue} · ${parts[parts.length - 1].trim()}`;
  }
  return local.length > 24 ? local.slice(0, 24) + "…" : local;
}

function fmtDate(d) {
  if (!d) return "–";
  return new Date(d).toLocaleDateString("pt-BR");
}

const Dot = ({ c }) => <span style={{ width:6, height:6, borderRadius:"50%", background:c, display:"inline-block", flexShrink:0 }}/>;
const B = ({ color, bg, border, label }) => (
  <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:"0.75rem", color, background:bg, border:`1px solid ${border}`, borderRadius:50, padding:"0.2rem 0.65rem" }}>
    <Dot c={color}/>{label}
  </span>
);

function InscricoesBadge({ event }) {
  const hoje = new Date().toISOString().split("T")[0];
  const { inscricao_inicio: ini, inscricao_fim: fim } = event;
  if (!ini && !fim) return <span style={{ fontSize:"0.82rem", color:"var(--white-low)" }}>–</span>;
  if (ini && hoje < ini) return <B color="var(--gold-on-dark)" bg="var(--gold-tint)" border="var(--gold-border)" label={`Abre ${fmtDate(ini)}`}/>;
  if (fim && hoje > fim) return <B color="#f87171" bg="rgba(248,113,113,0.1)" border="rgba(248,113,113,0.3)" label="Encerradas"/>;
  return <B color="#4ade80" bg="rgba(74,222,128,0.1)" border="rgba(74,222,128,0.3)" label="Abertas"/>;
}

// ── componente principal ───────────────────────────────────────
export function Dashboard() {
  const { event, user, participantes, palestrantes, presencas } = useAdmin();
  const navigate = useNavigate();
  const inscricoes = [...participantes]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 20);

  const totalInscritos    = participantes.length;
  const totalCredenciados = participantes.filter(p => p.credenciado).length;
  const totalPalestrantes = (palestrantes || []).length;
  const totalPresencas    = presencas.length;

  const hoje     = new Date(); hoje.setHours(0, 0, 0, 0);
  const inicio   = new Date(event.data_inicio + "T00:00:00");
  const fimEvt   = new Date(event.data_fim    + "T00:00:00");
  const diasRest = Math.ceil((inicio - hoje) / (1000 * 60 * 60 * 24));
  const emAndamento = hoje >= inicio && hoje <= fimEvt;
  const encerrado   = hoje > fimEvt;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>

      {!user?.nome_publico && (
        <div style={{ background:"#fde2ea", border:"1px solid #f3a8c0", borderRadius:"var(--radius-sm)", padding:"0.75rem 1rem", fontSize:"0.85rem", color:"#8b0f2f", fontWeight:600, display:"flex", alignItems:"center", justifyContent:"space-between", gap:"0.75rem", flexWrap:"wrap" }}>
          <span>⚠️ Seu cadastro está incompleto — falta preencher o nome para crachá e divulgação.</span>
          <button className="btn btn-sm" style={{ background:"#8b0f2f", color:"#fff", flexShrink:0 }} onClick={() => navigate("/painel/meus-dados")}>
            Completar cadastro
          </button>
        </div>
      )}

      {/* ══ 1. Hero compacto ══ */}
      <div className="card-hero dash-hero" style={{ padding:"1rem 1.5rem" }}>

        {/* Nome + tema */}
        <div style={{ flex:"1 1 160px", minWidth:0 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.35rem", fontWeight:800, color:"var(--gold-on-dark)", lineHeight:1.1 }}>{event.nome}</div>
          {event.subtitulo && (
            <div style={{ fontSize:"0.7rem", color:"var(--white-low)", fontStyle:"italic", marginTop:2 }}>
              {event.subtitulo}
            </div>
          )}
        </div>

        {/* Período */}
        <div style={{ flex:"0 0 auto" }}>
          <div className="hero-label">Período</div>
          <div style={{ fontWeight:600, fontSize:"0.85rem", color:"var(--white-hi)", whiteSpace:"nowrap" }}>
            {periodoCompacto(event.data_inicio, event.data_fim)}
          </div>
        </div>

        {/* Local */}
        <div style={{ flex:"0 0 auto" }}>
          <div className="hero-label">Local</div>
          <div style={{ fontWeight:600, fontSize:"0.85rem", color:"var(--white-hi)", whiteSpace:"nowrap" }}>
            {abreviarLocal(event.local)}
          </div>
        </div>

        {/* Inscrições badge */}
        <div style={{ flex:"0 0 auto" }}>
          <div className="hero-label">Inscrições</div>
          <InscricoesBadge event={event}/>
        </div>

        {/* Contador de dias */}
        <div className="dash-hero-counter">
          {encerrado ? (
            <>
              <div style={{ fontSize:"1.25rem", color:"var(--gold-on-dark)" }}>✓</div>
              <div className="hero-label" style={{ marginBottom:0, marginTop:2 }}>Encerrado</div>
            </>
          ) : emAndamento ? (
            <>
              <div style={{ fontSize:"1.25rem" }}>🎉</div>
              <div className="hero-label" style={{ marginBottom:0, marginTop:2 }}>Hoje</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.75rem", fontWeight:800, color:"var(--gold-on-dark)", lineHeight:1 }}>{diasRest}</div>
              <div className="hero-label" style={{ marginBottom:0, marginTop:2 }}>dias</div>
            </>
          )}
        </div>

      </div>

      {/* ══ 2. 4 Métricas ══ */}
      <div className="dash-metrics">
        {[
          { n: totalInscritos,    l: "Inscritos"           },
          { n: totalCredenciados, l: "Credenciados"        },
          { n: totalPalestrantes, l: "Palestrantes"        },
          { n: totalPresencas,    l: "Presenças registradas" },
        ].map((c, i) => (
          <div key={i} className="card-white" style={{ textAlign:"center", padding:"1.1rem 0.75rem" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem", fontWeight:800, lineHeight:1, color:"var(--navy)", marginBottom:"0.35rem" }}>{c.n}</div>
            <div style={{ fontSize:"0.72rem", color:"var(--text3)", fontWeight:500 }}>{c.l}</div>
          </div>
        ))}
      </div>

      {/* ══ 3. Últimas inscrições ══ */}
      <div className="card-white">
        <div style={{ fontWeight:700, fontSize:"0.88rem", color:"var(--navy)", paddingBottom:"0.75rem", borderBottom:"0.5px solid var(--border)", marginBottom:0 }}>
          Últimas inscrições
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:480 }}>
            <thead>
              <tr>
                {["Nome","Instituição","Data de inscrição"].map(h => (
                  <th key={h} style={{ textAlign:"left", fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text3)", fontWeight:600, padding:"0.55rem 0.5rem", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inscricoes.length === 0 ? (
                <tr><td colSpan={3} style={{ padding:"1.5rem 0", textAlign:"center", color:"var(--text3)", fontSize:"0.85rem" }}>Nenhum inscrito ainda.</td></tr>
              ) : inscricoes.map(p => (
                <tr key={p.id} style={{ borderBottom:"0.5px solid var(--border)" }}>
                  <td style={{ padding:"0.55rem 0.5rem", fontSize:"0.85rem", fontWeight:500, maxWidth:0, width:"40%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {p.nome}
                  </td>
                  <td style={{ padding:"0.55rem 0.5rem", fontSize:"0.82rem", color:"var(--text2)", maxWidth:0, width:"40%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {p.instituicao || "–"}
                  </td>
                  <td style={{ padding:"0.55rem 0 0.55rem 0", fontSize:"0.82rem", color:"var(--text2)", whiteSpace:"nowrap" }}>
                    {fmtDate(p.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
