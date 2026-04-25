import { useAdmin } from "./AdminContext";
import { calcPresenca, formatData } from "../../../utils/helpers";

function InscricoesBadge({ event }) {
  const hoje = new Date().toISOString().split("T")[0];
  const { inscricao_inicio: ini, inscricao_fim: fim } = event;
  if (!ini && !fim) return null;
  const Dot = ({ c }) => <span style={{ width:5, height:5, borderRadius:"50%", background:c, display:"inline-block", flexShrink:0 }}/>;
  const Badge = ({ color, bg, border, label }) => (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:"0.68rem", color, background:bg, border:`1px solid ${border}`, borderRadius:50, padding:"0.15rem 0.55rem", marginTop:3 }}>
      <Dot c={color}/>{label}
    </span>
  );
  if (ini && hoje < ini) return <Badge color="var(--gold-on-dark)" bg="var(--gold-tint)" border="var(--gold-border)" label={`Abre em ${formatData(ini)}`}/>;
  if (fim && hoje > fim) return <Badge color="#f87171" bg="rgba(248,113,113,0.1)" border="rgba(248,113,113,0.3)" label="Encerradas"/>;
  return <Badge color="#4ade80" bg="rgba(74,222,128,0.1)" border="rgba(74,222,128,0.3)" label="Abertas"/>;
}

