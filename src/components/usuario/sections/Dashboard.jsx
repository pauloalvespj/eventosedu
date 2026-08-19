import { useNavigate } from "react-router-dom";
import { calcPontos, getUserId, formatData, diaSemana } from "../../../utils/helpers";
import { QRCodeCanvas, AvatarUpload, IconEdit } from "../../base/index";
import { useUsuario } from "../UsuarioContext";

export function Dashboard() {
  const {
    user, setUser, event, palestrantes, presencas, avaliacoes, participantes, admins, pontuacoes,
    isPalestrante, uid, meusPts, nivel, minasPresencas, minhasPresencasTurno, porTurno, presencaCalc,
    podeResponderPesquisa, respondeuPesquisa, minhasPalestras, totalCH_pal, totalPresentes_pal,
  } = useUsuario();
  const navigate = useNavigate();

  return (
    <div>
      {/* ── PALESTRANTE ── */}
      {isPalestrante && (
        <div>
          <div style={{ background:"linear-gradient(135deg,var(--hero-dark),var(--hero))", borderRadius:"var(--radius-lg)", padding:"1.5rem 2rem", marginBottom:"1.5rem", color:"#fff", display:"flex", alignItems:"center", gap:"1.5rem", flexWrap:"wrap" }}>
            <AvatarUpload userId={user.id} fotoUrl={user.foto_url} iniciais={user.nome ? user.nome.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase() : (user.foto_iniciais || "?")} size={56} onUploaded={url => setUser(prev => ({ ...prev, foto_url: url }))} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Bem-vindo(a) · Palestrante</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.3rem", marginBottom:"0.15rem" }}>{user.nome}</div>
              <div style={{ fontSize:"0.82rem", color:"rgba(255,255,255,0.6)" }}>{user.cargo||user.titulo} · {user.instituicao}</div>
            </div>
            {event.gamificacao_ativa !== false && (
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:"0.72rem", color:"var(--white-low)", marginBottom:"0.2rem" }}>Pontuação</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.5rem", fontWeight:800, color:"var(--gold-light)" }}>{nivel.icon} {meusPts} pts</div>
              </div>
            )}
          </div>
          <div className="dash-cards-pal" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"1rem", marginBottom:"1.5rem" }}>
            {(() => {
              const avsTotal = avaliacoes.filter(av => minhasPalestras.some(a=>a.id===av.atividade_id));
              const mediaGeral = avsTotal.length ? (avsTotal.reduce((s,av)=>s+av.estrelas,0)/avsTotal.length).toFixed(1) : "–";
              return [
                { n:minhasPalestras.length, l:"Minhas Palestras", ic:"🎙", c:"teal" },
                { n:`${totalCH_pal}h`, l:"Carga Horária", ic:"⏱", c:"navy" },
                { n:totalPresentes_pal, l:"Presentes", ic:"👥", c:"success" },
                { n:mediaGeral !== "–" ? `${mediaGeral}★` : "–", l:`Avaliação Média (${avsTotal.length})`, ic:"⭐", c:"gold" },
              ];
            })().map((c,i) => (
              <div key={i} className="dash-card">
                <div className={`dash-card-icon ${c.c}`}>{c.ic}</div>
                <div className="dash-card-num" style={{ fontSize:"1.5rem" }}>{c.n}</div>
                <div className="dash-card-lbl">{c.l}</div>
              </div>
            ))}
          </div>

          {/* Próximas Palestras */}
          <div>
            <h3 style={{ fontWeight:700, color:"var(--navy)", marginBottom:"1rem", fontSize:"1rem" }}>Minhas Próximas Palestras</h3>
            {minhasPalestras.length === 0 ? (
              <div className="presenca-card" style={{ color:"var(--text3)", textAlign:"center", padding:"2rem" }}>Nenhuma palestra cadastrada.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
                {minhasPalestras
                  .slice()
                  .sort((a,b) => (a.dia||"").localeCompare(b.dia||"") || (a.horario||"").localeCompare(b.horario||""))
                  .map(a => (
                    <div key={a.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"1.25rem 1.5rem" }}>
                      {/* Data · Hora */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.65rem" }}>
                        <div style={{ fontWeight:700, fontSize:"0.88rem", color:"var(--navy)" }}>
                          {diaSemana(a.dia)}, {formatData(a.dia)}
                        </div>
                        <div style={{ fontSize:"0.85rem", color:"var(--teal)", fontWeight:600, whiteSpace:"nowrap" }}>
                          {a.horario}h{a.horario_fim ? ` às ${a.horario_fim}h` : ""}
                        </div>
                      </div>
                      {/* Conteúdo */}
                      <div style={{ fontWeight:700, fontSize:"0.97rem", color:"var(--navy)", marginBottom:"0.2rem" }}>{a.titulo}</div>
                      {(() => {
                        const pals = (a.palestrantes_ids||[]).map(id=>palestrantes.find(p=>p.id===id)).filter(Boolean);
                        return pals.length > 0 ? (
                          <div style={{ fontSize:"0.78rem", color:"var(--teal)", marginBottom:"0.25rem" }}>
                            🎤 {pals.map(p => p.nome.split(" ").slice(0,2).join(" ")).join(" · ")}
                          </div>
                        ) : null;
                      })()}
                      {(() => { const np = presencas.filter(p=>p.atividade_id===a.id).length; return np > 0 ? <div style={{ fontSize:"0.75rem", color:"var(--text3)", marginBottom:"0.15rem" }}>👥 {np} participante{np!==1?"s":""}</div> : null; })()}
                      <div style={{ fontSize:"0.82rem", color:"var(--text3)", display:"flex", flexWrap:"wrap", gap:"0 0.5rem" }}>
                        <span>{event.nome}</span>
                        {a.local && <span style={{ whiteSpace:"nowrap" }}>· 📍 {a.local}</span>}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PARTICIPANTE ── */}
      {!isPalestrante && (() => {
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const inicio = new Date(event.data_inicio + "T00:00:00");
        const fim    = new Date(event.data_fim    + "T00:00:00");
        const diasFaltam = Math.ceil((inicio - hoje) / 86400000);
        const emAndamento = hoje >= inicio && hoje <= fim;
        const encerrado   = hoje > fim;
        const rankingTodos = [...participantes, ...palestrantes, ...admins]
          .map(p => ({ id: getUserId(p), pts: calcPontos(getUserId(p), pontuacoes) }))
          .sort((a, b) => b.pts - a.pts);
        const posicao = (rankingTodos.findIndex(p => p.id === uid) + 1) || rankingTodos.length;
        return (
          <>
            {/* 1. Card Evento */}
            <div className="dash-event-card" style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"1.25rem 1.5rem", marginBottom:"1rem", textAlign:"center" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", fontWeight:800, color:"var(--navy)", lineHeight:1.15, marginBottom:"0.25rem" }}>{event.nome}</div>
              {event.nome_completo && event.nome_completo !== event.nome && (
                <div style={{ fontSize:"0.85rem", color:"var(--text2)", marginBottom:"0.2rem" }}>{event.nome_completo}</div>
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
            </div>

            {/* Destaque: pesquisa de satisfação liberada e ainda não respondida */}
            {event.pesquisa_ativa && podeResponderPesquisa && respondeuPesquisa === false && (
              <div style={{ background:"var(--success-bg)", border:"1.5px solid rgba(26,122,74,0.25)", borderRadius:"var(--radius-lg)", padding:"1.1rem 1.5rem", marginBottom:"1rem", textAlign:"center" }}>
                <div style={{ fontSize:"1.6rem", marginBottom:"0.35rem" }}>📝</div>
                <div style={{ fontWeight:700, color:"var(--navy)", fontSize:"0.95rem" }}>Sua opinião é importante!</div>
                <div style={{ fontSize:"0.82rem", color:"var(--text2)", marginBottom:"0.85rem" }}>Responda a pesquisa de satisfação do evento — leva só um minuto.</div>
                <button className="btn btn-sm btn-primary" onClick={() => navigate("/painel/pesquisa")}>Responder agora</button>
              </div>
            )}

            {/* 2. Card Participante */}
            <div className="dash-participant-card">
              {/* Coluna esquerda — credencial */}
              <div style={{ background:"#e8f0fb", padding:"1.5rem", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:"0.63rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--text3)", marginBottom:"0.5rem" }}>{event.nome} · Participante</div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", color:"var(--navy)", marginBottom:"0.2rem", lineHeight:1.25, wordBreak:"break-word" }}>{user.nome}</div>
                  <div style={{ fontSize:"0.78rem", color:"var(--text2)", marginBottom:"0.75rem", lineHeight:1.3, wordBreak:"break-word" }}>{user.cargo||user.titulo} · {user.instituicao}</div>
                  <span className={`badge badge-${user.credenciado?"success":"warn"}`} style={{ fontSize:"0.7rem" }}>{user.credenciado?"✓ Credenciado":"Aguardando credenciamento"}</span>
                </div>
                <div className="dash-qr-wrap" style={{ display:"flex", justifyContent:"flex-end", marginTop:"1rem" }}>
                  <div style={{ cursor:"pointer", padding:4, background:"var(--surface)", borderRadius:10, border:"1px solid var(--border)" }} onClick={()=>navigate("/painel/credencial")} title="Ver credencial completa">
                    <QRCodeCanvas value={`ENAUDIN:PARTICIPANTE:${(user.cpf||user.email||user.id).toString().replace(/\D/g,"")}`} size={120}/>
                  </div>
                </div>
              </div>
              {/* Coluna direita — meus dados */}
              <div style={{ padding:"1.5rem", background:"var(--surface)", borderLeft:"1px solid var(--border)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"1rem" }}>
                  <AvatarUpload userId={user.id} fotoUrl={user.foto_url} iniciais={user.nome ? user.nome.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase() : (user.foto_iniciais || "?")} size={48} onUploaded={url => setUser(prev => ({ ...prev, foto_url: url }))} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:"1rem", color:"var(--navy)", lineHeight:1.25, wordBreak:"break-word" }}>{user.nome}</div>
                    <div style={{ fontSize:"0.8rem", color:"var(--text2)", lineHeight:1.3, wordBreak:"break-word" }}>{user.cargo||user.titulo} · {user.instituicao}</div>
                  </div>
                  <button className="btn btn-sm btn-outline" style={{ flexShrink:0, padding:"0.3rem 0.55rem" }} onClick={()=>navigate("/painel/dados/editar")} title="Editar dados"><IconEdit /></button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.65rem" }}>
                  {[["CPF",user.cpf||"–"],["Cargo",user.cargo||user.titulo||"–"],["E-mail",user.email],["Instituição",user.instituicao||"–"]].map(([k,v]) => (
                    <div key={k}>
                      <div style={{ fontSize:"0.65rem", fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"0.15rem" }}>{k}</div>
                      <div style={{ fontSize:"0.82rem", color:"var(--text)", wordBreak:"break-all", lineHeight:1.3 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Cards de Estatísticas */}
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

            {/* 4. Card de Pontuação */}
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
        );
      })()}
    </div>
  );
}
