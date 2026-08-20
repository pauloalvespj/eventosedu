import { useNavigate } from "react-router-dom";
import { calcPontos, getUserId, formatData, diaSemana, faltamDiasLabel, TIPO_COLOR } from "../../../utils/helpers";
import { QRCodeCanvas, AvatarUpload, IconEdit, TipoBadge } from "../../base/index";
import { useUsuario } from "../UsuarioContext";

export function Dashboard() {
  const {
    user, setUser, event, atividades, palestrantes, participantes, admins, pontuacoes,
    isPalestrante, uid, meusPts, nivel, minasPresencas, minhasPresencasTurno, porTurno, presencaCalc,
    podeResponderPesquisa, respondeuPesquisa, minhasPalestras, presencas,
    perfilIncompleto,
  } = useUsuario();
  const navigate = useNavigate();

  const bioFaltando = isPalestrante && !user.mini_bio;

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const hojeISO = hoje.toISOString().slice(0, 10);
  const inicio = new Date(event.data_inicio + "T00:00:00");
  const fim    = new Date(event.data_fim    + "T00:00:00");
  const diasFaltam = Math.ceil((inicio - hoje) / 86400000);
  const emAndamento = hoje >= inicio && hoje <= fim;
  const encerrado   = hoje > fim;

  const proximasAtividades = atividades
    .filter(a => a.tipo !== "intervalo" && a.dia >= hojeISO)
    .slice()
    .sort((a,b) => (a.dia||"").localeCompare(b.dia||"") || (a.horario||"").localeCompare(b.horario||""))
    .slice(0, 4);

  const rankingTodos = [...participantes, ...palestrantes, ...admins]
    .map(p => ({ id: getUserId(p), pts: calcPontos(getUserId(p), pontuacoes) }))
    .sort((a, b) => b.pts - a.pts);
  const posicao = (rankingTodos.findIndex(p => p.id === uid) + 1) || rankingTodos.length;

  return (
    <div>
      {/* Card do Evento + Meus Dados — comum a participante e palestrante.
          Evento vem primeiro no DOM para aparecer no topo quando empilha no mobile. */}
      <div className="dash-top-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1rem" }}>
        {/* Card do Evento */}
        <div className="dash-event-card" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"1.5rem", textAlign:"center" }}>
          {event.logo_url ? (
            <>
              <img src={event.logo_url} alt={event.nome} style={{ maxHeight:56, maxWidth:"70%", objectFit:"contain", margin:"0 auto 0.85rem", display:"block" }} />
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.15rem", fontWeight:800, color:"var(--navy)", lineHeight:1.25, marginBottom:"0.25rem" }}>{event.nome_completo || event.nome}</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", fontWeight:800, color:"var(--navy)", lineHeight:1.15, marginBottom:"0.25rem" }}>{event.nome}</div>
              {event.nome_completo && event.nome_completo !== event.nome && (
                <div style={{ fontSize:"0.85rem", color:"var(--text2)", marginBottom:"0.2rem" }}>{event.nome_completo}</div>
              )}
            </>
          )}
          {event.subtitulo && (
            <div style={{ fontSize:"0.8rem", color:"var(--text3)", fontStyle:"italic", marginBottom:"0.6rem" }}>{event.subtitulo}</div>
          )}
          <div style={{ display:"flex", gap:"1.25rem", flexWrap:"wrap", justifyContent:"center", marginBottom:"0.85rem" }}>
            <span style={{ fontSize:"0.8rem", color:"var(--text3)" }}>📅 <strong style={{ color:"var(--text2)" }}>{formatData(event.data_inicio)}{event.data_fim !== event.data_inicio ? ` – ${formatData(event.data_fim)}` : ""}</strong></span>
            <span style={{ fontSize:"0.8rem", color:"var(--text3)" }}>📍 {event.local}</span>
          </div>
          <div className="dash-countdown" style={{ display:"inline-flex", alignItems:"center", gap:"0.5rem", background:"var(--gold-tint)", border:"1.5px solid var(--gold-border)", borderRadius:"var(--radius)", padding:"0.5rem 1.1rem" }}>
            {encerrado ? (
              <>
                <span style={{ fontSize:"1.1rem" }}>✓</span>
                <span style={{ fontSize:"0.72rem", color:"var(--text2)", textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 }}>Evento encerrado</span>
              </>
            ) : emAndamento ? (
              <>
                <span style={{ fontSize:"1.2rem" }}>🎉</span>
                <span style={{ fontSize:"0.72rem", color:"var(--text2)", textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 }}>Evento em andamento</span>
              </>
            ) : (
              <>
                <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.5rem", fontWeight:800, color:"var(--gold)" }}>{diasFaltam}</span>
                <span style={{ fontSize:"0.72rem", color:"var(--text2)", textTransform:"uppercase", letterSpacing:"0.05em" }}>dia{diasFaltam!==1?"s":""} para o evento</span>
              </>
            )}
          </div>
          {event.gamificacao_ativa !== false && (
            <div style={{ marginTop:"0.85rem", paddingTop:"0.85rem", borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem" }}>
              <span style={{ fontSize:"1.1rem" }}>{nivel.icon}</span>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700, color:"var(--gold)" }}>{meusPts} pts</span>
            </div>
          )}
        </div>

        {/* Meus Dados */}
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"1.5rem" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:"0.75rem", marginBottom:"1rem" }}>
            <AvatarUpload userId={user.id} fotoUrl={user.foto_url} iniciais={user.nome ? user.nome.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase() : (user.foto_iniciais || "?")} size={48} onUploaded={url => setUser(prev => ({ ...prev, foto_url: url }))} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:"1rem", color:"var(--navy)", lineHeight:1.25, wordBreak:"break-word" }}>{user.nome}</div>
              <div style={{ fontSize:"0.8rem", color:"var(--text2)", lineHeight:1.3, wordBreak:"break-word" }}>{user.cargo||user.titulo} · {user.instituicao}</div>
            </div>
            <button className="btn btn-sm btn-outline" style={{ flexShrink:0 }}
              onClick={() => navigate("/painel/dados/editar")} title="Editar dados"><IconEdit /></button>
          </div>
          {perfilIncompleto && (
            <div style={{ background:"var(--gold-pale)", border:"1px solid rgba(201,168,76,0.4)", borderRadius:"var(--radius-sm)", padding:"0.65rem 0.85rem", marginBottom:"0.85rem", fontSize:"0.78rem", color:"var(--warn)" }}>
              ⚠️ Cadastro incompleto — falta {[!user.cpf && "CPF", !user.email && "e-mail", !user.instituicao && "instituição", !user.cargo && "cargo", bioFaltando && "mini biografia"].filter(Boolean).join(", ")}.
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.65rem", marginBottom: isPalestrante ? "0.85rem" : 0 }}>
            {[["CPF",user.cpf||"–"],["E-mail",user.email]].map(([k,v]) => (
              <div key={k}>
                <div style={{ fontSize:"0.65rem", fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"0.15rem" }}>{k}</div>
                <div style={{ fontSize:"0.82rem", color:"var(--text)", wordBreak:"break-all", lineHeight:1.3 }}>{v}</div>
              </div>
            ))}
          </div>
          {isPalestrante && (
            <div>
              <div style={{ fontSize:"0.65rem", fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"0.15rem" }}>Mini Bio</div>
              <div style={{ fontSize:"0.82rem", color:"var(--text)", lineHeight:1.4 }}>
                {user.mini_bio || <span style={{ color:"var(--warn)" }}>⚠️ Preencha sua mini biografia</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PALESTRANTE: Próximas Palestras — em destaque, antes da programação geral ── */}
      {isPalestrante && (
        <div style={{ marginBottom:"1rem" }}>
          <h3 style={{ fontWeight:700, color:"var(--navy)", marginBottom:"1rem", fontSize:"1rem" }}>🎙 Minhas Próximas Palestras</h3>
          {minhasPalestras.length === 0 ? (
            <div className="presenca-card" style={{ color:"var(--text3)", textAlign:"center", padding:"2rem" }}>Nenhuma palestra cadastrada.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
              {minhasPalestras
                .slice()
                .sort((a,b) => (a.dia||"").localeCompare(b.dia||"") || (a.horario||"").localeCompare(b.horario||""))
                .map(a => {
                  const contagem = faltamDiasLabel(a.dia);
                  return (
                    <div key={a.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"1.25rem 1.5rem" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.65rem", flexWrap:"wrap", gap:"0.4rem" }}>
                        <div style={{ fontWeight:700, fontSize:"0.88rem", color:"var(--navy)" }}>
                          {diaSemana(a.dia)}, {formatData(a.dia)}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                          {contagem && <span className={`badge ${contagem.startsWith("🔴") ? "badge-danger" : "badge-navy"}`}>{contagem}</span>}
                          <span style={{ fontSize:"0.85rem", color:"var(--teal)", fontWeight:600, whiteSpace:"nowrap" }}>
                            {a.horario}h{a.horario_fim ? ` às ${a.horario_fim}h` : ""}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontWeight:700, fontSize:"0.97rem", color:"var(--navy)", marginBottom:"0.2rem" }}>{a.titulo}</div>
                      {(() => { const np = presencas.filter(p=>p.atividade_id===a.id).length; return (!porTurno && np > 0) ? <div style={{ fontSize:"0.75rem", color:"var(--text3)", marginBottom:"0.15rem" }}>👥 {np} participante{np!==1?"s":""}</div> : null; })()}
                      <div style={{ fontSize:"0.82rem", color:"var(--text3)", display:"flex", flexWrap:"wrap", gap:"0 0.5rem" }}>
                        <span>{event.nome}</span>
                        {a.local && <span style={{ whiteSpace:"nowrap" }}>· 📍 {a.local}</span>}
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}
        </div>
      )}

      {/* Próximas Atividades — programação do evento, comum a todos */}
      {event.programacao_visivel !== false && (
        <div style={{ marginBottom:"1rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem", flexWrap:"wrap", gap:"0.5rem" }}>
            <h3 style={{ fontWeight:700, color:"var(--navy)", fontSize:"1rem", margin:0 }}>📅 Próximas Atividades</h3>
            <button className="btn btn-sm btn-outline" onClick={() => navigate("/painel/programacao")}>Ver programação completa →</button>
          </div>
          {proximasAtividades.length === 0 ? (
            <div className="presenca-card" style={{ color:"var(--text3)", textAlign:"center", padding:"1.5rem" }}>Nenhuma atividade programada.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
              {proximasAtividades.map(a => (
                <div key={a.id} className="pgrid-card" style={{ borderLeftColor: TIPO_COLOR[a.tipo] || "var(--navy)" }}>
                  <div className="pgrid-top">
                    <span>📅 {a.dia.split("-").slice(1).reverse().join("/")} · ⏱ {a.horario}{a.horario_fim ? `–${a.horario_fim}` : ""}</span>
                    <TipoBadge tipo={a.tipo}/>
                  </div>
                  <div className="pgrid-titulo-row">
                    <span className="pgrid-titulo">{a.titulo}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Destaque: pesquisa de satisfação liberada e ainda não respondida */}
      {event.pesquisa_ativa && podeResponderPesquisa && respondeuPesquisa === false && (
        <div style={{ background:"var(--success-bg)", border:"1.5px solid rgba(26,122,74,0.25)", borderRadius:"var(--radius-lg)", padding:"1.1rem 1.5rem", marginBottom:"1rem", textAlign:"center" }}>
          <div style={{ fontSize:"1.6rem", marginBottom:"0.35rem" }}>📝</div>
          <div style={{ fontWeight:700, color:"var(--navy)", fontSize:"0.95rem" }}>Sua opinião é importante!</div>
          <div style={{ fontSize:"0.82rem", color:"var(--text2)", marginBottom:"0.85rem" }}>Responda a pesquisa de satisfação do evento — leva só um minuto.</div>
          <button className="btn btn-sm btn-primary" onClick={() => navigate("/painel/pesquisa")}>Responder agora</button>
        </div>
      )}

      {/* ── PARTICIPANTE: credencial, estatísticas e pontuação ── */}
      {!isPalestrante && (
        <>
          {/* Credencial / QR */}
          <div style={{ background:"#e8f0fb", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"1.5rem", marginBottom:"1rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem", flexWrap:"wrap" }}>
            <div>
              <div style={{ fontSize:"0.63rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--text3)", marginBottom:"0.5rem" }}>{event.nome} · Participante</div>
              <span className={`badge badge-${user.credenciado?"success":"warn"}`} style={{ fontSize:"0.7rem" }}>{user.credenciado?"✓ Credenciado":"Aguardando credenciamento"}</span>
            </div>
            <div className="dash-qr-wrap" style={{ cursor:"pointer", padding:4, background:"var(--surface)", borderRadius:10, border:"1px solid var(--border)", flexShrink:0 }} onClick={()=>navigate("/painel/credencial")} title="Ver credencial completa">
              <QRCodeCanvas value={`ENAUDIN:PARTICIPANTE:${(user.cpf||user.email||user.id).toString().replace(/\D/g,"")}`} size={110}/>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="dash-stats-3">
            {[
              { n: porTurno ? minhasPresencasTurno.length : minasPresencas.length, l:"Presenças registradas", ic:"✅", warn:false },
              { n:`${presencaCalc.pct}%`,       l:"% de presença",         ic:"📊", warn:true  },
            ].map((c,i) => (
              <div key={i} className="dash-card" style={{ textAlign:"center", padding:"1.25rem 1rem" }}>
                <div style={{ fontSize:"1.75rem", marginBottom:"0.4rem" }}>{c.ic}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2.25rem", fontWeight:800, color:c.warn?"var(--warn)":"var(--navy)", lineHeight:1, marginBottom:"0.35rem" }}>{c.n}</div>
                <div style={{ fontSize:"0.75rem", color:"var(--text3)", fontWeight:500 }}>{c.l}</div>
              </div>
            ))}
          </div>

          {/* Pontuação */}
          {event.gamificacao_ativa !== false && (
            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"1.25rem 1.75rem", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"1rem", flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:"0.68rem", color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"0.3rem" }}>Pontuação acumulada</div>
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                  <span style={{ fontSize:"1.5rem" }}>{nivel.icon}</span>
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem", fontWeight:800, color:"var(--gold)" }}>{meusPts}</span>
                  <span style={{ fontSize:"0.9rem", color:"var(--text2)", alignSelf:"flex-end", marginBottom:3 }}>pts</span>
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"0.68rem", color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"0.3rem" }}>Posição no ranking</div>
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", justifyContent:"flex-end" }}>
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem", fontWeight:800, color:"var(--navy)" }}>#{posicao}</span>
                  <span style={{ fontSize:"0.82rem", color:"var(--text3)", alignSelf:"flex-end", marginBottom:3 }}>de {rankingTodos.length}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