export function Dashboard() {
  const { event, atividades, participantes, palestrantes, presencas } = useAdmin();

  const totalInscritos    = participantes.length;
  const totalCredenciados = participantes.filter(p => p.credenciado).length;
  const totalPalestrantes = (palestrantes || []).length;
  const totalPresencas    = presencas.length;
  const aptos             = participantes.filter(p => calcPresenca(p.id, atividades, presencas, event).apto).length;

  const hoje      = new Date(); hoje.setHours(0, 0, 0, 0);
  const inicio    = new Date(event.data_inicio + "T00:00:00");
  const fim       = new Date(event.data_fim    + "T00:00:00");
  const diasRest  = Math.ceil((inicio - hoje) / (1000 * 60 * 60 * 24));
  const emAndamento = hoje >= inicio && hoje <= fim;
  const encerrado   = hoje > fim;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>

      {/* ══ 1. Card Hero ══ */}
      <div className="card-hero" style={{ display:"flex", alignItems:"center", gap:0 }}>

        {/* Evento */}
        <div style={{ flex:"0 0 auto", paddingRight:"2rem", minWidth:0 }}>
          <div className="hero-label">Evento ativo</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.5rem", fontWeight:800, color:"var(--gold-on-dark)", lineHeight:1.1, marginBottom:"0.2rem", whiteSpace:"nowrap" }}>{event.nome}</div>
          {event.subtitulo && <div style={{ fontSize:"0.75rem", color:"var(--white-low)", fontStyle:"italic", maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{event.subtitulo}</div>}
        </div>

        <div style={{ width:1, alignSelf:"stretch", background:"var(--gold-divider)", flexShrink:0 }}/>

        {/* Período */}
        <div style={{ padding:"0 1.75rem", flexShrink:0 }}>
          <div className="hero-label">Período</div>
          <div style={{ fontWeight:600, fontSize:"0.88rem", whiteSpace:"nowrap", color:"var(--white-hi)" }}>
            {formatData(event.data_inicio)} – {formatData(event.data_fim)}
          </div>
        </div>

        <div style={{ width:1, alignSelf:"stretch", background:"var(--gold-divider)", flexShrink:0 }}/>

        {/* Local */}
        <div style={{ padding:"0 1.75rem", flex:"1 1 auto", minWidth:0 }}>
          <div className="hero-label">Local</div>
          <div style={{ fontWeight:600, fontSize:"0.88rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"var(--white-hi)" }}>{event.local || "–"}</div>
        </div>

        <div style={{ width:1, alignSelf:"stretch", background:"var(--gold-divider)", flexShrink:0 }}/>

        {/* Carga horária */}
        <div style={{ padding:"0 1.75rem", flexShrink:0 }}>
          <div className="hero-label">Carga horária</div>
          <div style={{ fontWeight:600, fontSize:"0.88rem", color:"var(--white-hi)" }}>{event.carga_horaria_total || "–"}h</div>
        </div>

        <div style={{ width:1, alignSelf:"stretch", background:"var(--gold-divider)", flexShrink:0 }}/>

        {/* Inscrições */}
        <div style={{ padding:"0 1.75rem", flexShrink:0 }}>
          <div className="hero-label">Inscrições</div>
          <div style={{ fontWeight:600, fontSize:"0.82rem", whiteSpace:"nowrap", color:"var(--white-hi)" }}>
            {event.inscricao_inicio ? formatData(event.inscricao_inicio) : "–"} – {event.inscricao_fim ? formatData(event.inscricao_fim) : "–"}
          </div>
          <InscricoesBadge event={event} />
        </div>

        <div style={{ width:1, alignSelf:"stretch", background:"var(--gold-divider)", flexShrink:0 }}/>

        {/* Contador */}
        <div style={{ marginLeft:"1.75rem", flexShrink:0, textAlign:"center", background:"var(--gold-tint)", border:"1px solid var(--gold-border)", borderRadius:"var(--radius)", padding:"0.9rem 1.4rem", minWidth:90 }}>
          {encerrado ? (
            <>
              <div style={{ fontSize:"1.5rem", color:"var(--gold-on-dark)" }}>✓</div>
              <div className="hero-label" style={{ marginBottom:0, marginTop:2 }}>Encerrado</div>
            </>
          ) : emAndamento ? (
            <>
              <div style={{ fontSize:"1.5rem" }}>🎉</div>
              <div className="hero-label" style={{ marginBottom:0, marginTop:2 }}>Em andamento</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2.25rem", fontWeight:800, color:"var(--gold-on-dark)", lineHeight:1 }}>{diasRest}</div>
              <div className="hero-label" style={{ marginBottom:0, marginTop:4 }}>dias restantes</div>
            </>
          )}
        </div>

      </div>

      {/* ══ 2. 5 Métricas ══ */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"0.75rem" }}>
        {[
          { n: totalInscritos,    l: "Total de inscritos"    },
          { n: totalCredenciados, l: "Credenciados"          },
          { n: totalPalestrantes, l: "Palestrantes"          },
          { n: totalPresencas,    l: "Presenças registradas" },
          { n: aptos,             l: "Aptos ao certificado", warn: aptos === 0 },
        ].map((c, i) => (
          <div key={i} className="card-white" style={{ textAlign:"center", padding:"1.25rem 0.75rem" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2.25rem", fontWeight:800, lineHeight:1, color: c.warn ? "var(--warn)" : "var(--navy)", marginBottom:"0.4rem" }}>{c.n}</div>
            <div style={{ fontSize:"0.72rem", color:"var(--text3)", fontWeight:500, lineHeight:1.3 }}>{c.l}</div>
          </div>
        ))}
      </div>

      {/* ══ 3. Tabelas ══ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>

        <div className="card-white">
          <div style={{ fontWeight:700, fontSize:"0.88rem", color:"var(--navy)", paddingBottom:"0.75rem", borderBottom:"0.5px solid var(--border)" }}>
            Atividades mais frequentadas
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign:"left", fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text3)", fontWeight:600, padding:"0.55rem 0" }}>Atividade</th>
                <th style={{ textAlign:"right", fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text3)", fontWeight:600, padding:"0.55rem 0" }}>Presenças</th>
              </tr>
            </thead>
            <tbody>
              {[...atividades]
                .filter(a => a.tipo !== "intervalo")
                .sort((a, b) => presencas.filter(p=>p.atividade_id===b.id).length - presencas.filter(p=>p.atividade_id===a.id).length)
                .slice(0, 8)
                .map(a => {
                  const cnt = presencas.filter(p => p.atividade_id === a.id).length;
                  return (
                    <tr key={a.id} style={{ borderBottom:"0.5px solid var(--border)" }}>
                      <td style={{ padding:"0.55rem 0", fontSize:"0.85rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:180 }}>{a.titulo}</td>
                      <td style={{ padding:"0.55rem 0", textAlign:"right" }}>
                        <span style={{ background:"var(--surface2)", color:"var(--text2)", borderRadius:50, padding:"0.15rem 0.6rem", fontSize:"0.78rem", fontWeight:600 }}>{cnt}</span>
                      </td>
                    </tr>
                  );
                })}
              {atividades.filter(a => a.tipo !== "intervalo").length === 0 && (
                <tr><td colSpan={2} style={{ padding:"1rem 0", color:"var(--text3)", fontSize:"0.85rem", textAlign:"center" }}>Nenhuma atividade cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card-white">
          <div style={{ fontWeight:700, fontSize:"0.88rem", color:"var(--navy)", paddingBottom:"0.75rem", borderBottom:"0.5px solid var(--border)" }}>
            Status dos participantes
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign:"left", fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text3)", fontWeight:600, padding:"0.55rem 0" }}>Participante</th>
                <th style={{ textAlign:"center", fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text3)", fontWeight:600, padding:"0.55rem 0" }}>Presença</th>
                <th style={{ textAlign:"right", fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.07em", color:"var(--text3)", fontWeight:600, padding:"0.55rem 0" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {participantes.slice(0, 8).map(p => {
                const r = calcPresenca(p.id, atividades, presencas, event);
                return (
                  <tr key={p.id} style={{ borderBottom:"0.5px solid var(--border)" }}>
                    <td style={{ padding:"0.55rem 0", fontSize:"0.85rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:140 }}>
                      {p.nome.split(" ").slice(0, 2).join(" ")}
                    </td>
                    <td style={{ padding:"0.55rem 0", textAlign:"center", fontSize:"0.85rem", color:"var(--text2)" }}>{r.pct}%</td>
                    <td style={{ padding:"0.55rem 0", textAlign:"right" }}>
                      <span className={`badge badge-${r.apto ? "success" : "warn"}`} style={{ fontSize:"0.68rem" }}>{r.apto ? "Apto" : "Pendente"}</span>
                    </td>
                  </tr>
                );
              })}
              {participantes.length === 0 && (
                <tr><td colSpan={3} style={{ padding:"1rem 0", color:"var(--text3)", fontSize:"0.85rem", textAlign:"center" }}>Nenhum participante inscrito.</td></tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
