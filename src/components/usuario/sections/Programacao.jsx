import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMicrophone, faDownload } from "@fortawesome/free-solid-svg-icons";
import { formatData, diaSemana, TIPO_COLOR } from "../../../utils/helpers";
import { TipoBadge } from "../../base/index";
import { useUsuario } from "../UsuarioContext";

export function Programacao() {
  const { event, atividades, isPalestrante, user, palestrantes, porTurno, minasPresencas } = useUsuario();
  const [palBio, setPalBio] = useState(null);

  return (
    <div>
      {/* ── POPUP BIO PALESTRANTE ── */}
      {palBio && (
        <div onClick={() => setPalBio(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"var(--surface)", borderRadius:"var(--radius-lg)", padding:"1.75rem", maxWidth:480, width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,0.22)", position:"relative" }}>
            <button onClick={() => setPalBio(null)} style={{ position:"absolute", top:"0.75rem", right:"0.75rem", background:"none", border:"none", fontSize:"1.2rem", cursor:"pointer", color:"var(--text3)", lineHeight:1 }}>✕</button>
            <div style={{ fontWeight:700, fontSize:"1.05rem", color:"var(--navy)", marginBottom:"0.25rem" }}>{palBio.nome}</div>
            {(palBio.instituicao || palBio.cargo) && (
              <div style={{ fontSize:"0.8rem", color:"var(--text2)", marginBottom:"1rem" }}>
                {[palBio.instituicao, palBio.cargo].filter(Boolean).join(" · ")}
              </div>
            )}
            <p style={{ fontSize:"0.9rem", color:"var(--text1)", lineHeight:1.7, margin:0, whiteSpace:"pre-wrap" }}>{palBio.mini_bio}</p>
          </div>
        </div>
      )}

      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"var(--navy)", marginBottom:"1.5rem" }}>Programação do Evento</h2>
      {event.programacao_visivel === false ? (
        <div style={{ textAlign:"center", padding:"3rem 2rem", background:"var(--surface)", border:"1px dashed var(--border2)", borderRadius:"var(--radius-lg)" }}>
          <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>📅</div>
          <h3 style={{ fontWeight:700, color:"var(--navy)", marginBottom:"0.5rem" }}>Programação em breve</h3>
          <p style={{ color:"var(--text2)", fontSize:"0.92rem", lineHeight:1.75, maxWidth:400, margin:"0 auto" }}>
            A grade de atividades e horários ainda está sendo preparada. Fique atento às novidades!
          </p>
        </div>
      ) : [...new Set(atividades.map(a=>a.dia))].sort().map(dia => (
        <div key={dia} style={{ marginBottom:"1.75rem" }}>
          <div style={{ fontWeight:700, fontSize:"0.88rem", marginBottom:"0.75rem", padding:"0.5rem 1rem", background:"var(--navy)", color:"#fff", borderRadius:"var(--radius-sm)", display:"inline-flex", alignItems:"center", gap:"0.5rem" }}>
            📅 {diaSemana(dia)}, {formatData(dia)}
          </div>
          {atividades.filter(a=>a.dia===dia).sort((a,b)=>a.horario.localeCompare(b.horario)).map(a => {
            const temPres = !porTurno && minasPresencas.some(p => p.atividade_id === a.id);
            const ehMinha = isPalestrante && (a.palestrantes_ids || []).includes(user.id);
            const pals = (a.palestrantes_ids || []).map(id => palestrantes.find(p => p.id === id)).filter(Boolean);
            const mats = a.materiais || [];
            if (a.tipo==="intervalo") return (
              <div key={a.id} style={{ padding:"0.5rem 1rem", fontSize:"0.8rem", color:"var(--text3)", display:"flex", gap:"1rem", marginBottom:"0.25rem" }}>
                <span style={{ fontWeight:600 }}>{a.horario}</span><span>☕ Intervalo</span>
              </div>
            );
            return (
              <div key={a.id} className="prog-item" style={{ borderLeftColor: temPres?"var(--success)":ehMinha?"var(--teal)":(TIPO_COLOR[a.tipo]||"var(--navy)"), marginBottom:"0.5rem" }}>
                <div>
                  <div className="prog-hora">{a.horario}</div>
                  {a.horario_fim&&<div style={{ fontSize:"0.7rem",color:"var(--text3)" }}>↳{a.horario_fim}</div>}
                  <div className="prog-local">{a.local}</div>
                </div>
                <div>
                  <div style={{ marginBottom:4 }}><TipoBadge tipo={a.tipo}/></div>
                  <div className="prog-titulo">{a.titulo}</div>
                  {pals.length > 0 && (
                    <div className="prog-palestrante">
                      <FontAwesomeIcon icon={faMicrophone} style={{ marginRight:4, fontSize:"0.75rem" }} />
                      {pals.map((p,i) => (
                        <span key={p.id}>
                          {p.mini_bio ? (
                            <button onClick={() => setPalBio(p)} title="Ver mini biografia" style={{ background:"none", border:"none", padding:0, cursor:"pointer", color:"inherit", font:"inherit", fontWeight:"inherit", textDecoration:"underline dotted", textUnderlineOffset:2, textAlign:"left" }}>
                              {p.nome}
                            </button>
                          ) : p.nome}
                          {pals[i+1] ? <span style={{ color:"var(--border2)" }}> · </span> : ""}
                          {(p.cargo || p.instituicao) && (
                            <span style={{ display:"block", fontSize:"0.72rem", color:"var(--text2)", fontWeight:400, marginTop:1 }}>
                              {[p.instituicao, p.cargo].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  {ehMinha && <span className="badge badge-teal" style={{ marginTop:4, display:"inline-flex" }}>✓ Sua palestra</span>}
                  {temPres && <span className="badge badge-success" style={{ marginTop:4, display:"inline-flex" }}>✓ Presença confirmada</span>}
                  {mats.length > 0 && (
                    <div style={{ marginTop:6, display:"flex", flexWrap:"wrap", gap:4 }}>
                      {mats.map(m => (
                        <a key={m.id} href={m.url} target="_blank" rel="noreferrer"
                          style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"0.18rem 0.55rem", background:"rgba(29,106,106,0.1)", border:"1px solid rgba(29,106,106,0.3)", borderRadius:4, fontSize:"0.7rem", color:"var(--teal)", fontWeight:600, textDecoration:"none" }}>
                          <FontAwesomeIcon icon={faDownload} />{m.nome}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  {a.carga_horaria>0&&<span className="prog-ch">{a.carga_horaria}h</span>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
