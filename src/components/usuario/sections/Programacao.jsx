import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMicrophone, faDownload } from "@fortawesome/free-solid-svg-icons";
import { TIPO_COLOR, nomeExibicao } from "../../../utils/helpers";
import { TipoBadge } from "../../base/index";
import { useUsuario } from "../UsuarioContext";

export function Programacao() {
  const { event, atividades, isPalestrante, user, palestrantes, porTurno, minasPresencas } = useUsuario();
  const [palBio, setPalBio] = useState(null);
  const [diaAtivo, setDiaAtivo] = useState(null);

  const dias = [...new Set(atividades.map(a => a.dia))].sort();
  const diaSelecionado = diaAtivo && dias.includes(diaAtivo) ? diaAtivo : dias[0];

  return (
    <div>
      {/* ── POPUP BIO PALESTRANTE ── */}
      {palBio && (
        <div onClick={() => setPalBio(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"var(--surface)", borderRadius:"var(--radius-lg)", padding:"1.75rem", maxWidth:480, width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,0.22)", position:"relative" }}>
            <button onClick={() => setPalBio(null)} style={{ position:"absolute", top:"0.75rem", right:"0.75rem", background:"none", border:"none", fontSize:"1.2rem", cursor:"pointer", color:"var(--text3)", lineHeight:1 }}>✕</button>
            <div style={{ fontWeight:700, fontSize:"1.05rem", color:"var(--navy)", marginBottom:"0.25rem" }}>{nomeExibicao(palBio)}</div>
            {(palBio.instituicao || palBio.cargo) && (
              <div style={{ fontSize:"0.8rem", color:"var(--text2)", marginBottom:"1rem" }}>
                {[palBio.instituicao, palBio.cargo].filter(Boolean).join(" · ")}
              </div>
            )}
            <p style={{ fontSize:"0.9rem", color:"var(--text1)", lineHeight:1.7, margin:0, whiteSpace:"pre-wrap" }}>{palBio.mini_bio}</p>
          </div>
        </div>
      )}

      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"var(--navy)", marginBottom:"0.25rem" }}>Programação do Evento</h2>
      {event.local && <div style={{ fontSize:"0.85rem", color:"var(--text3)", marginBottom:"1.25rem" }}>📍 {event.local}</div>}

      {event.programacao_visivel === false ? (
        <div style={{ textAlign:"center", padding:"3rem 2rem", background:"var(--surface)", border:"1px dashed var(--border2)", borderRadius:"var(--radius-lg)" }}>
          <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>📅</div>
          <h3 style={{ fontWeight:700, color:"var(--navy)", marginBottom:"0.5rem" }}>Programação em breve</h3>
          <p style={{ color:"var(--text2)", fontSize:"0.92rem", lineHeight:1.75, maxWidth:400, margin:"0 auto" }}>
            A grade de atividades e horários ainda está sendo preparada. Fique atento às novidades!
          </p>
        </div>
      ) : (
        <>
          {/* ── SELETOR DE DIA — sempre no topo, clicável ── */}
          {dias.length > 1 && (
            <div className="prog-dias">
              {dias.map(dia => (
                <button key={dia} type="button" className={`prog-dia-btn${dia === diaSelecionado ? " active" : ""}`} onClick={() => setDiaAtivo(dia)}>
                  {dia.split("-").slice(1).reverse().join("/")}
                </button>
              ))}
            </div>
          )}

          {atividades.filter(a => a.dia === diaSelecionado).sort((a,b) => a.horario.localeCompare(b.horario)).map(a => {
            const temPres = !porTurno && minasPresencas.some(p => p.atividade_id === a.id);
            const ehMinha = isPalestrante && (a.palestrantes_ids || []).includes(user.id);
            const pals = (a.palestrantes_ids || []).map(id => palestrantes.find(p => p.id === id)).filter(Boolean);
            const mats = a.materiais || [];

            if (a.tipo === "intervalo") return (
              <div key={a.id} style={{ padding:"0.5rem 1rem", fontSize:"0.8rem", color:"var(--text3)", display:"flex", gap:"1rem", marginBottom:"0.25rem" }}>
                <span style={{ fontWeight:600 }}>{a.horario}</span><span>☕ Intervalo</span>
              </div>
            );

            return (
              <div key={a.id} className="pgrid-card" style={{ borderLeftColor: temPres ? "var(--success)" : ehMinha ? "var(--teal)" : (TIPO_COLOR[a.tipo] || "var(--navy)") }}>
                {/* Horário início/fim + tipo */}
                <div className="pgrid-top">
                  <span>⏱ {a.horario}{a.horario_fim ? `–${a.horario_fim}` : ""}</span>
                  <TipoBadge tipo={a.tipo}/>
                </div>

                {/* Tema */}
                <div className="pgrid-titulo-row">
                  <span className="pgrid-titulo">{a.titulo}</span>
                </div>

                {/* Palestrante(s) e órgão */}
                {pals.length > 0 && (
                  <div className="pgrid-palestrante">
                    <FontAwesomeIcon icon={faMicrophone} style={{ marginRight:4, fontSize:"0.7rem" }} />
                    {pals.map((p, i) => (
                      <span key={p.id}>
                        {p.mini_bio ? (
                          <button onClick={() => setPalBio(p)} title="Ver mini biografia" style={{ background:"none", border:"none", padding:0, cursor:"pointer", color:"inherit", font:"inherit", fontWeight:"inherit", textDecoration:"underline dotted", textUnderlineOffset:2 }}>
                            {nomeExibicao(p)}
                          </button>
                        ) : nomeExibicao(p)}
                        {p.instituicao && <span style={{ color:"var(--text3)", fontWeight:400 }}> — {p.instituicao}</span>}
                        {pals[i+1] ? <span style={{ color:"var(--border2)" }}> · </span> : ""}
                      </span>
                    ))}
                  </div>
                )}

                {(ehMinha || temPres) && (
                  <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
                    {ehMinha && <span className="badge badge-teal">✓ Sua palestra</span>}
                    {temPres && <span className="badge badge-success">✓ Presença confirmada</span>}
                  </div>
                )}

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
            );
          })}
        </>
      )}
    </div>
  );
}
