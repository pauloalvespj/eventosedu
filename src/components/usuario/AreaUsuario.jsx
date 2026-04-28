import { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faMicrophone, faUpload, faTrash } from "@fortawesome/free-solid-svg-icons";
import { calcPresenca, calcPontos, getNivel, getUserId, formatData, diaSemana, imprimirCertificado, qrPresencaValue, formatCPF } from "../../utils/helpers";
import { TIPO_COLOR } from "../../utils/helpers";
import { ProgressBar, TipoBadge, QRCodeCanvas, AvaliacaoWidget, StarRating, IconEdit, AvatarUpload } from "../base/index";
import { ForumView } from "../forum/ForumView";
import { RankingView } from "../forum/RankingView";
import { RedeView } from "./RedeView";
import { uploadMaterial, deletarMaterial, atualizarAtividade, atualizarProfile } from "../../lib/db";

function EditForm({ formEdit, setFormEdit, instituicoes, onSave, onCancel }) {
  const instList = instituicoes.filter(i => i.ativo);
  const selectVal = formEdit.outraInst ? "__outro__" : (instList.some(i => i.nome === formEdit.instituicao) ? formEdit.instituicao : (formEdit.instituicao ? "__outro__" : ""));
  return (
    <div>
      <div className="form-grid" style={{ marginBottom:"0.75rem" }}>
        <div className="form-group" style={{ gridColumn:"1/-1" }}>
          <label className="form-label">Nome completo</label>
          <input className="form-input" value={formEdit.nome} onChange={e=>setFormEdit(f=>({...f,nome:e.target.value}))} />
        </div>
        <div className="form-group">
          <label className="form-label">Cargo / Título</label>
          <input className="form-input" value={formEdit.cargo} onChange={e=>setFormEdit(f=>({...f,cargo:e.target.value}))} />
        </div>
        <div className="form-group">
          <label className="form-label">Instituição</label>
          <select className="form-input" value={selectVal}
            onChange={e => {
              if (e.target.value === "__outro__") {
                setFormEdit(f => ({...f, outraInst:true, instituicao:""}));
              } else {
                setFormEdit(f => ({...f, outraInst:false, instituicao:e.target.value}));
              }
            }}>
            <option value="">Selecione...</option>
            {instList.map(i => <option key={i.id} value={i.nome}>{i.sigla} — {i.nome}</option>)}
            <option value="__outro__">Outra (digitar)</option>
          </select>
        </div>
        {(formEdit.outraInst || (formEdit.instituicao && !instList.some(i => i.nome === formEdit.instituicao))) && (
          <div className="form-group" style={{ gridColumn:"1/-1" }}>
            <label className="form-label">Nome da instituição</label>
            <input className="form-input" placeholder="Digite o nome da sua instituição" value={formEdit.instituicao}
              onChange={e=>setFormEdit(f=>({...f,instituicao:e.target.value,outraInst:true}))} autoFocus />
          </div>
        )}
      </div>
      <div style={{ display:"flex", gap:"0.5rem" }}>
        <button className="btn btn-primary btn-sm" onClick={onSave}>Salvar</button>
        <button className="btn btn-outline btn-sm" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

export function AreaUsuario({ user, setUser, event, atividades, setAtividades, palestrantes, presencas, setPresencas, topicos, setTopicos, pontuacoes, setPontuacoes, forumConfig, participantes, admins, instituicoes, avaliacoes, setAvaliacoes, follows, pontosConfig, onSeguir, onDesseguir, registrarPresencaComPontos, onLogout }) {
  const isPalestrante = user.role === "palestrante";
  const [aba, setAba] = useState("dashboard");
  const [editando, setEditando] = useState(false);
  const [formEdit, setFormEdit] = useState({ nome: user.nome || "", cpf: user.cpf || "", instituicao: user.instituicao || "", cargo: user.cargo || "", titulo: user.titulo || "", area: user.area || "", mini_bio: user.mini_bio || "", outraInst: false });
  const [uploadingId, setUploadingId] = useState(null); // id da atividade em upload
  const [navAberta, setNavAberta] = useState(false);
  const fileRefs = useRef({});

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

  async function salvarEdicao() {
    const updates = {
      nome: formEdit.nome.trim() || user.nome,
      cpf: formEdit.cpf,
      instituicao: formEdit.instituicao,
      cargo: formEdit.cargo,
      ...(isPalestrante && { titulo: formEdit.titulo, area: formEdit.area, mini_bio: formEdit.mini_bio }),
    };
    if (setUser) setUser(prev => ({ ...prev, ...updates }));
    await atualizarProfile(user.id, updates);
    setEditando(false);
  }

  async function handleUploadMaterial(atividadeId, file) {
    setUploadingId(atividadeId);
    try {
      const mat = await uploadMaterial(atividadeId, file);
      const atvAtualizada = atividades.find(a => a.id === atividadeId);
      const novosMats = [...(atvAtualizada?.materiais || []), mat];
      await atualizarAtividade(atividadeId, { materiais: novosMats });
      if (setAtividades) setAtividades(prev => prev.map(a => a.id === atividadeId ? { ...a, materiais: novosMats } : a));
    } catch (e) {
      console.error("Erro ao fazer upload:", e.message);
    } finally {
      setUploadingId(null);
    }
  }

  async function handleRemoverMaterial(atividadeId, mat) {
    if (!confirm(`Remover "${mat.nome}"?`)) return;
    const atvAtualizada = atividades.find(a => a.id === atividadeId);
    const novosMats = (atvAtualizada?.materiais || []).filter(m => m.id !== mat.id);
    await deletarMaterial(mat.path);
    await atualizarAtividade(atividadeId, { materiais: novosMats });
    if (setAtividades) setAtividades(prev => prev.map(a => a.id === atividadeId ? { ...a, materiais: novosMats } : a));
  }

  function imprimirCertificadoParticipante() {
    imprimirCertificado(user, event, presencaCalc, minasPresencas, atividades, "participante");
  }

  // Menu dinâmico — abas comuns + extras p/ palestrante
  const MENU_COMUM = [
    ["dashboard",    "🏠 Início"],
    ["programacao",  "📅 Programação"],
    ["presencas",    "✅ Presenças"],
    ...(event.certificado_disponivel ? [["certificado", "🏆 Certificado"]] : []),
    ["forum",        "💬 Fórum"],
    ["ranking",      "🏅 Ranking"],
    ["rede",         "🤝 Rede"],
    ["meus_dados",   "👤 Meus Dados"],
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
    ? "linear-gradient(90deg,var(--hero-dark),var(--hero))"
    : "var(--navy)";

  const abaLabel = ABAS.find(([k]) => k === aba)?.[1] || "";

  return (
    <div className="part-layout">
      {/* ── MOBILE HEADER ── */}
      <div className="mobile-header" style={{ background: isPalestrante ? "linear-gradient(90deg,var(--hero-dark),var(--hero))" : "var(--navy-dark)" }}>
        <button className="hamburger" onClick={() => setNavAberta(v => !v)} aria-label="Menu">
          <span/><span/><span/>
        </button>
        <span className="mobile-header-title">{event.nome}</span>
        <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.72rem", fontWeight:700, color:"#fff", flexShrink:0 }}>
          {user.foto_iniciais || user.nome.split(" ").map(n=>n[0]).slice(0,2).join("")}
        </div>
      </div>

      {/* ── OVERLAY ── */}
      {navAberta && <div className="sidebar-overlay" onClick={() => setNavAberta(false)} />}

      {/* ── SIDEBAR ── */}
      <div className={`part-sidebar${navAberta ? " open" : ""}`} style={{ background: isPalestrante ? "linear-gradient(180deg,var(--hero-dark),var(--hero))" : "var(--navy-dark)" }}>
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
              <div style={{ fontSize:"0.78rem", color:"var(--white-hi)", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.nome.split(" ")[0]}</div>
              <div style={{ fontSize:"0.68rem", color:"var(--white-low)" }}>{isPalestrante ? "Palestrante" : "Participante"}</div>
            </div>
          </div>
          <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:"var(--radius-sm)", padding:"0.5rem 0.75rem", display:"flex", alignItems:"center", gap:"0.5rem" }}>
            <span style={{ fontSize:"1rem" }}>{nivel.icon}</span>
            <div style={{ fontSize:"0.78rem", fontWeight:700, color:"var(--gold-light)" }}>{meusPts} pts</div>
          </div>
        </div>

        <nav className="part-nav">
          {ABAS.map(([k,l]) => (
            <div key={k} className={`part-nav-item${aba===k?" active":""}`} onClick={()=>{ setAba(k); setNavAberta(false); }}>{l}</div>
          ))}
        </nav>

        <div style={{ padding:"1rem", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize:"0.68rem", color:"var(--white-faint)", marginBottom:"0.5rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{event.nome}</div>
          <button className="btn btn-sm btn-outline" style={{ color:"rgba(255,255,255,0.6)", borderColor:"rgba(255,255,255,0.2)", width:"100%" }} onClick={onLogout}>← Sair</button>
        </div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div className="part-content">

        {/* ════════════ DASHBOARD ════════════ */}
        {aba === "dashboard" && (
          <div>

            {/* ── PALESTRANTE ── */}
            {isPalestrante && (
              <div>
                <div style={{ background:"linear-gradient(135deg,var(--hero-dark),var(--hero))", borderRadius:"var(--radius-lg)", padding:"1.5rem 2rem", marginBottom:"1.5rem", color:"#fff", display:"flex", alignItems:"center", gap:"1.5rem", flexWrap:"wrap" }}>
                  <AvatarUpload userId={user.id} fotoUrl={user.foto_url} iniciais={user.foto_iniciais || user.nome.split(" ").map(n=>n[0]).slice(0,2).join("")} size={56} onUploaded={url => setUser(prev => ({ ...prev, foto_url: url }))} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.5)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Bem-vindo(a) · Palestrante</div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.3rem", marginBottom:"0.15rem" }}>{user.nome}</div>
                    <div style={{ fontSize:"0.82rem", color:"rgba(255,255,255,0.6)" }}>{user.cargo||user.titulo} · {user.instituicao}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:"0.72rem", color:"var(--white-low)", marginBottom:"0.2rem" }}>Pontuação</div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.5rem", fontWeight:800, color:"var(--gold-light)" }}>{nivel.icon} {meusPts} pts</div>
                  </div>
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
                          <div key={a.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"1.25rem 1.5rem", display:"flex", alignItems:"center", gap:"1.5rem", flexWrap:"wrap" }}>
                            <div style={{ background:"var(--hero-gradient)", borderRadius:"var(--radius-sm)", padding:"0.6rem 1rem", textAlign:"center", minWidth:80, flexShrink:0 }}>
                              <div style={{ fontSize:"0.68rem", color:"var(--white-low)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{diaSemana(a.dia)}</div>
                              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:800, color:"var(--gold-on-dark)", lineHeight:1.2 }}>{formatData(a.dia)}</div>
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontWeight:700, fontSize:"0.97rem", color:"var(--navy)", marginBottom:"0.2rem" }}>{a.titulo}</div>
                              <div style={{ fontSize:"0.82rem", color:"var(--text3)" }}>{event.nome}</div>
                              {a.local && <div style={{ fontSize:"0.78rem", color:"var(--text3)", marginTop:"0.15rem" }}>📍 {a.local}</div>}
                            </div>
                            <div style={{ textAlign:"right", flexShrink:0 }}>
                              <div style={{ fontFamily:"monospace", fontSize:"1.1rem", fontWeight:700, color:"var(--navy)" }}>{a.horario}{a.horario_fim ? ` – ${a.horario_fim}` : ""}</div>
                              {a.carga_horaria > 0 && <div style={{ fontSize:"0.72rem", color:"var(--text3)", marginTop:"0.15rem" }}>{a.carga_horaria}h</div>}
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
                  <div className="dash-event-card" style={{ background:"var(--hero)", borderRadius:"var(--radius-lg)", padding:"1.5rem 2rem", marginBottom:"1rem", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"1rem", flexWrap:"wrap" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.75rem", fontWeight:800, color:"var(--gold-on-dark)", lineHeight:1, marginBottom:"0.3rem" }}>{event.nome}</div>
                      {event.nome_completo && event.nome_completo !== event.nome && (
                        <div style={{ fontSize:"0.88rem", color:"rgba(255,255,255,0.7)", marginBottom:"0.2rem" }}>{event.nome_completo}</div>
                      )}
                      {event.subtitulo && (
                        <div style={{ fontSize:"0.82rem", color:"var(--white-low)", fontStyle:"italic", marginBottom:"0.6rem" }}>{event.subtitulo}</div>
                      )}
                      <div style={{ display:"flex", gap:"1.5rem", flexWrap:"wrap", marginTop:"0.5rem" }}>
                        <span style={{ fontSize:"0.82rem", color:"rgba(255,255,255,0.5)" }}>📅 {formatData(event.data_inicio)}{event.data_fim !== event.data_inicio ? ` – ${formatData(event.data_fim)}` : ""}</span>
                        <span style={{ fontSize:"0.82rem", color:"rgba(255,255,255,0.5)" }}>📍 {event.local}</span>
                      </div>
                    </div>
                    <div className="dash-countdown" style={{ textAlign:"center", flexShrink:0, background:"var(--gold-tint)", border:"1.5px solid var(--gold-border)", borderRadius:"var(--radius)", padding:"1rem 1.5rem", minWidth:90 }}>
                      {encerrado ? (
                        <>
                          <div style={{ fontSize:"1.5rem", marginBottom:"0.2rem" }}>✓</div>
                          <div style={{ fontSize:"0.68rem", color:"var(--white-low)", textTransform:"uppercase", letterSpacing:"0.06em" }}>Encerrado</div>
                        </>
                      ) : emAndamento ? (
                        <>
                          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.75rem", color:"var(--gold-on-dark)", marginBottom:"0.2rem" }}>🎉</div>
                          <div style={{ fontSize:"0.68rem", color:"var(--white-low)", textTransform:"uppercase", letterSpacing:"0.06em" }}>Em andamento</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize:"0.65rem", color:"var(--white-faint)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"0.1rem" }}>Faltam</div>
                          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"3rem", fontWeight:800, color:"var(--gold-on-dark)", lineHeight:1 }}>{diasFaltam}</div>
                          <div style={{ fontSize:"0.72rem", color:"var(--white-low)", marginTop:"0.2rem" }}>dia{diasFaltam!==1?"s":""}</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 2. Card Participante */}
                  <div className="dash-participant-card">
                    {/* Coluna esquerda */}
                    <div style={{ padding:"1.5rem", background:"var(--surface)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"1rem" }}>
                        <AvatarUpload userId={user.id} fotoUrl={user.foto_url} iniciais={user.foto_iniciais || user.nome.split(" ").map(n=>n[0]).slice(0,2).join("")} size={48} onUploaded={url => setUser(prev => ({ ...prev, foto_url: url }))} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:"1rem", color:"var(--navy)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.nome}</div>
                          <div style={{ fontSize:"0.8rem", color:"var(--text2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.cargo||user.titulo} · {user.instituicao}</div>
                        </div>
                        {!editando && (
                          <button className="btn btn-sm btn-outline" style={{ flexShrink:0, padding:"0.3rem 0.55rem" }} onClick={()=>{
                            const instList = (instituicoes||[]).filter(i=>i.ativo);
                            const isKnown = instList.some(i=>i.nome===(user.instituicao||"")||i.sigla===(user.instituicao||""));
                            setFormEdit({ nome:user.nome||"", instituicao:user.instituicao||"", cargo:user.cargo||"", outraInst:!isKnown&&!!(user.instituicao) });
                            setEditando(true);
                          }} title="Editar dados"><IconEdit /></button>
                        )}
                      </div>
                      {editando ? (
                        <EditForm formEdit={formEdit} setFormEdit={setFormEdit} instituicoes={instituicoes||[]} onSave={salvarEdicao} onCancel={()=>setEditando(false)} />
                      ) : (
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.65rem" }}>
                          {[["CPF",user.cpf||"–"],["Cargo",user.cargo||user.titulo||"–"],["E-mail",user.email],["Instituição",user.instituicao||"–"]].map(([k,v]) => (
                            <div key={k}>
                              <div style={{ fontSize:"0.65rem", fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"0.15rem" }}>{k}</div>
                              <div style={{ fontSize:"0.82rem", color:"var(--text)", wordBreak:"break-all", lineHeight:1.3 }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Coluna direita — credencial */}
                    <div style={{ background:"var(--surface2)", padding:"1.5rem", display:"flex", flexDirection:"column", justifyContent:"space-between", borderLeft:"1px solid var(--border)" }}>
                      <div>
                        <div style={{ fontSize:"0.63rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--text3)", marginBottom:"0.5rem" }}>{event.nome} · Participante</div>
                        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", color:"var(--navy)", marginBottom:"0.2rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.nome}</div>
                        <div style={{ fontSize:"0.78rem", color:"var(--text2)", marginBottom:"0.75rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.cargo||user.titulo} · {user.instituicao}</div>
                        <span className={`badge badge-${user.credenciado?"success":"warn"}`} style={{ fontSize:"0.7rem" }}>{user.credenciado?"✓ Credenciado":"Aguardando credenciamento"}</span>
                      </div>
                      <div className="dash-qr-wrap" style={{ display:"flex", justifyContent:"flex-end", marginTop:"1rem" }}>
                        <div style={{ cursor:"pointer", padding:4, background:"var(--surface)", borderRadius:10, border:"1px solid var(--border)" }} onClick={()=>setAba("credencial_qr")} title="Ver credencial completa">
                          <QRCodeCanvas value={`ENAUDIN:PARTICIPANTE:${(user.cpf||user.email||user.id).toString().replace(/\D/g,"")}`} size={120}/>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Cards de Estatísticas */}
                  <div className="dash-stats-3">
                    {[
                      { n:minasPresencas.length,       l:"Presenças registradas", ic:"✅", warn:false },
                      { n:`${presencaCalc.chCumprida}h`, l:"Carga horária",         ic:"⏱", warn:false },
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
                </>
              );
            })()}

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
                  <div style={{ background:"var(--surface2)", borderRadius:"var(--radius)", padding:"1.25rem", display:"flex", gap:"1.5rem", alignItems:"center", flexWrap:"wrap", marginBottom:"1rem" }}>
                    <div style={{ textAlign:"center", flexShrink:0 }}>
                      <QRCodeCanvas ref={el => { fileRefs.current[`qr-${a.id}`] = el; }} value={qrPresencaValue(a.id)} size={140}/>
                      <button className="btn btn-sm btn-outline" style={{ marginTop:"0.6rem", width:"100%" }}
                        onClick={() => {
                          const canvas = fileRefs.current[`qr-${a.id}`];
                          if (!canvas) return;
                          const link = document.createElement("a");
                          link.href = canvas.toDataURL("image/png");
                          link.download = `qrcode-${a.titulo.replace(/\s+/g,"-").toLowerCase()}.png`;
                          link.click();
                        }}>
                        <FontAwesomeIcon icon={faDownload} style={{ marginRight:4 }} />Baixar QR Code
                      </button>
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

                  {/* Materiais */}
                  <div style={{ border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", padding:"1rem" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem" }}>
                      <div style={{ fontWeight:700, color:"var(--navy)", fontSize:"0.88rem" }}>📎 Materiais da Apresentação</div>
                      <label className="btn btn-sm btn-outline" style={{ cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                        <FontAwesomeIcon icon={faUpload} />
                        {uploadingId === a.id ? "Enviando…" : "Enviar arquivo"}
                        <input type="file" style={{ display:"none" }} disabled={uploadingId === a.id}
                          onChange={e => { if (e.target.files[0]) { handleUploadMaterial(a.id, e.target.files[0]); e.target.value=""; } }} />
                      </label>
                    </div>
                    {(a.materiais || []).length === 0 ? (
                      <p style={{ fontSize:"0.82rem", color:"var(--text3)", fontStyle:"italic" }}>Nenhum material enviado ainda.</p>
                    ) : (
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        {(a.materiais || []).map(m => (
                          <div key={m.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"0.4rem 0.6rem", background:"var(--surface2)", borderRadius:6 }}>
                            <a href={m.url} target="_blank" rel="noreferrer"
                              style={{ flex:1, fontSize:"0.83rem", color:"var(--teal)", fontWeight:600, textDecoration:"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              <FontAwesomeIcon icon={faDownload} style={{ marginRight:5 }} />{m.nome}
                            </a>
                            <button className="btn btn-sm btn-danger" style={{ padding:"0.15rem 0.4rem", fontSize:"0.75rem" }}
                              onClick={() => handleRemoverMaterial(a.id, m)}>
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
                      <p style={{ lineHeight:1.85,fontSize:"0.9rem",color:"var(--white-hi)" }}>
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
                      <p style={{ lineHeight:1.85,fontSize:"0.9rem",color:"var(--white-hi)" }}>
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

        {/* ════════════ CREDENCIAL QR (tela ampliada, acessada ao clicar no QR do dashboard) ════════════ */}
        {aba === "credencial_qr" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"1rem", marginBottom:"1.5rem" }}>
              <button className="btn btn-sm btn-outline" onClick={()=>setAba("dashboard")}>← Voltar</button>
              <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:"1.3rem",color:"var(--navy)" }}>🪪 Minha Credencial</h2>
            </div>
            <div style={{ background:"var(--hero-gradient)",borderRadius:"var(--radius-lg)",padding:"2rem",color:"#fff",maxWidth:420,marginBottom:"1.5rem",border:"2px solid var(--gold-border)" }}>
              <div style={{ fontSize:"0.7rem",letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--white-low)",marginBottom:"1.25rem" }}>{event.nome} · {isPalestrante?"Palestrante":"Participante"}</div>
              <div style={{ display:"flex",gap:"1rem",alignItems:"flex-start",marginBottom:"1.5rem" }}>
                <div style={{ width:52,height:52,borderRadius:"50%",background:"rgba(201,168,76,0.2)",border:"2px solid var(--gold)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",fontWeight:700,color:"var(--gold-light)",flexShrink:0 }}>
                  {user.foto_iniciais||user.nome.split(" ").map(n=>n[0]).slice(0,2).join("")}
                </div>
                <div>
                  <div style={{ fontFamily:"'Playfair Display',serif",fontSize:"1.2rem",marginBottom:"0.2rem" }}>{user.nome}</div>
                  <div style={{ fontSize:"0.82rem",color:"var(--white-mid)" }}>{user.cargo||user.titulo} · {user.instituicao}</div>
                  {user.cpf&&<div style={{ fontSize:"0.78rem",color:"var(--white-low)",marginTop:"0.25rem",fontFamily:"monospace" }}>{user.cpf}</div>}
                </div>
              </div>
              <div style={{ borderTop:"1px solid rgba(255,255,255,0.1)",paddingTop:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                {!isPalestrante&&<span className={`badge badge-${user.credenciado?"success":"warn"}`}>{user.credenciado?"✓ Credenciado":"Aguardando"}</span>}
                {isPalestrante&&<span className="badge badge-gold">🎤 Palestrante</span>}
                <div style={{ fontSize:"0.7rem",color:"var(--white-low)",textAlign:"right" }}>
                  <div>{formatData(event.data_inicio)}</div><div>a {formatData(event.data_fim)}</div>
                </div>
              </div>
            </div>
            <div className="presenca-card">
              <h3 style={{ fontWeight:700,color:"var(--navy)",marginBottom:"0.5rem" }}>QR Code de Identificação</h3>
              <p style={{ fontSize:"0.85rem",color:"var(--text2)",marginBottom:"1.25rem" }}>Apresente ao credenciador na entrada do evento.</p>
              <div style={{ display:"flex",gap:"2rem",alignItems:"center",flexWrap:"wrap" }}>
                <QRCodeCanvas value={`ENAUDIN:${isPalestrante?"PALESTRANTE":"PARTICIPANTE"}:${(user.cpf||user.email||user.id).toString().replace(/\D/g,"")}`} size={180}/>
                <div>
                  <div style={{ fontSize:"0.78rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"0.25rem" }}>Identificação</div>
                  <div style={{ fontFamily:"monospace",fontSize:"1rem",fontWeight:700,color:"var(--navy)",marginBottom:"0.75rem" }}>{user.cpf||user.email}</div>
                  <div style={{ fontWeight:600,color:"var(--text)" }}>{user.nome}</div>
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

        {aba === "meus_dados" && (
          <div style={{ maxWidth: 760 }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"var(--navy)", marginBottom:"0.25rem" }}>Meus Dados</h2>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text3)" }}>Informações do seu perfil no evento</p>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem" }}>
              {/* Avatar + cabeçalho */}
              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1.75rem", paddingBottom: "1.25rem", borderBottom: "1px solid var(--border)" }}>
                <AvatarUpload
                  userId={user.id}
                  fotoUrl={user.foto_url}
                  iniciais={user.foto_iniciais || user.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  size={72}
                  onUploaded={url => setUser(prev => ({ ...prev, foto_url: url }))}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.15rem" }}>{user.nome}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text3)" }}>{user.email}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text3)", marginTop: 2 }}>{isPalestrante ? "Palestrante" : "Participante"}</div>
                </div>
                {!editando && (
                  <button className="btn btn-outline btn-sm" style={{ marginLeft: "auto" }}
                    onClick={() => { setFormEdit({ nome: user.nome || "", cpf: user.cpf || "", instituicao: user.instituicao || "", cargo: user.cargo || "", titulo: user.titulo || "", area: user.area || "", mini_bio: user.mini_bio || "", outraInst: false }); setEditando(true); }}>
                    ✏️ Editar
                  </button>
                )}
              </div>

              {editando ? (
                <div>
                  <div className="form-grid">
                    <div className="form-group" style={{ gridColumn: "1/-1" }}>
                      <label className="form-label">Nome completo</label>
                      <input className="form-input" value={formEdit.nome} onChange={e => setFormEdit(f => ({ ...f, nome: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CPF</label>
                      <input className="form-input" style={{ fontFamily: "monospace" }} placeholder="000.000.000-00"
                        value={formEdit.cpf} onChange={e => setFormEdit(f => ({ ...f, cpf: formatCPF(e.target.value) }))} maxLength={14} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">E-mail</label>
                      <input className="form-input" value={user.email} disabled style={{ background: "var(--surface2)", color: "var(--text3)" }} />
                    </div>
                    <div className="form-group" style={{ gridColumn: "1/-1" }}>
                      <label className="form-label">Cargo / Função</label>
                      <input className="form-input" value={formEdit.cargo} onChange={e => setFormEdit(f => ({ ...f, cargo: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ gridColumn: "1/-1" }}>
                      <label className="form-label">Instituição</label>
                      <select className="form-input" value={instituicoes.filter(i => i.ativo).some(i => i.nome === formEdit.instituicao || i.sigla === formEdit.instituicao) ? formEdit.instituicao : (formEdit.instituicao ? "__outro__" : "")}
                        onChange={e => setFormEdit(f => ({ ...f, instituicao: e.target.value === "__outro__" ? "" : e.target.value, outraInst: e.target.value === "__outro__" }))}>
                        <option value="">Selecione...</option>
                        {instituicoes.filter(i => i.ativo).map(i => <option key={i.id} value={i.sigla}>{i.sigla} — {i.nome}</option>)}
                        <option value="__outro__">Outra (digitar)</option>
                      </select>
                      {formEdit.outraInst && (
                        <input className="form-input" style={{ marginTop: "0.4rem" }} placeholder="Nome da instituição"
                          value={formEdit.instituicao} onChange={e => setFormEdit(f => ({ ...f, instituicao: e.target.value }))} autoFocus />
                      )}
                    </div>
                    {isPalestrante && (<>
                      <div className="form-group">
                        <label className="form-label">Título / Formação</label>
                        <input className="form-input" value={formEdit.titulo} onChange={e => setFormEdit(f => ({ ...f, titulo: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Área de Atuação</label>
                        <input className="form-input" value={formEdit.area} onChange={e => setFormEdit(f => ({ ...f, area: e.target.value }))} />
                      </div>
                      <div className="form-group" style={{ gridColumn: "1/-1" }}>
                        <label className="form-label">Mini Biografia</label>
                        <textarea className="form-input" rows={3} value={formEdit.mini_bio} onChange={e => setFormEdit(f => ({ ...f, mini_bio: e.target.value }))} />
                      </div>
                    </>)}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                    <button className="btn btn-primary btn-sm" onClick={salvarEdicao}>Salvar</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditando(false)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem 2rem" }}>
                  {[
                    ["Nome",        user.nome,        "1/-1"],
                    ["CPF",         user.cpf,         null],
                    ["E-mail",      user.email,       null],
                    ["Cargo",       user.cargo,       "1/-1"],
                    ["Instituição", user.instituicao, "1/-1"],
                    ...(isPalestrante ? [
                      ["Título",       user.titulo,   null],
                      ["Área",         user.area,     null],
                      ["Mini Bio",     user.mini_bio, "1/-1"],
                    ] : []),
                  ].map(([label, val, span]) => (
                    <div key={label} style={span ? { gridColumn: span } : {}}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>{label}</div>
                      <div style={{ fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.5 }}>{val || <span style={{ color: "var(--text3)" }}>—</span>}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
