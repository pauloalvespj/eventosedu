import { formatData, diaSemana, TIPO_COLOR } from "../../../utils/helpers";
import { ProgressBar, TipoBadge, AvaliacaoWidget } from "../../base/index";
import { useUsuario } from "../UsuarioContext";

export function Presencas() {
  const {
    event, atividades, turnos, isPalestrante, porTurno, presencaCalc,
    minasPresencas, minhasPresencasTurno, user, avaliacoes, setAvaliacoes, pontuacoes, setPontuacoes,
  } = useUsuario();

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem", flexWrap:"wrap", gap:"0.5rem" }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"var(--navy)" }}>Minhas Presenças</h2>
        <div style={{ display:"flex", gap:"0.5rem" }}>
          <span className="badge badge-navy">{(porTurno ? minhasPresencasTurno.length : minasPresencas.length)} registros</span>
          <span className="badge badge-teal">{presencaCalc.chCumprida}h</span>
        </div>
      </div>
      {(porTurno ? minhasPresencasTurno.length===0 : minasPresencas.length===0) ? (
        <div style={{ textAlign:"center", padding:"3rem", color:"var(--text2)", background:"var(--surface)", borderRadius:"var(--radius)", border:"1px dashed var(--border2)" }}>
          <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>📋</div>
          <p style={{ fontWeight:600, marginBottom:"0.5rem" }}>Nenhuma presença registrada</p>
          <p style={{ fontSize:"0.85rem" }}>{porTurno ? "Use o QR Code exibido em cada turno." : "Use o QR Code exibido em cada atividade."}</p>
        </div>
      ) : porTurno ? (
        <>
          <div style={{ marginBottom:"1.25rem" }}><ProgressBar pct={presencaCalc.pct} minimo={event.percentual_minimo}/></div>
          {minhasPresencasTurno.map(p => {
            const t = turnos.find(x=>x.id===p.turno_id);
            if (!t) return null;
            return (
              <div key={p.id} className="presenca-card" style={{ borderLeft:"4px solid var(--navy)" }}>
                <div className="presenca-header">
                  <div>
                    <div className="presenca-atividade">{t.nome}</div>
                    <div style={{ fontSize:"0.8rem",color:"var(--text2)",marginTop:3 }}>
                      {diaSemana(t.dia)}, {formatData(t.dia)}{t.horario_inicio ? ` · ${t.horario_inicio}${t.horario_fim ? `–${t.horario_fim}` : ""}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <span className="badge badge-success">✓</span>
                    {t.carga_horaria>0&&<div style={{ fontSize:"0.78rem",color:"var(--text3)",marginTop:4 }}>{t.carga_horaria}h</div>}
                  </div>
                </div>
                <div style={{ fontSize:"0.78rem",color:"var(--text3)",marginTop:"0.5rem",display:"flex",gap:"1.5rem",flexWrap:"wrap" }}>
                  <span>🕐 {p.data_hora}</span>
                  {t.conta_certificado&&<span style={{ color:"var(--teal)",fontWeight:600 }}>✓ Conta p/ certificado</span>}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <>
          <div style={{ marginBottom:"1.25rem" }}><ProgressBar pct={presencaCalc.pct} minimo={event.percentual_minimo}/></div>
          {minasPresencas.map(p => {
            const at = atividades.find(a=>a.id===p.atividade_id);
            if (!at) return null;
            const podeAvaliar = !isPalestrante && at.tipo !== "intervalo" && at.tipo !== "encerramento";
            return (
              <div key={p.id} className="presenca-card" style={{ borderLeft:`4px solid ${TIPO_COLOR[at.tipo]||"var(--navy)"}` }}>
                <div className="presenca-header">
                  <div>
                    <div style={{ marginBottom:4 }}><TipoBadge tipo={at.tipo}/></div>
                    <div className="presenca-atividade">{at.titulo}</div>
                    <div style={{ fontSize:"0.8rem",color:"var(--text2)",marginTop:3 }}>{diaSemana(at.dia)}, {formatData(at.dia)} · {at.horario} · {at.local}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <span className="badge badge-success">✓</span>
                    {at.carga_horaria>0&&<div style={{ fontSize:"0.78rem",color:"var(--text3)",marginTop:4 }}>{at.carga_horaria}h</div>}
                  </div>
                </div>
                <div style={{ fontSize:"0.78rem",color:"var(--text3)",marginTop:"0.5rem",display:"flex",gap:"1.5rem",flexWrap:"wrap" }}>
                  <span>🕐 {p.data_hora}</span>
                  {at.conta_certificado&&<span style={{ color:"var(--teal)",fontWeight:600 }}>✓ Conta p/ certificado</span>}
                </div>
                {podeAvaliar && (
                  <AvaliacaoWidget
                    atividadeId={at.id}
                    participanteId={user.id}
                    avaliacoes={avaliacoes}
                    setAvaliacoes={setAvaliacoes}
                    pontuacoes={pontuacoes}
                    setPontuacoes={setPontuacoes}
                  />
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
