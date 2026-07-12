import { useState } from "react";
import enaudinMapa from "../../assets/enaudin-mapa.png";
import { FAQ_ITEMS } from "../../data/initial";
import { TIPO_COLOR } from "../../utils/helpers";
import { formatData, formatPeriodo, diaSemana } from "../../utils/helpers";
import { TipoBadge } from "../base/index";

function inscricoesAbertas(event) {
  const hoje = new Date().toISOString().split("T")[0];
  if (!event.inscricao_inicio && !event.inscricao_fim) return { aberta: true };
  if (event.inscricao_inicio && hoje < event.inscricao_inicio)
    return { aberta: false, msg: `Inscrições abertas a partir de ${formatData(event.inscricao_inicio)}` };
  if (event.inscricao_fim && hoje > event.inscricao_fim)
    return { aberta: false, msg: "Inscrições encerradas" };
  return { aberta: true };
}

const isLightTheme = (event) =>
  event?.tema?.preset === "cinza" ||
  event?.tema?.preset === "verde_claro" ||
  (event?.tema?.preset === "custom" && event?.tema?.mode === "light");

export function LandingPage({ event, eventLoaded = false, atividades, palestrantes, instituicoes, onInscricaoClick, onLoginClick, user }) {
  const [diaSelecionado, setDiaAtivo] = useState(null);
  const [faqAberto, setFaqAberto] = useState(null);
  const [palPopup, setPalPopup] = useState(null);
  const inscStatus = inscricoesAbertas(event);

  const dias = [...new Set(atividades.map(a => a.dia))].sort();
  // Derivado: primeiro dia por padrão (funciona mesmo com atividades chegando depois)
  const diaAtivo = diaSelecionado ?? dias[0] ?? null;
  const atividadesDia = atividades.filter(a => a.dia === diaAtivo).sort((a,b) => a.horario.localeCompare(b.horario));

  return (
    <div>
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-logo">
          {event.nome}
        </div>
        <div className="navbar-nav">
          <a href="#sobre" className="navbar-link">Sobre</a>
          <a href="#programacao" className="navbar-link">Programação</a>
          <a href="#palestrantes" className="navbar-link">Palestrantes</a>
          <a href="#realizacao" className="navbar-link">Realização</a>
          <a href="#local" className="navbar-link">Local</a>
          <button className="btn-inscricao btn-login-mobile" onClick={onLoginClick} style={{ background: "var(--teal)", color: "#fff" }}>{user ? "Minha Área" : "Login"}</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="home">
        <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:860, margin:"0 auto" }}>
          {!eventLoaded ? (
            /* Skeleton enquanto os dados do Supabase chegam */
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"1.1rem" }}>
              <div style={{ width:320, height:120, borderRadius:12, background:"rgba(255,255,255,0.08)", animation:"heroPulse 1.4s ease-in-out infinite" }} />
              <div style={{ width:440, height:22, borderRadius:8, background:"rgba(255,255,255,0.06)", animation:"heroPulse 1.4s ease-in-out .2s infinite" }} />
              <div style={{ width:260, height:42, borderRadius:8, background:"rgba(201,168,76,0.15)", animation:"heroPulse 1.4s ease-in-out .4s infinite" }} />
              <div style={{ width:180, height:18, borderRadius:8, background:"rgba(255,255,255,0.06)", animation:"heroPulse 1.4s ease-in-out .6s infinite" }} />
              <div style={{ display:"flex", gap:"1rem", marginTop:"0.5rem" }}>
                <div style={{ width:180, height:46, borderRadius:50, background:"rgba(201,168,76,0.2)", animation:"heroPulse 1.4s ease-in-out .8s infinite" }} />
                <div style={{ width:150, height:46, borderRadius:50, background:"rgba(255,255,255,0.06)", animation:"heroPulse 1.4s ease-in-out 1s infinite" }} />
              </div>
            </div>
          ) : (
            <>
              {event.logo_url ? (
                <div className="hero-anim hero-anim-1" style={{ marginBottom:"1.25rem" }}>
                  <img src={event.logo_url} alt={event.nome} className="hero-logo-float"
                    style={{ width:"100%", maxHeight:200, maxWidth:560, objectFit:"contain", filter: isLightTheme(event) ? "none" : "drop-shadow(0 2px 16px rgba(0,0,0,0.4))" }} />
                </div>
              ) : (
                <div className="hero-anim hero-anim-1">
                  <h1 style={{ fontSize:"clamp(2.8rem,7vw,5rem)", marginBottom:"0.5rem" }}>
                    <em>{event.nome}</em>
                  </h1>
                  {event.nome_completo && (
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(0.9rem,2vw,1.1rem)", color:"var(--hero-subtext)", marginBottom:"1.25rem", lineHeight:1.6, maxWidth:680, margin:"0 auto 1.25rem" }}>
                      {event.nome_completo}
                    </div>
                  )}
                </div>
              )}
              <div className="hero-anim hero-anim-2" style={{ background:"var(--hero-quote-bg)", border:"1px solid var(--hero-quote-border)", color:"var(--hero-quote-color)", padding:"0.65rem 1.4rem", borderRadius:"var(--radius-sm)", fontSize:"clamp(0.88rem,2vw,1rem)", fontStyle:"italic", marginBottom:"1.75rem", lineHeight:1.6, maxWidth:640, margin:"0 auto 1.75rem" }}>
                {event.subtitulo}
              </div>
              <div className="hero-anim hero-anim-3 hero-date-glow" style={{ fontSize:"clamp(1.4rem,5vw,3rem)", color:"var(--color-primary)", fontWeight:700, marginBottom:"0.75rem", lineHeight:1.2, textTransform:"uppercase", letterSpacing:"0.04em" }}>
                {formatPeriodo(event.data_inicio, event.data_fim)}{event.data_fim ? ` · ${event.data_fim.split("-")[0]}` : event.data_inicio ? ` · ${event.data_inicio.split("-")[0]}` : ""}
              </div>
              <div className="hero-meta hero-anim hero-anim-4" style={{ marginBottom:"2.5rem" }}>
                <div className="hero-meta-item"><div className="hero-meta-icon">📍</div><span style={{ fontSize:"1.05rem" }}>{event.local}</span></div>
              </div>
              <div className="hero-btns hero-anim hero-anim-5">
                <a href="#programacao" className="btn-hero-outline">Ver Programação</a>
                {inscStatus.aberta
                  ? <button className="btn-hero-primary" onClick={onInscricaoClick}>Realizar Inscrição</button>
                  : <div className="btn-hero-disabled">{inscStatus.msg}</div>
                }
              </div>
            </>
          )}
        </div>
      </section>

      {/* SOBRE */}
      <section className="section" data-section="accent" id="sobre">
        <div className="container">
          <div className="sobre-grid">
            <div>
              <div style={{ color: "var(--sec3-text-soft)", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>Sobre o Evento</div>
              <p style={{ color: "var(--sec3-text-soft)", lineHeight: 1.85, marginBottom: "1.25rem", whiteSpace: "pre-wrap", textAlign: "justify" }}>{event.descricao}</p>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
              <img
                src={enaudinMapa}
                alt="Mapa do evento"
                style={{ width:"100%", maxWidth:480, objectFit:"contain", alignSelf:"stretch" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* PROGRAMAÇÃO */}
      {eventLoaded && <section className="section section-alt" id="programacao">
        <div className="container">
          {event.programacao_visivel === false ? (
            /* ── Em breve ── */
            <div style={{ textAlign:"center" }}>
              <div className="section-header centered">
                <div style={{ color:"var(--section-label)", fontSize:"0.8rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"0.5rem" }}>Agenda</div>
                <h2 className="section-title">Programação</h2>
              </div>
              <span style={{ display:"inline-block", background:"var(--gold-tint)", color:"var(--teal)", border:"1px solid var(--gold-border)", borderRadius:50, padding:"0.3rem 1rem", fontSize:"0.75rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"1.5rem" }}>
                Em breve
              </span>
              <h3 style={{ fontSize:"1.4rem", color:"var(--text)", fontWeight:600, marginBottom:"0.75rem", lineHeight:1.4 }}>
                A programação está sendo preparada
              </h3>
              <p style={{ color:"var(--text2)", fontSize:"0.92rem", lineHeight:1.75, maxWidth:480, margin:"0 auto" }}>
                A grade de atividades, palestrantes e horários será divulgada em breve. Fique atento às atualizações!
              </p>
            </div>
          ) : (
            /* ── Programação normal ── */
            <>
              <div className="section-header centered">
                <div style={{ color:"var(--section-label)", fontSize:"0.8rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"0.5rem" }}>Agenda</div>
                <h2 className="section-title">Programação do Evento</h2>
                <p className="section-sub">Clique no dia para ver as atividades</p>
              </div>
              <div className="prog-dias">
                {dias.map(d => (
                  <button key={d} className={`prog-dia-btn${diaAtivo === d ? " active" : ""}`} onClick={() => setDiaAtivo(d)}>
                    {diaSemana(d)}, {formatData(d)}
                  </button>
                ))}
              </div>
              {atividadesDia.map(a => {
                const pals = (a.palestrantes_ids || []).map(id => palestrantes.find(p => p.id === id)).filter(Boolean);
                const isIntervalo = a.tipo === "intervalo";
                if (isIntervalo) return (
                  <div key={a.id} style={{ display:"flex", alignItems:"center", gap:"1rem", padding:"0.6rem 1rem", margin:"0.4rem 0", background:"var(--surface2)", borderRadius:"var(--radius-sm)" }}>
                    <div style={{ fontSize:"0.82rem", fontWeight:700, color:"var(--text2)", whiteSpace:"nowrap", flexShrink:0 }}>{a.horario} – {a.horario_fim}</div>
                    <span style={{ fontSize:"0.8rem", color:"var(--text2)" }}>☕ Intervalo</span>
                  </div>
                );
                return (
                  <div key={a.id} className="prog-item" style={{ borderLeftColor: TIPO_COLOR[a.tipo] || "var(--navy)", gridTemplateColumns:"130px 1fr" }}>
                    <div>
                      <div className="prog-hora">{a.horario}</div>
                      <div className="prog-local" style={{ marginTop: 4 }}>{a.local}</div>
                    </div>
                    <div>
                      <div style={{ marginBottom:6 }}><TipoBadge tipo={a.tipo} /></div>
                      <div className="prog-titulo">{a.titulo}</div>
                      {a.descricao && <div className="prog-desc">{a.descricao}</div>}
                      {(pals.length > 0 || (a.convidados && a.convidados.trim())) && (
                        <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:3 }}>
                          {pals.map(p => (
                            <div key={p.id} style={{ fontSize:"0.8rem", color:"var(--text2)" }}>
                              👤{" "}
                              <span
                                onClick={() => setPalPopup(p)}
                                style={{ fontWeight:600, color:"var(--teal)", cursor:"pointer", textDecoration:"underline", textUnderlineOffset:2 }}
                              >{p.nome}</span>
                              {p.instituicao && <span> – {p.instituicao}</span>}
                            </div>
                          ))}
                          {a.convidados && a.convidados.trim() && a.convidados.split("\n").filter(Boolean).map((c,i) => (
                            <div key={i} style={{ fontSize:"0.8rem", color:"var(--text2)" }}>👤 {c}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>}

      {/* PALESTRANTES */}
      <section className="section" data-section="accent" id="palestrantes">
        <div className="container">
          {event.palestrantes_visivel === false || palestrantes.filter(p => p.destaque).length === 0 ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ color: "var(--sec3-text-soft)", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Convidados</div>
              <h2 className="section-title" style={{ marginBottom:"0.5rem" }}>Palestrantes</h2>
              <span style={{ display:"inline-block", background:"rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.90)", border:"1px solid rgba(255,255,255,0.40)", borderRadius:50, padding:"0.3rem 1rem", fontSize:"0.75rem", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"1.5rem" }}>
                Em breve
              </span>
              {event.palestrantes_subtitulo && (
                <p style={{ color:"rgba(255,255,255,0.75)", fontSize:"0.92rem", lineHeight:1.75, maxWidth:480, margin:"0 auto" }}>
                  {event.palestrantes_subtitulo}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="section-header centered">
                <div style={{ color: "var(--sec3-text-soft)", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Convidados</div>
                <h2 className="section-title">Palestrantes</h2>
                {event.palestrantes_subtitulo && <p className="section-sub">{event.palestrantes_subtitulo}</p>}
              </div>
            <div className="palestrantes-grid">
              {palestrantes.filter(p => p.destaque).map(p => (
                <div key={p.id} className="palestrante-card">
                  {p.foto_url
                    ? <img src={p.foto_url} alt={p.nome} className="palestrante-avatar" style={{ objectFit:"cover", fontSize:0 }} />
                    : <div className="palestrante-avatar">{p.foto_iniciais}</div>
                  }
                  <div className="palestrante-nome">{p.nome}</div>
                  <div className="palestrante-titulo">{p.cargo}</div>
                  {p.instituicao && <div style={{ fontSize:"0.78rem", color:"var(--text3)", marginBottom:"0.4rem" }}>{p.instituicao}</div>}
                  {p.mini_bio && (
                    <p style={{ fontSize:"0.78rem", color:"var(--text2)", marginTop:"0.6rem", lineHeight:1.5 }}>
                      {p.mini_bio.length > 120 ? (
                        <>
                          {p.mini_bio.slice(0, 120).trimEnd()}…{" "}
                          <span
                            onClick={() => setPalPopup(p)}
                            style={{ color:"var(--teal)", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}
                          >
                            ver mais
                          </span>
                        </>
                      ) : p.mini_bio}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {palPopup && (
              <div
                onClick={() => setPalPopup(null)}
                style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{ background:"var(--surface)", borderRadius:"var(--radius)", padding:"2rem", maxWidth:480, width:"100%", boxShadow:"0 8px 40px rgba(0,0,0,0.3)", position:"relative" }}
                >
                  <button
                    onClick={() => setPalPopup(null)}
                    style={{ position:"absolute", top:"0.75rem", right:"0.75rem", background:"none", border:"none", fontSize:"1.2rem", cursor:"pointer", color:"var(--text2)", lineHeight:1 }}
                  >✕</button>
                  <div style={{ display:"flex", alignItems:"center", gap:"1rem", marginBottom:"1rem" }}>
                    {palPopup.foto_url
                      ? <img src={palPopup.foto_url} alt={palPopup.nome} style={{ width:56, height:56, borderRadius:"50%", objectFit:"cover" }} />
                      : <div style={{ width:56, height:56, borderRadius:"50%", background:"var(--navy)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:"1rem" }}>{palPopup.foto_iniciais}</div>
                    }
                    <div>
                      <div style={{ fontWeight:700, color:"var(--text)", fontSize:"1rem" }}>{palPopup.nome}</div>
                      {palPopup.cargo && <div style={{ fontSize:"0.8rem", color:"var(--text2)" }}>{palPopup.cargo}</div>}
                      {palPopup.instituicao && (() => {
                        const inst = (instituicoes || []).find(i => i.sigla === palPopup.instituicao);
                        return (
                          <div style={{ fontSize:"0.78rem", color:"var(--text3)" }}>
                            {inst ? `${inst.sigla} – ${inst.nome}` : palPopup.instituicao}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <p style={{ fontSize:"0.88rem", color:"var(--text2)", lineHeight:1.7, margin:0 }}>{palPopup.mini_bio}</p>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </section>

      {/* REALIZAÇÃO */}
      {(() => {
        const realizadoras = [...(instituicoes || [])]
          .filter(i => i.realizadora && i.ativo)
          .sort((a, b) => (a.ordem ?? 9999) - (b.ordem ?? 9999));
        const items = realizadoras.length > 0
          ? realizadoras
          : (event.realizacao || "").split(",").filter(Boolean).map((r, i) => ({ _text: r, id: i }));
        if (!items.length) return null;
        return (
          <section className="section" id="realizacao">
            <div className="container">
              <div className="section-header centered">
                <div style={{ color: "var(--section-label)", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Instituições</div>
                <h2 className="section-title">Realização</h2>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"1rem", maxWidth:900, margin:"0 auto" }}>
                {items.map((item) => {
                  if (item._text) {
                    const r = item._text;
                    return (
                      <div key={item.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"1.5rem", textAlign:"center", boxShadow:"var(--shadow)", flex:"1 1 180px", maxWidth:240 }}>
                        <div style={{ fontSize:"2rem", marginBottom:"0.5rem" }}>🏛</div>
                        <div style={{ fontWeight:700, color:"var(--navy)", fontSize:"0.95rem" }}>{r.trim().split("(")[0].trim()}</div>
                        {r.includes("(") && <div style={{ fontSize:"0.78rem", color:"var(--text3)", marginTop:"0.25rem" }}>({r.split("(")[1].replace(")","").trim()})</div>}
                      </div>
                    );
                  }
                  return (
                    <div key={item.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"1.5rem", textAlign:"center", boxShadow:"var(--shadow)", flex:"1 1 180px", maxWidth:240, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"0.5rem" }}>
                      {item.logo_url ? (
                        <img src={item.logo_url} alt={item.sigla} style={{ height:80, maxWidth:"100%", objectFit:"contain" }} />
                      ) : (
                        <>
                          <div style={{ fontSize:"2rem" }}>🏛</div>
                          <div style={{ fontWeight:700, color:"var(--navy)", fontSize:"0.95rem" }}>{item.sigla}</div>
                          <div style={{ fontSize:"0.78rem", color:"var(--text3)", lineHeight:1.4 }}>{item.nome}</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })()}

      {/* LOCAL */}
      <section className="section" data-section="accent" id="local">
        <div className="container">
          <div className="section-header centered">
            <div style={{ color: "var(--sec3-text-soft)", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Onde será</div>
            <h2 className="section-title">Local do Evento</h2>
          </div>
          <div className="local-card">
            <div className="local-map" style={{ padding: 0, overflow: "hidden", borderRadius: "var(--radius)" }}>
              <iframe
                title="Localização do evento"
                width="100%"
                height="100%"
                style={{ border: 0, display: "block", minHeight: 220 }}
                loading="lazy"
                allowFullScreen
                src={`https://www.google.com/maps?q=${encodeURIComponent(event.endereco || event.local)}&output=embed`}
              />
            </div>
            <div className="local-info">
              <h3>{event.local}</h3>
              <div className="local-detail">
                <div className="local-icon">📍</div>
                <p style={{ color: "var(--text2)", fontSize: "0.9rem", lineHeight: 1.6 }}>{event.endereco}</p>
              </div>
              <div className="local-detail">
                <div className="local-icon">📅</div>
                <p style={{ color: "var(--text2)", fontSize: "0.9rem" }}>{formatData(event.data_inicio)} a {formatData(event.data_fim)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section section-alt" id="faq">
        <div className="container" style={{ maxWidth: 740 }}>
          <div className="section-header centered">
            <div style={{ color: "var(--section-label)", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Dúvidas</div>
            <h2 className="section-title">Perguntas Frequentes</h2>
          </div>
          {FAQ_ITEMS.map((f, i) => (
            <div key={i} className="faq-item">
              <div className="faq-q" onClick={() => setFaqAberto(faqAberto === i ? null : i)}>
                {f.q}
                <span style={{ fontSize: "1.2rem", color: "var(--teal)", transform: faqAberto === i ? "rotate(45deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>+</span>
              </div>
              {faqAberto === i && <div className="faq-a">{f.r}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "var(--navy)", padding: "4rem 2rem", textAlign: "center" }}>
        <div className="container">
          <h2 style={{ fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 700, color: "#fff", marginBottom: "0.75rem" }}>
            Garanta sua inscrição
          </h2>
          <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: "2rem", fontSize: "1rem" }}>
            Evento gratuito · {formatData(event.data_inicio)} a {formatData(event.data_fim)} · {event.local}
          </p>
          {inscStatus.aberta
            ? <button className="btn btn-gold btn-lg" onClick={onInscricaoClick}>Realizar Inscrição</button>
            : <div style={{ display:"inline-block", background:"rgba(255,255,255,0.12)", border:"1.5px solid rgba(255,255,255,0.30)", color:"rgba(255,255,255,0.70)", padding:"0.9rem 2.5rem", borderRadius:50, fontSize:"1rem", fontWeight:600 }}>{inscStatus.msg}</div>
          }
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "var(--navy-dark)", color: "rgba(255,255,255,0.5)", padding: "2rem", textAlign: "center", fontSize: "0.82rem" }}>
        <div style={{ fontWeight:600, fontSize:"1.1rem", color:"#ffffff", marginBottom:"0.5rem" }}>{event.nome}</div>
        <div>{event.nome_completo}</div>
      </footer>
    </div>
  );
}
