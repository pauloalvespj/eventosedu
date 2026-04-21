import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faMicrophone } from "@fortawesome/free-solid-svg-icons";
import { calcPresenca, calcPontos, getNivel, getUserId, formatData, diaSemana, imprimirCertificado, qrPresencaValue } from "../../utils/helpers";
import { TIPO_COLOR } from "../../utils/helpers";
import { ProgressBar, TipoBadge, QRCodeCanvas, AvaliacaoWidget, StarRating, IconEdit, AvatarUpload } from "../base/index";
import { ForumView } from "../forum/ForumView";
import { RankingView } from "../forum/RankingView";
import { RedeView } from "./RedeView";

export function AreaUsuario({ user, setUser, event, atividades, palestrantes, presencas, setPresencas, topicos, setTopicos, pontuacoes, setPontuacoes, forumConfig, participantes, admins, avaliacoes, setAvaliacoes, follows, pontosConfig, onSeguir, onDesseguir, registrarPresencaComPontos, onLogout }) {
  const isPalestrante = user.role === "palestrante";
  const [aba, setAba] = useState("dashboard");
  const [editando, setEditando] = useState(false);
  const [formEdit, setFormEdit] = useState({ instituicao: user.instituicao || "", cargo: user.cargo || "" });

  // Dados comuns
  const uid = getUserId(user);
  const meusPts = calcPontos(uid, pontuacoes);
  const nivel = getNivel(meusPts);

  // Dados participante (calculados mesmo p/ palestrante se ele for inscrito)
  const minasPresencas = presencas.filter(p => p.participante_id === user.id);
  const presencaCalc = calcPresenca(user.id, atividades, presencas, event);

  // Dados palestrante
  const minhasPalestras = isPalestrante ? atividades.filter(a => (a.palestrantes_ids || []).includes(user.id)) : [];
  const totalCH_pal = minhasPalestras.reduce((s, a) => s + a.carga_horaria, 0);
  const totalPresentes_pal = minhasPalestras.reduce((s, a) => s + presencas.filter(p => p.atividade_id === a.id).length, 0);

  function salvarEdicao() {
    if (setUser) setUser(prev => ({ ...prev, instituicao: formEdit.instituicao, cargo: formEdit.cargo }));
    setEditando(false);
  }

  function imprimirCertificadoParticipante() {
    imprimirCertificado(user, event, presencaCalc, minasPresencas, atividades, "participante");
  }

  // Menu dinâmico — abas comuns + extras p/ palestrante
  const MENU_COMUM = [
    ["dashboard",    "🏠 Início"],
    ["programacao",  "📅 Programação"],
    ["presencas",    "✅ Presenças"],
    ["certificado",  "🏆 Certificado"],
    ["credencial",   "🪪 Credencial"],
    ["forum",        "💬 Fórum"],
    ["ranking",      "🏅 Ranking"],
    ["rede",         "🤝 Rede"],
  ];
  const MENU_PALESTRANTE_EXTRA = [
    ["minhas_palestras", "🎙 Minhas Palestras"],
    ["presentes_pal",    "👥 Presentes"],
  ];
  const ABAS = isPalestrante
    ? [MENU_COMUM[0], ...MENU_PALESTRANTE_EXTRA, ...MENU_COMUM.slice(1)]
    : MENU_COMUM;

  // Cor do topbar
  const topbarBg = isPalestrante
    ? "linear-gradient(90deg,#0a2040 0%,#1d6a6a 100%)"
    : "var(--navy)";

  return (
    <div className="part-layout">
      {/* ── SIDEBAR ── */}
      <div className="part-sidebar" style={{ background: isPalestrante ? "linear-gradient(180deg,#0a2040 0%,#0d3350 60%,#1a4a4a 100%)" : "var(--navy-dark)" }}>
        <div className="part-sidebar-header">
          <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.75rem" }}>
            <AvatarUpload
              userId={user.id}
              fotoUrl={user.foto_url}
              iniciais={user.foto_iniciais || user.nome.split(" ").map(n=>n[0]).slice(0,2).join("")}
              size={36}
              onUploaded={url => setUser(prev => ({ ...prev, foto_url: url }))}
            />
            <div style={{ overflow:"hidden" }}>
              <div style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.85)", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.nome.split(" ")[0]}</div>
              <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.4)" }}>{isPalestrante ? "Palestrante" : "Participante"}</div>
            </div>
          </div>
          <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:"var(--radius-sm)", padding:"0.5rem 0.75rem", display:"flex", alignItems:"center", gap:"0.5rem" }}>
            <span style={{ fontSize:"1rem" }}>{nivel.icon}</span>
            <div>
              <div style={{ fontSize:"0.72rem", fontWeight:700, color:nivel.cor }}>{nivel.label}</div>
              <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.4)" }}>{meusPts} pts</div>
            </div>
          </div>
        </div>

        <nav className="part-nav">
          {ABAS.map(([k,l]) => (
            <div key={k} className={`part-nav-item${aba===k?" active":""}`} onClick={()=>setAba(k)}>{l}</div>
          ))}
        </nav>

        <div style={{ padding:"1rem", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.3)", marginBottom:"0.5rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{event.nome}</div>
          <button className="btn btn-sm btn-outline" style={{ color:"rgba(255,255,255,0.6)", borderColor:"rgba(255,255,255,0.2)", width:"100%" }} onClick={onLogout}>← Sair</button>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div className="part-content">

        {/* ════════════ DASHBOARD ════════════ */}
        {aba === "dashboard" && (
          <div>
            {/* Banner boas-vindas */}
            <div style={{ background:"linear-gradient(135deg,#0a1f40,#0f3460)", borderRadius:"var(--radius-lg)", padding:"1.5rem 2rem", marginBottom:"1.5rem", color:"#fff", display:"flex", alignItems:"center", gap:"1.5rem", flexWrap:"wrap" }}>
              <AvatarUpload
                userId={user.id}
                fotoUrl={user.foto_url}
                iniciais={user.foto_iniciais || user.nome.split(" ").map(n=>n[0]).slice(0,2).join("")}
                size={56}
                onUploaded={url => setUser(prev => ({ ...prev, foto_url: url }))}
              />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Bem-vindo(a){isPalestrante?" · Palestrante":""}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.3rem", marginBottom:"0.15rem" }}>{user.nome}</div>
                <div style={{ fontSize:"0.82rem", color:"rgba(255,255,255,0.6)" }}>{user.cargo||user.titulo} · {user.instituicao}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.4)", marginBottom:"0.2rem" }}>Nível</div>
                <div style={{ fontSize:"1.1rem", fontWeight:700, color:"var(--gold-light)" }}>{nivel.icon} {nivel.label}</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.5rem", fontWeight:800, color:"var(--gold-light)" }}>{meusPts} pts</div>
              </div>
            </div>

            {/* Cards palestrante */}
            {isPalestrante && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:"1rem", marginBottom:"1.5rem" }}>
                {(() => {
                  const avsTotal = avaliacoes.filter(av => minhasPalestras.some(a=>a.id===av.atividade_id));
                  const mediaGeral = avsTotal.length ? (avsTotal.reduce((s,av)=>s+av.estrelas,0)/avsTotal.length).toFixed(1) : "–";
                  return [
                    { n:minhasPalestras.length, l:"Minhas Palestras", ic:"🎙", c:"teal" },
                    { n:`${totalCH_pal}h`, l:"Carga Horária", ic:"⏱", c:"navy" },
                    { n:totalPresentes_pal, l:"Participantes Presentes", ic:"👥", c:"success" },
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
            )}

            {/* Cards participante */}
            {!isPalestrante && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:"1rem", marginBottom:"1.5rem" }}>
                {[
                  { n:minasPresencas.length, l:"Presenças registradas", ic:"✅", c:"navy" },
                  { n:`${presencaCalc.chCumprida}h`, l:"Carga horária", ic:"⏱", c:"teal" },
                  { n:`${presencaCalc.pct}%`, l:"% de presença", ic:"📊", c:presencaCalc.apto?"success":"danger" },
                  { n:presencaCalc.apto?"Apto ✓":"Pendente", l:"Certificado", ic:"🏆", c:presencaCalc.apto?"success":"warn" },
                ].map((c,i) => (
                  <div key={i} className="dash-card">
                    <div className={`dash-card-icon ${c.c}`}>{c.ic}</div>
                    <div className="dash-card-num" style={{ fontSize:"1.5rem", color:c.c==="success"?"var(--success)":c.c==="danger"?"var(--danger)":"" }}>{c.n}</div>
                    <div className="dash-card-lbl">{c.l}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Progresso certificado */}
            {!isPalestrante && (
              <div className="presenca-card" style={{ marginBottom:"1rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
                  <h3 style={{ fontWeight:700, color:"var(--navy)" }}>Progresso para certificado</h3>
                  {presencaCalc.apto && <button className="btn btn-sm btn-gold" onClick={()=>setAba("certificado")}>Ver →</button>}
                </div>
                <ProgressBar pct={presencaCalc.pct} minimo={event.percentual_minimo} />
                <p style={{ fontSize:"0.85rem", color:"var(--text2)", marginTop:"0.75rem" }}>
                  {presencaCalc.chCumprida}h de {presencaCalc.chTotal}h certificáveis.
                  {presencaCalc.apto?" 🎉 Apto ao certificado!":" Continue participando!"}
                </p>
              </div>
            )}

            {/* Dados cadastrais */}
            <div className="presenca-card">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
                <h3 style={{ fontWeight:700, color:"var(--navy)" }}>Meus dados</h3>
                {!isPalestrante && !editando && <button className="btn btn-sm btn-outline" onClick={()=>{ setFormEdit({ instituicao:user.instituicao||"", cargo:user.cargo||"" }); setEditando(true); }}><IconEdit /> Editar</button>}
              </div>
              {editando ? (
                <div>
                  <div className="form-grid" style={{ marginBottom:"1rem" }}>
                    <div className="form-group"><label className="form-label">Instituição</label><input className="form-input" value={formEdit.instituicao} onChange={e=>setFormEdit(f=>({...f,instituicao:e.target.value}))}/></div>
                    <div className="form-group"><label className="form-label">Cargo</label><input className="form-input" value={formEdit.cargo} onChange={e=>setFormEdit(f=>({...f,cargo:e.target.value}))}/></div>
                  </div>
                  <div style={{ display:"flex", gap:"0.5rem" }}>
                    <button className="btn btn-primary btn-sm" onClick={salvarEdicao}>Salvar</button>
                    <button className="btn btn-outline btn-sm" onClick={()=>setEditando(false)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
                  {[
                    ["CPF", user.cpf||"–"],
                    ["Nome", user.nome],
                    ["Instituição", user.instituicao||"–"],
                    ["Cargo/Título", user.cargo||user.titulo||"–"],
                    ["E-mail", user.email],
                    !isPalestrante && ["Credenciamento", user.credenciado ? "✓ Credenciado" : "Aguardando"],
                  ].filter(Boolean).map(([k,v]) => (
                    <div key={k}>
                      <div style={{ fontSize:"0.72rem", fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"0.2rem" }}>{k}</div>
                      <div style={{ fontSize:"0.9rem", color:"var(--text)" }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════ MINHAS PALESTRAS (palestrante) ════════════ */}
        {aba === "minhas_palestras" && isPalestrante && (
          <div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"var(--navy)", marginBottom:"1.5rem" }}>🎙 Minhas Palestras & QR Codes</h2>
            {minhasPalestras.length === 0 ? (
              <div style={{ textAlign:"center", padding:"3rem", color:"var(--text2)" }}>
                <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>🎙</div>
                <p>Nenhuma palestra associada ao seu perfil.</p>
              </div>
            ) : minhasPalestras.map(a => {
              const nPres = presencas.filter(p => p.atividade_id === a.id).length;
              const avsAtv = avaliacoes.filter(av => av.atividade_id === a.id);
              const mediaAvs = avsAtv.length ? avsAtv.reduce((s,av)=>s+av.estrelas,0)/avsAtv.length : 0;
              return (
                <div key={a.id} className="presenca-card" style={{ borderLeft:"4px solid var(--teal)", marginBottom:"1.25rem" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem", flexWrap:"wrap", gap:"0.5rem" }}>
                    <div>
                      <div style={{ marginBottom:4 }}><TipoBadge tipo={a.tipo}/></div>
                      <h3 style={{ fontWeight:700, color:"var(--navy)", fontSize:"1rem", marginBottom:"0.25rem" }}>{a.titulo}</h3>
                      <div style={{ fontSize:"0.82rem", color:"var(--text2)" }}>📅 {diaSemana(a.dia)}, {formatData(a.dia)} · ⏱ {a.horario}{a.horario_fim?`–${a.horario_fim}`:""} · 📍 {a.local}</div>
                      <div style={{ marginTop:6, display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                        <span className="prog-ch">{a.carga_horaria}h</span>
                        <span className={`badge badge-${a.conta_certificado?"success":"warn"}`}>{a.conta_certificado?"✓ Cert.":"Não conta"}</span>
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem", fontWeight:700, color:"var(--teal)" }}>{nPres}</div>
                      <div style={{ fontSize:"0.75rem", color:"var(--text3)" }}>presentes</div>
                    </div>
                  </div>
                  {a.descricao && <p style={{ fontSize:"0.85rem", color:"var(--text2)", marginBottom:"1rem", lineHeight:1.6 }}>{a.descricao}</p>}

                  {/* Avaliações recebidas */}
                  {avsAtv.length > 0 && (
                    <div style={{ background:"var(--gold-pale)", border:"1px solid rgba(201,168,76,0.3)", borderRadius:"var(--radius-sm)", padding:"1rem", marginBottom:"1rem" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem", flexWrap:"wrap", gap:"0.5rem" }}>
                        <div style={{ fontWeight:700, color:"var(--navy)", fontSize:"0.88rem" }}>⭐ Avaliações dos participantes</div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <StarRating value={Math.round(mediaAvs)} readonly size={18}/>
                          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem", fontWeight:700, color:"var(--gold)" }}>{mediaAvs.toFixed(1)}</span>
                          <span style={{ fontSize:"0.75rem", color:"var(--text3)" }}>({avsAtv.length})</span>
                        </div>
                      </div>
                      {/* Distribuição */}
                      <div style={{ marginBottom:"0.75rem" }}>
                        {[5,4,3,2,1].map(n => {
                          const cnt = avsAtv.filter(av=>av.estrelas===n).length;
                          return (
                            <div key={n} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                              <span style={{ fontSize:"0.72rem", color:"var(--text2)", width:10, fontWeight:600 }}>{n}</span>
                              <span style={{ color:"#c9a84c", fontSize:12 }}>★</span>
                              <div style={{ flex:1, height:6, background:"var(--border)", borderRadius:3, overflow:"hidden" }}>
                                <div style={{ height:"100%", width:`${avsAtv.length?(cnt/avsAtv.length)*100:0}%`, background:"var(--gold)", borderRadius:3 }}/>
                              </div>
                              <span style={{ fontSize:"0.72rem", color:"var(--text3)", width:14 }}>{cnt}</span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Comentários */}
                      {avsAtv.filter(av=>av.comentario).map(av => (
                        <div key={av.id} style={{ padding:"0.5rem 0.75rem", background:"#fff", borderRadius:6, marginBottom:4, borderLeft:"2px solid var(--gold)" }}>
                          <StarRating value={av.estrelas} readonly size={13}/>
                          <p style={{ fontSize:"0.82rem", color:"var(--text2)", marginTop:3, fontStyle:"italic" }}>"{av.comentario}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {avsAtv.length === 0 && (
                    <div style={{ fontSize:"0.82rem", color:"var(--text3)", marginBottom:"0.75rem", fontStyle:"italic" }}>Nenhuma avaliação recebida ainda.</div>
                  )}

                  {/* QR Code */}
                  <div style={{ background:"var(--surface2)", borderRadius:"var(--radius)", padding:"1.25rem", display:"flex", gap:"1.5rem", alignItems:"center", flexWrap:"wrap" }}>
                    <div style={{ textAlign:"center", flexShrink:0 }}>
                      <QRCodeCanvas value={qrPresencaValue(a.id)} size={140}/>
                      <div style={{ fontSize:"0.7rem", color:"var(--text3)", fontFamily:"monospace", marginTop:4 }}>atividade:{a.id}</div>
                    </div>
                    <div style={{ flex:1, minWidth:180 }}>
                      <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:"0.5rem", fontSize:"0.9rem" }}>Como usar este QR Code</div>
                      <ol style={{ fontSize:"0.85rem", color:"var(--text2)", lineHeight:1.8, paddingLeft:"1.2rem" }}>
                        <li>Exiba no projetor durante a atividade</li>
                        <li>Participantes apontam a câmera</li>
                        <li>Se logados, confirmam com 1 clique</li>
                        <li>Presença registrada automaticamente</li>
                      </ol>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════ PRESENTES (palestrante) ════════════ */}
        {aba === "presentes_pal" && isPalestrante && (
          <div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"var(--navy)", marginBottom:"1.5rem" }}>👥 Participantes nas Minhas Atividades</h2>
            {minhasPalestras.map(a => {
              const lista = presencas.filter(p => p.atividade_id === a.id)
                .map(p => ({ ...p, part: participantes.find(x => x.id === p.participante_id) }))
                .filter(p => p.part);
              return (
                <div key={a.id} style={{ marginBottom:"2rem" }}>
                  <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:"0.75rem", display:"flex", alignItems:"center", gap:"0.75rem", flexWrap:"wrap" }}>
                    <span style={{ background:"var(--navy)", color:"#fff", borderRadius:50, padding:"0.2rem 0.75rem", fontSize:"0.78rem" }}>{formatData(a.dia)}</span>
                    {a.titulo}
                    <span style={{ color:"var(--text3)", fontSize:"0.82rem", fontWeight:400 }}>({lista.length} presentes)</span>
                  </div>
                  {lista.length === 0 ? (
                    <p style={{ color:"var(--text3)", fontSize:"0.85rem", paddingLeft:"1rem" }}>Sem presenças ainda.</p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>#</th><th>Nome</th><th>Instituição</th><th>Cargo</th><th>Confirmado em</th></tr></thead>
                        <tbody>
                          {lista.map(({ part, data_hora }, i) => (
                            <tr key={i}>
                              <td style={{ color:"var(--text3)", fontSize:"0.82rem" }}>{i+1}</td>
                              <td style={{ fontWeight:500 }}>{part.nome}</td>
                              <td>{part.instituicao}</td>
                              <td>{part.cargo}</td>
                              <td style={{ fontSize:"0.82rem", color:"var(--text3)" }}>{data_hora}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════ PROGRAMAÇÃO ════════════ */}
        {aba === "programacao" && (
          <div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"var(--navy)", marginBottom:"1.5rem" }}>Programação do Evento</h2>
            {[...new Set(atividades.map(a=>a.dia))].sort().map(dia => (
              <div key={dia} style={{ marginBottom:"1.75rem" }}>
                <div style={{ fontWeight:700, fontSize:"0.88rem", marginBottom:"0.75rem", padding:"0.5rem 1rem", background:"var(--navy)", color:"#fff", borderRadius:"var(--radius-sm)", display:"inline-flex", alignItems:"center", gap:"0.5rem" }}>
                  📅 {diaSemana(dia)}, {formatData(dia)}
                </div>
                {atividades.filter(a=>a.dia===dia).sort((a,b)=>a.horario.localeCompare(b.horario)).map(a => {
                  const temPres = minasPresencas.some(p => p.atividade_id === a.id);
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
                              <span key={p.id}>{p.nome}{pals[i+1] ? <span style={{ color:"var(--border2)" }}> · </span> : ""}</span>
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
                        {a.conta_certificado&&<div style={{ fontSize:"0.7rem",color:"var(--teal)",marginTop:4 }}>cert.</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ════════════ PRESENÇAS ════════════ */}
        {aba === "presencas" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem", flexWrap:"wrap", gap:"0.5rem" }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"var(--navy)" }}>Minhas Presenças</h2>
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <span className="badge badge-navy">{minasPresencas.length} registros</span>
                <span className="badge badge-teal">{presencaCalc.chCumprida}h</span>
              </div>
            </div>
            {minasPresencas.length===0 ? (
              <div style={{ textAlign:"center", padding:"3rem", color:"var(--text2)", background:"var(--surface)", borderRadius:"var(--radius)", border:"1px dashed var(--border2)" }}>
                <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>📋</div>
                <p style={{ fontWeight:600, marginBottom:"0.5rem" }}>Nenhuma presença registrada</p>
                <p style={{ fontSize:"0.85rem" }}>Use o QR Code exibido em cada atividade.</p>
              </div>
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
        )}

        {/* ════════════ CERTIFICADO ════════════ */}
        {aba === "certificado" && (
          <div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"var(--navy)", marginBottom:"1.5rem" }}>
              {isPalestrante ? "🏆 Certificado de Palestrante" : "🏆 Certificado de Participação"}
            </h2>

            {/* Palestrante */}
            {isPalestrante && (
              <div>
                {minhasPalestras.length===0 ? (
                  <div style={{ textAlign:"center",padding:"3rem",background:"var(--danger-bg)",borderRadius:"var(--radius)",color:"var(--danger)" }}>
                    <div style={{ fontSize:"2rem",marginBottom:"0.75rem" }}>🔒</div>
                    <p>Nenhuma palestra associada. O certificado ficará disponível após o cadastro das atividades.</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ background:"var(--success-bg)",border:"1px solid var(--success)",borderRadius:"var(--radius)",padding:"1rem 1.25rem",marginBottom:"1.5rem",fontSize:"0.9rem",color:"var(--success)" }}>
                      ✅ Você ministrou {minhasPalestras.length} atividade(s), totalizando <strong>{totalCH_pal}h</strong>.
                    </div>
                    <div className="cert-preview" style={{ marginBottom:"1.5rem" }}>
                      <div style={{ fontSize:"0.72rem",letterSpacing:"0.15em",textTransform:"uppercase",opacity:0.65,marginBottom:"0.5rem" }}>Certificado de Palestrante</div>
                      <div style={{ width:48,height:2,background:"var(--gold)",margin:"0 auto 1.5rem" }}/>
                      <h2 style={{ marginBottom:"0.25rem",fontSize:"1rem" }}>Certificamos que</h2>
                      <h3 style={{ fontSize:"1.75rem",marginBottom:"0.25rem" }}>{user.nome}</h3>
                      <div style={{ fontSize:"0.85rem",color:"rgba(255,255,255,0.6)",marginBottom:"1.25rem" }}>{user.titulo}{user.instituicao?` · ${user.instituicao}`:""}</div>
                      <p style={{ lineHeight:1.85,fontSize:"0.9rem",color:"rgba(255,255,255,0.85)" }}>
                        atuou como <strong style={{ color:"var(--gold-light)" }}>palestrante convidado(a)</strong> no <strong style={{ color:"var(--gold-light)" }}>{event.nome}</strong>,<br/>
                        realizado de {formatData(event.data_inicio)} a {formatData(event.data_fim)} em {event.local}.
                      </p>
                      <div style={{ marginTop:"1.25rem",borderTop:"1px solid rgba(201,168,76,0.3)",paddingTop:"1rem" }}>
                        {minhasPalestras.map(a=><div key={a.id} style={{ fontSize:"0.85rem",color:"rgba(255,255,255,0.8)",marginBottom:"0.35rem" }}>• {a.titulo} <span style={{ color:"var(--gold-light)" }}>({a.carga_horaria}h)</span></div>)}
                      </div>
                      <div style={{ marginTop:"1rem",fontSize:"0.9rem",color:"var(--gold-light)",fontWeight:700 }}>Total: {totalCH_pal}h</div>
                    </div>
                    <button className="btn btn-gold btn-block" onClick={() => imprimirCertificado(user, event, null, null, null, "palestrante", minhasPalestras, totalCH_pal)}>
                      🖨 Imprimir / Salvar PDF
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Participante */}
            {!isPalestrante && (
              <div>
                <div className="presenca-card" style={{ marginBottom:"1.5rem" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
                    <h3 style={{ fontWeight:700,color:"var(--navy)" }}>Progresso</h3>
                    <span className={`badge badge-${presencaCalc.apto?"success":"warn"}`}>{presencaCalc.apto?"APTO":`Faltam ${(presencaCalc.chTotal-presencaCalc.chCumprida).toFixed(1)}h`}</span>
                  </div>
                  <ProgressBar pct={presencaCalc.pct} minimo={event.percentual_minimo}/>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"1rem",marginTop:"1.25rem" }}>
                    {[["CH Cumprida",`${presencaCalc.chCumprida}h`],["CH Total",`${presencaCalc.chTotal}h`],["Percentual",`${presencaCalc.pct}%`]].map(([k,v])=>(
                      <div key={k} style={{ textAlign:"center",background:"var(--surface2)",borderRadius:"var(--radius-sm)",padding:"0.75rem" }}>
                        <div style={{ fontSize:"0.72rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.05em" }}>{k}</div>
                        <div style={{ fontSize:"1.25rem",fontWeight:700,color:"var(--navy)",marginTop:"0.2rem" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {presencaCalc.apto ? (
                  <div>
                    <div className="cert-preview" style={{ marginBottom:"1.5rem" }}>
                      <div style={{ fontSize:"0.72rem",letterSpacing:"0.15em",textTransform:"uppercase",color:"rgba(255,255,255,0.5)",marginBottom:"0.75rem" }}>Certificado de Participação</div>
                      <div style={{ width:48,height:2,background:"var(--gold)",margin:"0 auto 1.5rem" }}/>
                      <h2 style={{ marginBottom:"0.25rem",fontSize:"1rem" }}>Certificamos que</h2>
                      <h3 style={{ fontSize:"1.75rem",marginBottom:"0.25rem" }}>{user.nome}</h3>
                      <div style={{ fontSize:"0.85rem",color:"rgba(255,255,255,0.6)",marginBottom:"1.25rem" }}>{user.cargo} · {user.instituicao}<br/>CPF: {user.cpf}</div>
                      <p style={{ lineHeight:1.85,fontSize:"0.9rem",color:"rgba(255,255,255,0.85)" }}>
                        participou do <strong style={{ color:"var(--gold-light)" }}>{event.nome_completo||event.nome}</strong>,<br/>
                        realizado de {formatData(event.data_inicio)} a {formatData(event.data_fim)}, em {event.local}.
                      </p>
                      <div style={{ marginTop:"1.25rem",display:"inline-block",background:"rgba(201,168,76,0.2)",border:"1px solid rgba(201,168,76,0.5)",borderRadius:"50px",padding:"0.35rem 1.25rem",fontSize:"0.9rem",color:"var(--gold-light)",fontWeight:700 }}>
                        {presencaCalc.chCumprida}h · {presencaCalc.pct}%
                      </div>
                    </div>
                    <button className="btn btn-gold btn-block" onClick={imprimirCertificadoParticipante}>🖨 Imprimir / Salvar PDF</button>
                    <p style={{ fontSize:"0.75rem",color:"var(--text3)",textAlign:"center",marginTop:"0.75rem" }}>Escolha "Salvar como PDF" na janela de impressão.</p>
                  </div>
                ) : (
                  <div style={{ textAlign:"center",padding:"2.5rem",background:"var(--surface)",borderRadius:"var(--radius)",border:"1px dashed var(--danger)" }}>
                    <div style={{ fontSize:"2.5rem",marginBottom:"0.75rem" }}>🔒</div>
                    <p style={{ fontWeight:700,color:"var(--danger)",marginBottom:"0.5rem" }}>Certificado indisponível</p>
                    <p style={{ fontSize:"0.85rem",color:"var(--text2)" }}>Mínimo: <strong>{event.percentual_minimo}%</strong> · Seu atual: <strong>{presencaCalc.pct}%</strong></p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════════ CREDENCIAL ════════════ */}
        {aba === "credencial" && (
          <div>
            <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:"1.4rem",color:"var(--navy)",marginBottom:"0.5rem" }}>🪪 Minha Credencial</h2>
            <p style={{ color:"var(--text2)",marginBottom:"1.5rem",fontSize:"0.9rem" }}>Apresente na recepção para credenciamento.</p>
            <div style={{ background:"linear-gradient(135deg,#0a1f40 0%,#0f3460 60%,#1d6a6a 100%)",borderRadius:"var(--radius-lg)",padding:"2rem",color:"#fff",maxWidth:420,marginBottom:"1.5rem",border:"2px solid rgba(201,168,76,0.4)" }}>
              <div style={{ fontSize:"0.7rem",letterSpacing:"0.12em",textTransform:"uppercase",color:"rgba(255,255,255,0.4)",marginBottom:"1.25rem" }}>{event.nome} · {isPalestrante?"Palestrante":"Participante"}</div>
              <div style={{ display:"flex",gap:"1rem",alignItems:"flex-start",marginBottom:"1.5rem" }}>
                <div style={{ width:52,height:52,borderRadius:"50%",background:"rgba(201,168,76,0.2)",border:"2px solid var(--gold)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",fontWeight:700,color:"var(--gold-light)",flexShrink:0 }}>
                  {user.foto_iniciais||user.nome.split(" ").map(n=>n[0]).slice(0,2).join("")}
                </div>
                <div>
                  <div style={{ fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",marginBottom:"0.2rem" }}>{user.nome}</div>
                  <div style={{ fontSize:"0.82rem",color:"rgba(255,255,255,0.65)" }}>{user.cargo||user.titulo} · {user.instituicao}</div>
                  {user.cpf&&<div style={{ fontSize:"0.78rem",color:"rgba(255,255,255,0.4)",marginTop:"0.25rem",fontFamily:"monospace" }}>{user.cpf}</div>}
                </div>
              </div>
              <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                {!isPalestrante&&<span className={`badge badge-${user.credenciado?"success":"warn"}`}>{user.credenciado?"✓ Credenciado":"Aguardando"}</span>}
                {isPalestrante&&<span className="badge badge-gold">🎤 Palestrante</span>}
                <div style={{ fontSize:"0.7rem",color:"rgba(255,255,255,0.4)",textAlign:"right" }}>
                  <div>{formatData(event.data_inicio)}</div><div>a {formatData(event.data_fim)}</div>
                </div>
              </div>
            </div>
            <div className="presenca-card">
              <h3 style={{ fontWeight:700,color:"var(--navy)",marginBottom:"0.5rem" }}>QR Code de Identificação</h3>
              <p style={{ fontSize:"0.85rem",color:"var(--text2)",marginBottom:"1.25rem" }}>O credenciador escaneia para localizar seu cadastro.</p>
              <div style={{ display:"flex",gap:"2rem",alignItems:"center",flexWrap:"wrap" }}>
                <QRCodeCanvas value={`ENAUDIN:${isPalestrante?"PALESTRANTE":"PARTICIPANTE"}:${(user.cpf||user.email||user.id).toString().replace(/\D/g,"")}`} size={160}/>
                <div>
                  <div style={{ fontSize:"0.78rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"0.25rem" }}>Identificação</div>
                  <div style={{ fontFamily:"monospace",fontSize:"1rem",fontWeight:700,color:"var(--navy)",marginBottom:"0.75rem" }}>{user.cpf||user.email}</div>
                  <div style={{ fontWeight:600,color:"var(--text)",marginBottom:"0.75rem" }}>{user.nome}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ FÓRUM ════════════ */}
        {aba === "forum" && (
          <ForumView
            user={user}
            topicos={topicos} setTopicos={setTopicos}
            pontuacoes={pontuacoes} setPontuacoes={setPontuacoes}
            forumConfig={forumConfig}
          />
        )}

        {/* ════════════ RANKING ════════════ */}
        {aba === "ranking" && (
          <RankingView
            participantes={participantes}
            palestrantes={palestrantes}
            admins={admins}
            pontuacoes={pontuacoes}
            user={user}
          />
        )}

        {/* ════════════ REDE ════════════ */}
        {aba === "rede" && (
          <RedeView
            user={user}
            participantes={participantes}
            follows={follows}
            pontosConfig={pontosConfig}
            onSeguir={onSeguir}
            onDesseguir={onDesseguir}
          />
        )}

      </div>
    </div>
  );
}
