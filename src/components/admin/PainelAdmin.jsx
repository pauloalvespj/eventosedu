import { useState } from "react";
import { PONTOS, NIVEL_LABELS, CATEGORIAS_FORUM } from "../../config/gamificacao";
import { calcPresenca, formatData, formatCPF, TIPO_LABEL, TIPO_COLOR, TIPO_BG, TIPO_ICON, ROLE_LABEL, ROLE_COLOR, getRanking, getNivel, forumAberto, qrPresencaValue } from "../../utils/helpers";
import { Modal, TipoBadge, StarRating, RoleBadge, QRCodeCanvas, IconEdit } from "../base/index";
import {
  atualizarEvento, inserirAtividade, atualizarAtividade, deletarAtividade,
  atualizarProfile, atualizarCredenciamento,
  inserirPresenca, deletarPresenca,
  atualizarForumConfig, fixarTopico, bloquearTopico, deletarTopico,
} from "../../lib/db";

export function PainelAdmin({ user, event, setEvent, atividades, setAtividades, palestrantes, setPalestrantes, participantes, setParticipantes, presencas, setPresencas, admins, setAdmins, topicos, setTopicos, pontuacoes, setPontuacoes, forumConfig, setForumConfig, avaliacoes, setAvaliacoes, onLogout, showToast }) {
  const [aba, setAba] = useState("dashboard");
  const [busca, setBusca] = useState("");
  const [modalAtv, setModalAtv] = useState(null);
  const [modalPal, setModalPal] = useState(null);
  const [modalEvt, setModalEvt] = useState(false);
  const [modalQR, setModalQR] = useState(null);
  const [modalPresManual, setModalPresManual] = useState(null);
  const [formAtv, setFormAtv] = useState({});
  const [formPal, setFormPal] = useState({});
  const [formEvt, setFormEvt] = useState({});
  const [presencaCPF, setPresencaCPF] = useState("");

  const cargaHorariaTotal = atividades.filter(a => a.conta_certificado).reduce((s, a) => s + a.carga_horaria, 0);
  const totalInscritos = participantes.length;
  const totalCredenciados = participantes.filter(p => p.credenciado).length;
  const aptos = participantes.filter(p => calcPresenca(p.id, atividades, presencas, event).apto);

  async function salvarAtividade() {
    if (!formAtv.titulo || !formAtv.dia || !formAtv.horario) { showToast("Preencha os campos obrigatórios", "error"); return; }
    const dados = { ...formAtv, carga_horaria: Number(formAtv.carga_horaria) || 1, conta_certificado: formAtv.conta_certificado === "true" || formAtv.conta_certificado === true };
    if (formAtv.id) {
      setAtividades(prev => prev.map(a => a.id === formAtv.id ? { ...dados } : a));
      atualizarAtividade(formAtv.id, dados);
    } else {
      const tempId = Date.now();
      setAtividades(prev => [...prev, { ...dados, id: tempId }]);
      const { data } = await inserirAtividade({ ...dados, event_id: 1 });
      if (data) setAtividades(prev => prev.map(a => a.id === tempId ? data : a));
    }
    setModalAtv(null); showToast("Atividade salva!", "success");
  }

  async function excluirAtividade(id) {
    if (!confirm("Excluir atividade?")) return;
    setAtividades(prev => prev.filter(a => a.id !== id));
    deletarAtividade(id);
    showToast("Atividade excluída", "info");
  }

  async function salvarPalestrante() {
    if (!formPal.nome) { showToast("Nome obrigatório", "error"); return; }
    if (formPal.id) {
      setPalestrantes(prev => prev.map(p => p.id === formPal.id ? formPal : p));
      atualizarProfile(formPal.id, { nome: formPal.nome, titulo: formPal.titulo, area: formPal.area, mini_bio: formPal.mini_bio, instituicao: formPal.instituicao });
    } else {
      // Novo palestrante requer criação via Edge Function / Admin SDK
      // Por ora apenas atualiza estado local
      const iniciais = formPal.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
      setPalestrantes(prev => [...prev, { ...formPal, id: `local-${Date.now()}`, foto_iniciais: iniciais, role: "palestrante" }]);
      showToast("Palestrante adicionado localmente — crie a conta via setup-users.js para persistir", "info");
    }
    setModalPal(null); showToast("Palestrante salvo!", "success");
  }

  async function credenciarParticipante(id, val) {
    setParticipantes(prev => prev.map(p => p.id === id ? { ...p, credenciado: val } : p));
    atualizarCredenciamento(id, val);
    showToast(val ? "Participante credenciado!" : "Credenciamento removido", val ? "success" : "info");
  }

  async function registrarPresencaManual() {
    const cpf = presencaCPF.replace(/\D/g, "");
    const part = participantes.find(p => p.cpf && p.cpf.replace(/\D/g, "") === cpf);
    if (!part) { showToast("Participante não encontrado", "error"); return; }
    if (presencas.find(p => p.participante_id === part.id && p.atividade_id === modalPresManual.id)) {
      showToast("Presença já registrada", "error"); return;
    }
    const nova = { id: Date.now(), participante_id: part.id, atividade_id: modalPresManual.id, data_hora: new Date().toISOString() };
    setPresencas(prev => [...prev, nova]);
    setPresencaCPF(""); showToast(`Presença de ${part.nome} registrada!`, "success");
    inserirPresenca(part.id, modalPresManual.id);
  }

  function exportarLista() {
    const header = "Nome,CPF,Instituição,Cargo,CH Cumprida,Percentual,Status\n";
    const rows = participantes.map(p => {
      const r = calcPresenca(p.id, atividades, presencas, event);
      return `"${p.nome}","${p.cpf}","${p.instituicao}","${p.cargo}",${r.chCumprida}h,${r.pct}%,${r.apto ? "APTO" : "NÃO APTO"}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "lista_certificados.csv"; a.click();
    showToast("Lista exportada!", "success");
  }

  const isSuperAdmin = user?.role === "super_admin";
  const isCredenciador = user?.role === "credenciador";

  const MENU = [
    { k: "dashboard",      icon: "📊", label: "Dashboard",       roles: ["super_admin","admin","credenciador"] },
    { k: "evento",         icon: "⚙️", label: "Dados do Evento", roles: ["super_admin","admin"] },
    { k: "programacao",    icon: "📅", label: "Programação",     roles: ["super_admin","admin"] },
    { k: "palestrantes",   icon: "🎙", label: "Palestrantes",    roles: ["super_admin","admin"] },
    { k: "inscricoes",     icon: "👥", label: "Inscrições",      roles: ["super_admin","admin"] },
    { k: "credenciamento", icon: "🏷", label: "Credenciamento",  roles: ["super_admin","admin","credenciador"] },
    { k: "presencas",      icon: "✅", label: "Presenças",       roles: ["super_admin","admin"] },
    { k: "certificados",   icon: "🏆", label: "Certificados",    roles: ["super_admin","admin"] },
    { k: "relatorios",     icon: "📈", label: "Relatórios",      roles: ["super_admin","admin"] },
    { k: "avaliacoes",     icon: "⭐", label: "Avaliações",      roles: ["super_admin","admin"] },
    { k: "forum_admin",    icon: "💬", label: "Fórum",           roles: ["super_admin","admin"] },
    { k: "gamificacao",    icon: "🏅", label: "Gamificação",     roles: ["super_admin","admin"] },
    { k: "usuarios",       icon: "🔐", label: "Usuários",        roles: ["super_admin"] },
  ].filter(m => m.roles.includes(user?.role || "admin"));

  // Estado para gestão de usuários
  const [modalAdmin, setModalAdmin] = useState(null);
  const [formAdmin, setFormAdmin] = useState({});

  // Estado para edição inline de participantes
  const [editPart, setEditPart] = useState(null);
  const [formPart, setFormPart] = useState({});

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <div className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <h2>{event.nome}</h2>
          <p style={{ fontSize: "0.68rem", opacity: 0.5, marginTop: "0.1rem" }}>Painel Administrativo</p>
        </div>
        <nav className="admin-nav">
          {MENU.map(m => (
            <div key={m.k} className={`admin-nav-item${aba === m.k ? " active" : ""}`} onClick={() => setAba(m.k)}>
              <span className="admin-nav-icon">{m.icon}</span>
              {m.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Info do usuário logado */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(201,168,76,0.2)", border: "1.5px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, color: "var(--gold-light)", flexShrink: 0 }}>
              {user?.foto_iniciais || user?.nome?.split(" ").map(n=>n[0]).slice(0,2).join("") || "?"}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.8)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.nome}</div>
              <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>{ROLE_LABEL[user?.role] || user?.role}</div>
            </div>
          </div>
          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", marginBottom: "0.5rem" }}>
            {participantes.length} inscritos · {participantes.filter(p=>p.credenciado).length} credenciados
          </div>
          <button className="btn btn-sm btn-outline" style={{ color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.2)", width: "100%" }} onClick={onLogout}>
            ← Sair
          </button>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="admin-content">

        {/* DASHBOARD */}
        {aba === "dashboard" && (
          <div>
            <div className="admin-topbar">
              <div>
                <h1>Dashboard</h1>
                <p>Visão geral do evento</p>
              </div>
              <span className="badge badge-navy">{event.nome.substring(0, 30)}...</span>
            </div>
            <div className="dash-grid">
              {[
                { n: totalInscritos, l: "Total de Inscritos", ic: "👥", c: "navy" },
                { n: totalCredenciados, l: "Credenciados", ic: "🏷", c: "teal" },
                { n: presencas.length, l: "Registros de Presença", ic: "✅", c: "success" },
                { n: aptos.length, l: "Aptos ao Certificado", ic: "🏆", c: "gold" },
                { n: atividades.length, l: "Atividades Cadastradas", ic: "📅", c: "navy" },
                { n: `${cargaHorariaTotal}h`, l: "Carga Horária (Cert.)", ic: "⏱", c: "teal" },
              ].map((c, i) => (
                <div key={i} className="dash-card">
                  <div className={`dash-card-icon ${c.c}`} style={{ fontSize: "20px" }}>{c.ic}</div>
                  <div className="dash-card-num">{c.n}</div>
                  <div className="dash-card-lbl">{c.l}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div className="table-wrap">
                <div className="table-header"><span className="table-title">Atividades mais frequentadas</span></div>
                <table>
                  <thead><tr><th>Atividade</th><th>Presenças</th></tr></thead>
                  <tbody>
                    {atividades.map(a => {
                      const cnt = presencas.filter(p => p.atividade_id === a.id).length;
                      return (
                        <tr key={a.id}>
                          <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.titulo}</td>
                          <td><span className="badge badge-navy">{cnt}</span></td>
                        </tr>
                      );
                    }).sort((a, b) => presencas.filter(p => p.atividade_id === b.key).length - presencas.filter(p => p.atividade_id === a.key).length)}
                  </tbody>
                </table>
              </div>
              <div className="table-wrap">
                <div className="table-header"><span className="table-title">Status dos participantes</span></div>
                <table>
                  <thead><tr><th>Participante</th><th>Presença</th><th>Status</th></tr></thead>
                  <tbody>
                    {participantes.slice(0, 6).map(p => {
                      const r = calcPresenca(p.id, atividades, presencas, event);
                      return (
                        <tr key={p.id}>
                          <td>{p.nome.split(" ").slice(0, 2).join(" ")}</td>
                          <td>{r.pct}%</td>
                          <td><span className={`badge badge-${r.apto ? "success" : "warn"}`}>{r.apto ? "Apto" : "Pendente"}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* EVENTO */}
        {aba === "evento" && (
          <div>
            <div className="admin-topbar">
              <div><h1>Dados do Evento</h1><p>Configurações gerais</p></div>
              {!modalEvt
                ? <button className="btn btn-primary" onClick={() => { setFormEvt({ ...event }); setModalEvt(true); }}><IconEdit /> Editar</button>
                : <div style={{ display:"flex", gap:"0.5rem" }}>
                    <button className="btn btn-outline" onClick={() => setModalEvt(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => { setEvent(formEvt); setModalEvt(false); atualizarEvento(event.id, formEvt); showToast("Evento atualizado!", "success"); }}>💾 Salvar</button>
                  </div>
              }
            </div>

            {!modalEvt ? (
              /* ── MODO VISUALIZAÇÃO ── */
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem" }}>
                {/* Card principal */}
                <div style={{ gridColumn:"1/-1", background:"linear-gradient(135deg,#0a1f40,#0f3460)", borderRadius:"var(--radius-lg)", padding:"2rem", color:"#fff" }}>
                  <div style={{ fontSize:"0.72rem", letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(255,255,255,0.45)", marginBottom:"0.5rem" }}>Evento</div>
                  <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.6rem", color:"var(--gold-light)", marginBottom:"0.35rem" }}>{event.nome}</h2>
                  <p style={{ fontSize:"0.95rem", color:"rgba(255,255,255,0.7)", marginBottom:"1rem", lineHeight:1.5 }}>{event.subtitulo}</p>
                  <div style={{ display:"flex", gap:"2rem", flexWrap:"wrap" }}>
                    <div><div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.4)", marginBottom:2 }}>Período</div><div style={{ fontWeight:600 }}>{formatData(event.data_inicio)} – {formatData(event.data_fim)}</div></div>
                    <div><div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.4)", marginBottom:2 }}>Local</div><div style={{ fontWeight:600 }}>{event.local}</div></div>
                    <div><div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.4)", marginBottom:2 }}>Mín. presença</div><div style={{ fontWeight:600 }}>{event.percentual_minimo}%</div></div>
                    <div><div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.4)", marginBottom:2 }}>Carga horária</div><div style={{ fontWeight:600 }}>{event.carga_horaria_total}h</div></div>
                  </div>
                </div>

                {[
                  ["📋 Nome Completo", event.nome_completo],
                  ["📍 Endereço", event.endereco],
                  ["🏛 Realização", event.realizacao],
                  ["⏱ Encerramento", event.horario_encerramento],
                ].map(([k, v]) => (
                  <div key={k} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"1.25rem" }}>
                    <div style={{ fontSize:"0.72rem", fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"0.5rem" }}>{k}</div>
                    <div style={{ color:"var(--text)", fontSize:"0.9rem", lineHeight:1.6 }}>{v || <span style={{ color:"var(--text3)" }}>–</span>}</div>
                  </div>
                ))}

                <div style={{ gridColumn:"1/-1", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"1.25rem" }}>
                  <div style={{ fontSize:"0.72rem", fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"0.5rem" }}>📝 Descrição / Objetivo</div>
                  <div style={{ color:"var(--text2)", fontSize:"0.9rem", lineHeight:1.75 }}>{event.descricao}</div>
                </div>
              </div>
            ) : (
              /* ── MODO EDIÇÃO ── */
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem" }}>
                <div className="form-group" style={{ gridColumn:"1/-1" }}>
                  <label className="form-label">Nome curto</label>
                  <input className="form-input" value={formEvt.nome||""} onChange={e => setFormEvt(f=>({...f,nome:e.target.value}))} />
                </div>
                <div className="form-group" style={{ gridColumn:"1/-1" }}>
                  <label className="form-label">Nome Completo</label>
                  <input className="form-input" value={formEvt.nome_completo||""} onChange={e => setFormEvt(f=>({...f,nome_completo:e.target.value}))} />
                </div>
                <div className="form-group" style={{ gridColumn:"1/-1" }}>
                  <label className="form-label">Subtítulo / Tema</label>
                  <input className="form-input" value={formEvt.subtitulo||""} onChange={e => setFormEvt(f=>({...f,subtitulo:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Data Início</label>
                  <input type="date" className="form-input" value={formEvt.data_inicio||""} onChange={e => setFormEvt(f=>({...f,data_inicio:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Data Fim</label>
                  <input type="date" className="form-input" value={formEvt.data_fim||""} onChange={e => setFormEvt(f=>({...f,data_fim:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Horário Encerramento</label>
                  <input type="time" className="form-input" value={formEvt.horario_encerramento||""} onChange={e => setFormEvt(f=>({...f,horario_encerramento:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Percentual Mínimo (%)</label>
                  <input type="number" className="form-input" min={0} max={100} value={formEvt.percentual_minimo||""} onChange={e => setFormEvt(f=>({...f,percentual_minimo:Number(e.target.value)}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Carga Horária Total (h)</label>
                  <input type="number" className="form-input" min={1} value={formEvt.carga_horaria_total||""} onChange={e => setFormEvt(f=>({...f,carga_horaria_total:Number(e.target.value)}))} />
                </div>
                <div className="form-group" style={{ gridColumn:"1/-1" }}>
                  <label className="form-label">Local</label>
                  <input className="form-input" value={formEvt.local||""} onChange={e => setFormEvt(f=>({...f,local:e.target.value}))} />
                </div>
                <div className="form-group" style={{ gridColumn:"1/-1" }}>
                  <label className="form-label">Endereço</label>
                  <input className="form-input" value={formEvt.endereco||""} onChange={e => setFormEvt(f=>({...f,endereco:e.target.value}))} />
                </div>
                <div className="form-group" style={{ gridColumn:"1/-1" }}>
                  <label className="form-label">Realização</label>
                  <textarea className="form-input" rows={2} value={formEvt.realizacao||""} onChange={e => setFormEvt(f=>({...f,realizacao:e.target.value}))} />
                </div>
                <div className="form-group" style={{ gridColumn:"1/-1" }}>
                  <label className="form-label">Descrição / Objetivo</label>
                  <textarea className="form-input" rows={4} value={formEvt.descricao||""} onChange={e => setFormEvt(f=>({...f,descricao:e.target.value}))} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROGRAMAÇÃO */}
        {aba === "programacao" && (
          <div>
            <div className="admin-topbar">
              <div><h1>Programação</h1><p>Atividades e palestras</p></div>
              <button className="btn btn-primary" onClick={() => { setFormAtv({ conta_certificado: true, carga_horaria: 1, tipo: "palestra", convidados: "" }); setModalAtv(true); }}>+ Nova Atividade</button>
            </div>
            <div className="table-wrap">
              <div className="table-header">
                <span className="table-title">Atividades ({atividades.length})</span>
                <input className="search-input" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <table style={{ width: "100%", tableLayout: "auto", fontSize: "0.82rem" }}>
                <thead><tr>
                  <th style={{ whiteSpace:"nowrap" }}>Tipo</th>
                  <th style={{ width:"40%" }}>Título</th>
                  <th style={{ width: 82 }}>Dia</th>
                  <th style={{ width: 100 }}>Horário</th>
                  <th style={{ width: 44 }}>CH</th>
                  <th style={{ width: 52 }}>Cert.</th>
                  <th style={{ width: 52 }}>Pres.</th>
                  <th style={{ width: 112 }}>Ações</th>
                </tr></thead>
                <tbody>
                  {atividades.filter(a => a.titulo.toLowerCase().includes(busca.toLowerCase())).map(a => (
                    <tr key={a.id}>
                      <td><span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"0.15rem 0.5rem", borderRadius:50, fontSize:"0.7rem", fontWeight:700, background: TIPO_BG[a.tipo]||"#eee", color: TIPO_COLOR[a.tipo]||"#333", whiteSpace:"nowrap" }}>{TIPO_ICON[a.tipo]} {TIPO_LABEL[a.tipo]||a.tipo}</span></td>
                      <td style={{ fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={a.titulo}>{a.titulo}</td>
                      <td style={{ fontSize:"0.78rem" }}>{formatData(a.dia)}</td>
                      <td style={{ whiteSpace:"nowrap", fontSize:"0.78rem" }}>{a.horario}{a.horario_fim ? `–${a.horario_fim}` : ""}</td>
                      <td style={{ fontSize:"0.78rem" }}>{a.carga_horaria}h</td>
                      <td><span className={`badge badge-${a.conta_certificado ? "success" : "warn"}`} style={{ fontSize:"0.68rem" }}>{a.conta_certificado ? "Sim" : "Não"}</span></td>
                      <td style={{ textAlign:"center" }}>{presencas.filter(p => p.atividade_id === a.id).length}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.2rem" }}>
                          <button className="btn btn-sm btn-outline" onClick={() => setModalQR(a)} title="QR Code">QR</button>
                          <button className="btn btn-sm btn-outline" onClick={() => { setModalPresManual(a); setPresencaCPF(""); }} title="Presença manual">+P</button>
                          <button className="btn btn-sm btn-outline" onClick={() => { setFormAtv({ ...a, conta_certificado: a.conta_certificado ? "true" : "false" }); setModalAtv(true); }}><IconEdit /></button>
                          <button className="btn btn-sm btn-danger" onClick={() => excluirAtividade(a.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MODAL ATIVIDADE */}
            <Modal show={!!modalAtv} onClose={() => setModalAtv(null)} title={formAtv.id ? "Editar Atividade" : "Nova Atividade"}>
              <div className="form-group">
                <label className="form-label">Tipo de Atividade</label>
                <select className="form-input" value={formAtv.tipo || "palestra"} onChange={e => setFormAtv(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="palestra">🎤 Palestra</option>
                  <option value="mesa_redonda">🗣️ Mesa Redonda</option>
                  <option value="painel">🗣️ Painel</option>
                  <option value="solenidade">🏛 Solenidade</option>
                  <option value="encerramento">🎓 Encerramento</option>
                  <option value="intervalo">☕ Intervalo</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Título *</label><input className="form-input" value={formAtv.titulo || ""} onChange={e => setFormAtv(f => ({ ...f, titulo: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Descrição</label><textarea className="form-input" rows={2} value={formAtv.descricao || ""} onChange={e => setFormAtv(f => ({ ...f, descricao: e.target.value }))} /></div>
              <div className="form-grid">
                <div className="form-group"><label className="form-label">Dia *</label><input type="date" className="form-input" value={formAtv.dia || ""} onChange={e => setFormAtv(f => ({ ...f, dia: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Horário início *</label><input type="time" className="form-input" value={formAtv.horario || ""} onChange={e => setFormAtv(f => ({ ...f, horario: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Horário fim</label><input type="time" className="form-input" value={formAtv.horario_fim || ""} onChange={e => setFormAtv(f => ({ ...f, horario_fim: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Local</label><input className="form-input" value={formAtv.local || ""} onChange={e => setFormAtv(f => ({ ...f, local: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Carga Horária (h)</label><input type="number" min={0} step={0.25} className="form-input" value={formAtv.carga_horaria || 0} onChange={e => setFormAtv(f => ({ ...f, carga_horaria: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Palestrante</label>
                  <select className="form-input" value={formAtv.palestrante_id || ""} onChange={e => setFormAtv(f => ({ ...f, palestrante_id: e.target.value }))}>
                    <option value="">Nenhum / Múltiplos</option>
                    {palestrantes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Conta para certificado</label>
                  <select className="form-input" value={formAtv.conta_certificado} onChange={e => setFormAtv(f => ({ ...f, conta_certificado: e.target.value }))}>
                    <option value="true">Sim</option><option value="false">Não</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Convidados / Participantes (um por linha)</label>
                <textarea className="form-input" rows={3} placeholder={"Ex:\nReitor da UFC\nSuperintendente da CGU"} value={formAtv.convidados || ""} onChange={e => setFormAtv(f => ({ ...f, convidados: e.target.value }))} />
                <div style={{ fontSize:"0.75rem", color:"var(--text3)", marginTop:3 }}>Use para solenidades, mesas redondas e painéis com múltiplos participantes</div>
              </div>
              <button className="btn btn-primary btn-block" onClick={salvarAtividade}>Salvar</button>
            </Modal>

            {/* MODAL QR CODE */}
            <Modal show={!!modalQR} onClose={() => setModalQR(null)} title="QR Code de Presença">
              {modalQR && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ marginBottom: "1rem", color: "var(--text2)", fontSize: "0.9rem", fontWeight: 600 }}>{modalQR.titulo}</p>
                  <p style={{ marginBottom: "1.25rem", fontSize: "0.8rem", color: "var(--text3)" }}>{formatData(modalQR.dia)} · {modalQR.horario} · {modalQR.local}</p>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
                    <QRCodeCanvas value={qrPresencaValue(modalQR.id)} size={200} />
                  </div>
                  <div style={{ background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: "0.85rem", fontSize: "0.82rem", color: "var(--text2)", marginBottom: "1rem", textAlign: "left" }}>
                    <strong>Como usar:</strong> Exiba este QR Code no projetor durante a atividade. Os participantes apontam a câmera, são direcionados à página de confirmação e confirmam presença com 1 clique (se logados) ou digitando o CPF.
                  </div>
                  <div style={{ padding: "0.5rem 0.75rem", background: "var(--gold-pale)", borderRadius: "var(--radius-sm)", fontSize: "0.78rem", color: "var(--warn)", fontFamily: "monospace", marginBottom: "1rem" }}>
                    {qrPresencaValue(modalQR.id)}
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={() => {
                    const canvas = document.querySelector("canvas");
                    if (canvas) { const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = `qrcode-atividade-${modalQR.id}.png`; a.click(); }
                  }}>⬇ Baixar PNG</button>
                </div>
              )}
            </Modal>

            {/* MODAL PRESENÇA MANUAL */}
            <Modal show={!!modalPresManual} onClose={() => setModalPresManual(null)} title="Registrar Presença Manual">
              {modalPresManual && (
                <div>
                  <p style={{ color: "var(--text2)", marginBottom: "1rem" }}>{modalPresManual.titulo}</p>
                  <div className="form-group">
                    <label className="form-label">CPF do Participante</label>
                    <input className="form-input" placeholder="000.000.000-00" value={presencaCPF}
                      onChange={e => setPresencaCPF(formatCPF(e.target.value))} maxLength={14} />
                  </div>
                  <button className="btn btn-success btn-block" onClick={registrarPresencaManual}>Registrar Presença</button>
                  <div style={{ marginTop: "1.5rem" }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text2)", marginBottom: "0.5rem" }}>Presenças nesta atividade ({presencas.filter(p => p.atividade_id === modalPresManual.id).length})</div>
                    {presencas.filter(p => p.atividade_id === modalPresManual.id).map(p => {
                      const part = participantes.find(x => x.id === p.participante_id);
                      return part ? (
                        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                          <span>{part.nome}</span>
                          <span style={{ color: "var(--text3)" }}>{p.data_hora}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </Modal>
          </div>
        )}

        {/* PALESTRANTES */}
        {aba === "palestrantes" && (
          <div>
            <div className="admin-topbar">
              <div><h1>Palestrantes</h1></div>
              <button className="btn btn-primary" onClick={() => { setFormPal({}); setModalPal(true); }}>+ Novo Palestrante</button>
            </div>
            <div className="table-wrap">
              <div className="table-header"><span className="table-title">Palestrantes ({palestrantes.length})</span></div>
              <table>
                <thead><tr><th>Nome</th><th>Título</th><th>Área</th><th>Ações</th></tr></thead>
                <tbody>
                  {palestrantes.map(p => (
                    <tr key={p.id}>
                      <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 700, flexShrink: 0 }}>{p.foto_iniciais}</div>
                        <span style={{ fontWeight: 500 }}>{p.nome}</span>
                      </div></td>
                      <td style={{ fontSize: "0.85rem", color: "var(--text2)" }}>{p.titulo}</td>
                      <td><span className="badge badge-navy">{p.area}</span></td>
                      <td><div style={{ display: "flex", gap: "0.25rem" }}>
                        <button className="btn btn-sm btn-outline" onClick={() => { setFormPal({ ...p }); setModalPal(true); }}><IconEdit /></button>
                        <button className="btn btn-sm btn-danger" onClick={() => { setPalestrantes(prev => prev.filter(x => x.id !== p.id)); showToast("Palestrante removido", "info"); }}>✕</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Modal show={!!modalPal} onClose={() => setModalPal(null)} title={formPal.id ? "Editar Palestrante" : "Novo Palestrante"}>
              <div className="form-group"><label className="form-label">Nome *</label><input className="form-input" value={formPal.nome || ""} onChange={e => setFormPal(f => ({ ...f, nome: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Título/Formação</label><input className="form-input" value={formPal.titulo || ""} onChange={e => setFormPal(f => ({ ...f, titulo: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Área de Atuação</label><input className="form-input" value={formPal.area || ""} onChange={e => setFormPal(f => ({ ...f, area: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Instituição</label><input className="form-input" value={formPal.instituicao || ""} onChange={e => setFormPal(f => ({ ...f, instituicao: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Mini Biografia</label><textarea className="form-input" rows={2} value={formPal.mini_bio || ""} onChange={e => setFormPal(f => ({ ...f, mini_bio: e.target.value }))} /></div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "0.5rem", marginBottom: "0.5rem" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>Credenciais de Acesso</div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" type="email" value={formPal.email || ""} onChange={e => setFormPal(f => ({ ...f, email: e.target.value }))} /></div>
                  <div className="form-group"><label className="form-label">Senha</label><input className="form-input" type="password" placeholder="Mín. 6 caracteres" value={formPal.senha || ""} onChange={e => setFormPal(f => ({ ...f, senha: e.target.value }))} /></div>
                </div>
              </div>
              <button className="btn btn-primary btn-block" onClick={salvarPalestrante}>Salvar</button>
            </Modal>
          </div>
        )}

        {/* INSCRIÇÕES */}
        {aba === "inscricoes" && (
          <div>
            <div className="admin-topbar">
              <div><h1>Inscrições</h1><p>{participantes.length} participantes inscritos</p></div>
            </div>
            <div className="table-wrap">
              <div className="table-header">
                <span className="table-title">Participantes ({participantes.filter(p => {
                  const q = busca.toLowerCase();
                  return !q || p.nome?.toLowerCase().includes(q) || p.cpf?.includes(q) || p.instituicao?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
                }).length})</span>
                <input className="search-input" placeholder="Buscar por nome, CPF, instituição..."
                  value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <table style={{ width:"100%", fontSize:"0.83rem" }}>
                <thead><tr><th>Nome</th><th>CPF</th><th>Instituição / Cargo</th><th>E-mail</th><th>Status</th><th style={{ width:100 }}>Ações</th></tr></thead>
                <tbody>
                  {participantes.filter(p => {
                    const q = busca.toLowerCase();
                    return !q || p.nome?.toLowerCase().includes(q) || p.cpf?.includes(q) || p.instituicao?.toLowerCase().includes(q) || p.cargo?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
                  }).map(p => editPart === p.id ? (
                    <tr key={p.id} style={{ background:"var(--gold-pale)" }}>
                      <td><input className="form-input" style={{ padding:"0.3rem 0.5rem", fontSize:"0.82rem" }} value={formPart.nome||""} onChange={e => setFormPart(f=>({...f,nome:e.target.value}))} /></td>
                      <td><input className="form-input" style={{ padding:"0.3rem 0.5rem", fontSize:"0.82rem", fontFamily:"monospace", width:130 }} value={formPart.cpf||""} onChange={e => setFormPart(f=>({...f,cpf:e.target.value}))} /></td>
                      <td>
                        <input className="form-input" style={{ padding:"0.3rem 0.5rem", fontSize:"0.82rem", marginBottom:3 }} placeholder="Instituição" value={formPart.instituicao||""} onChange={e => setFormPart(f=>({...f,instituicao:e.target.value}))} />
                        <input className="form-input" style={{ padding:"0.3rem 0.5rem", fontSize:"0.82rem" }} placeholder="Cargo" value={formPart.cargo||""} onChange={e => setFormPart(f=>({...f,cargo:e.target.value}))} />
                      </td>
                      <td><input className="form-input" style={{ padding:"0.3rem 0.5rem", fontSize:"0.82rem" }} value={formPart.email||""} onChange={e => setFormPart(f=>({...f,email:e.target.value}))} /></td>
                      <td><span className={`badge badge-${p.credenciado?"success":"warn"}`}>{p.credenciado?"Credenciado":"Inscrito"}</span></td>
                      <td>
                        <div style={{ display:"flex", gap:"0.25rem" }}>
                          <button className="btn btn-sm btn-primary" onClick={() => {
                            setParticipantes(prev => prev.map(x => x.id === formPart.id ? { ...formPart } : x));
                            atualizarProfile(formPart.id, { nome:formPart.nome, cpf:formPart.cpf, instituicao:formPart.instituicao, cargo:formPart.cargo, email:formPart.email });
                            setEditPart(null); showToast("Participante atualizado!", "success");
                          }}>✓</button>
                          <button className="btn btn-sm btn-outline" onClick={() => setEditPart(null)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id}>
                      <td style={{ fontWeight:500 }}>{p.nome}</td>
                      <td style={{ fontFamily:"monospace", fontSize:"0.82rem" }}>{p.cpf}</td>
                      <td><div>{p.instituicao}</div><div style={{ fontSize:"0.78rem", color:"var(--text3)" }}>{p.cargo}</div></td>
                      <td style={{ fontSize:"0.82rem", color:"var(--text2)" }}>{p.email}</td>
                      <td><span className={`badge badge-${p.credenciado?"success":"warn"}`}>{p.credenciado?"Credenciado":"Inscrito"}</span></td>
                      <td>
                        <div style={{ display:"flex", gap:"0.25rem" }}>
                          <button className="btn btn-sm btn-outline" onClick={() => { setFormPart({...p}); setEditPart(p.id); }} title="Editar"><IconEdit /></button>
                          <button className="btn btn-sm btn-danger" onClick={() => {
                            if (!confirm(`Remover "${p.nome}" das inscrições?`)) return;
                            setParticipantes(prev => prev.filter(x => x.id !== p.id));
                            atualizarProfile(p.id, { ativo: false });
                            showToast("Participante removido.", "info");
                          }} title="Remover">🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CREDENCIAMENTO */}
        {aba === "credenciamento" && (
          <div>
            <div className="admin-topbar"><div><h1>Credenciamento</h1><p>Recepção do evento</p></div></div>
            <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
              <h3 style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "1rem" }}>Busca Rápida</h3>
              <input className="form-input" placeholder="Buscar por nome, CPF ou e-mail..."
                value={busca} onChange={e => setBusca(e.target.value)} style={{ marginBottom: "1rem" }} />
            </div>
            <div className="table-wrap">
              <div className="table-header">
                <span className="table-title">{participantes.filter(p => p.credenciado).length}/{participantes.length} credenciados</span>
              </div>
              <table>
                <thead><tr><th>Participante</th><th>CPF</th><th>Instituição</th><th>Credenciamento</th><th>Ação</th></tr></thead>
                <tbody>
                  {participantes.filter(p => {
                    const q = busca.toLowerCase();
                    return !q || p.nome.toLowerCase().includes(q) || p.cpf.includes(q) || p.email.toLowerCase().includes(q);
                  }).map(p => (
                    <tr key={p.id}>
                      <td><div>
                        <div style={{ fontWeight: 600 }}>{p.nome}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text3)" }}>{p.email}</div>
                      </div></td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{p.cpf}</td>
                      <td>{p.instituicao}</td>
                      <td><span className={`badge badge-${p.credenciado ? "success" : "warn"}`}>{p.credenciado ? "✓ Credenciado" : "Aguardando"}</span></td>
                      <td>
                        {p.credenciado
                          ? <button className="btn btn-sm btn-outline" onClick={() => credenciarParticipante(p.id, false)}>Remover</button>
                          : <button className="btn btn-sm btn-success" onClick={() => credenciarParticipante(p.id, true)}>✓ Credenciar</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PRESENÇAS */}
        {aba === "presencas" && (
          <div>
            <div className="admin-topbar"><div><h1>Presenças</h1><p>{presencas.length} registros totais</p></div></div>
            <div className="table-wrap">
              <div className="table-header">
                <span className="table-title">Registros de Presença</span>
                <input className="search-input" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <table>
                <thead><tr><th>Participante</th><th>CPF</th><th>Atividade</th><th>Data/Hora</th></tr></thead>
                <tbody>
                  {presencas.map(p => {
                    const part = participantes.find(x => x.id === p.participante_id);
                    const at = atividades.find(a => a.id === p.atividade_id);
                    if (!part || !at) return null;
                    const q = busca.toLowerCase();
                    if (q && !part.nome.toLowerCase().includes(q) && !at.titulo.toLowerCase().includes(q)) return null;
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{part.nome}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{part.cpf}</td>
                        <td>{at.titulo}</td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text2)" }}>{p.data_hora}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CERTIFICADOS */}
        {aba === "certificados" && (
          <div>
            <div className="admin-topbar">
              <div><h1>Certificados</h1><p>Gestão e emissão</p></div>
              <button className="btn btn-gold" onClick={exportarLista}>⬇ Exportar Lista CSV</button>
            </div>
            <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid var(--border)", display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "0.78rem", color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Percentual Mínimo</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--navy)" }}>{event.percentual_minimo}%</div>
              </div>
              <div>
                <div style={{ fontSize: "0.78rem", color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>CH para Certificado</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--teal)" }}>{cargaHorariaTotal}h</div>
              </div>
              <div>
                <div style={{ fontSize: "0.78rem", color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Aptos</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--success)" }}>{aptos.length}/{participantes.length}</div>
              </div>
            </div>
            <div className="table-wrap">
              <div className="table-header"><span className="table-title">Lista de Participantes</span></div>
              <table>
                <thead><tr><th>Nome</th><th>CPF</th><th>Instituição</th><th>Cargo</th><th>CH Cumprida</th><th>Percentual</th><th>Status</th></tr></thead>
                <tbody>
                  {participantes.map(p => {
                    const r = calcPresenca(p.id, atividades, presencas, event);
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.nome}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{p.cpf}</td>
                        <td>{p.instituicao}</td>
                        <td>{p.cargo}</td>
                        <td>{r.chCumprida}h / {r.chTotal}h</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${Math.min(r.pct, 100)}%`, background: r.apto ? "var(--success)" : "var(--danger)", borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{r.pct}%</span>
                          </div>
                        </td>
                        <td><span className={`badge badge-${r.apto ? "success" : "danger"}`}>{r.apto ? "APTO" : "NÃO APTO"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RELATÓRIOS */}
        {aba === "relatorios" && (
          <div>
            <div className="admin-topbar">
              <div><h1>Relatórios</h1><p>Análise e exportação de dados</p></div>
            </div>

            {/* Mapa de presença por atividade */}
            <div className="table-wrap" style={{ marginBottom: "1.5rem" }}>
              <div className="table-header">
                <span className="table-title">📊 Presença por Atividade</span>
                <button className="btn btn-sm btn-outline" onClick={() => {
                  const header = "Atividade,Tipo,Dia,Horário,CH,Presentes,% Comparecimento\n";
                  const rows = atividades.filter(a => a.tipo !== "intervalo").map(a => {
                    const cnt = presencas.filter(p => p.atividade_id === a.id).length;
                    const pct = participantes.length > 0 ? Math.round((cnt / participantes.length) * 100) : 0;
                    return `"${a.titulo}","${TIPO_LABEL[a.tipo]||a.tipo}","${formatData(a.dia)}","${a.horario}",${a.carga_horaria}h,${cnt},${pct}%`;
                  }).join("\n");
                  const blob = new Blob([header+rows],{type:"text/csv"});
                  const el=document.createElement("a");el.href=URL.createObjectURL(blob);el.download="presenca_por_atividade.csv";el.click();
                  showToast("CSV exportado!","success");
                }}>⬇ CSV</button>
              </div>
              <table>
                <thead><tr><th>Atividade</th><th>Tipo</th><th>Dia</th><th>Presentes</th><th>Comparecimento</th></tr></thead>
                <tbody>
                  {atividades.filter(a => a.tipo !== "intervalo").map(a => {
                    const cnt = presencas.filter(p => p.atividade_id === a.id).length;
                    const pct = participantes.length > 0 ? Math.round((cnt / participantes.length) * 100) : 0;
                    return (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 500, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.titulo}</td>
                        <td><TipoBadge tipo={a.tipo} /></td>
                        <td style={{ fontSize: "0.85rem" }}>{formatData(a.dia)}</td>
                        <td><span className="badge badge-navy">{cnt}</span></td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
                            <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: pct >= 75 ? "var(--success)" : pct >= 50 ? "var(--gold)" : "var(--danger)", borderRadius: 4, transition: "width 0.6s" }} />
                            </div>
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, minWidth: 36 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Presenças por instituição */}
            <div className="table-wrap" style={{ marginBottom: "1.5rem" }}>
              <div className="table-header"><span className="table-title">🏛 Participantes por Instituição</span></div>
              <table>
                <thead><tr><th>Instituição</th><th>Inscritos</th><th>Credenciados</th><th>Aptos ao Certificado</th></tr></thead>
                <tbody>
                  {[...new Set(participantes.map(p => p.instituicao))].sort().map(inst => {
                    const pts = participantes.filter(p => p.instituicao === inst);
                    const cred = pts.filter(p => p.credenciado).length;
                    const aptosInst = pts.filter(p => calcPresenca(p.id, atividades, presencas, event).apto).length;
                    return (
                      <tr key={inst}>
                        <td style={{ fontWeight: 600 }}>{inst}</td>
                        <td>{pts.length}</td>
                        <td><span className="badge badge-teal">{cred}</span></td>
                        <td><span className={`badge badge-${aptosInst > 0 ? "success" : "warn"}`}>{aptosInst}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Resumo geral exportável */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={exportarLista}>⬇ Exportar Lista de Certificados (CSV)</button>
              <button className="btn btn-outline" onClick={() => {
                const header = "Nome,CPF,Instituição,Cargo,Sexo,E-mail,Credenciado\n";
                const rows = participantes.map(p => `"${p.nome}","${p.cpf}","${p.instituicao}","${p.cargo}","${p.sexo}","${p.email}","${p.credenciado?"Sim":"Não"}"`).join("\n");
                const blob = new Blob([header+rows],{type:"text/csv"});
                const el=document.createElement("a");el.href=URL.createObjectURL(blob);el.download="lista_inscritos.csv";el.click();
                showToast("Lista de inscritos exportada!","success");
              }}>⬇ Lista de Inscritos (CSV)</button>
              <button className="btn btn-outline" onClick={() => {
                const header = "Nome,CPF,Instituição,Atividade,Data/Hora\n";
                const rows = presencas.map(p => {
                  const part = participantes.find(x => x.id === p.participante_id);
                  const at = atividades.find(a => a.id === p.atividade_id);
                  if (!part || !at) return "";
                  return `"${part.nome}","${part.cpf}","${part.instituicao}","${at.titulo}","${p.data_hora}"`;
                }).filter(Boolean).join("\n");
                const blob = new Blob([header+rows],{type:"text/csv"});
                const el=document.createElement("a");el.href=URL.createObjectURL(blob);el.download="registro_presencas.csv";el.click();
                showToast("Registro de presenças exportado!","success");
              }}>⬇ Registro de Presenças (CSV)</button>
            </div>
          </div>
        )}

        {/* ── AVALIAÇÕES ── */}
        {aba === "avaliacoes" && (
          <div>
            <div className="admin-topbar">
              <div><h1>Avaliações das Palestras</h1><p>Feedback dos participantes por atividade</p></div>
              <button className="btn btn-sm btn-outline" onClick={() => {
                const header = "Atividade,Dia,Palestrante,Avaliações,Média,Comentários\n";
                const rows = atividades.filter(a => a.tipo !== "intervalo" && a.tipo !== "encerramento").map(a => {
                  const avs = avaliacoes.filter(av => av.atividade_id === a.id);
                  const media = avs.length ? (avs.reduce((s,av)=>s+av.estrelas,0)/avs.length).toFixed(1) : "–";
                  const pal = palestrantes.find(p=>p.id===a.palestrante_id);
                  const comentarios = avs.filter(av=>av.comentario).map(av=>`"${av.comentario}"`).join(" | ");
                  return `"${a.titulo}","${formatData(a.dia)}","${pal?.nome||"–"}",${avs.length},${media},"${comentarios}"`;
                }).join("\n");
                const blob=new Blob([header+rows],{type:"text/csv"});
                const el=document.createElement("a");el.href=URL.createObjectURL(blob);el.download="avaliacoes_palestras.csv";el.click();
                showToast("Exportado!","success");
              }}>⬇ Exportar CSV</button>
            </div>

            {/* Resumo geral */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"1rem", marginBottom:"1.5rem" }}>
              {(() => {
                const total = avaliacoes.length;
                const media = total ? (avaliacoes.reduce((s,a)=>s+a.estrelas,0)/total).toFixed(1) : "–";
                const com_coment = avaliacoes.filter(a=>a.comentario).length;
                const avs5 = avaliacoes.filter(a=>a.estrelas===5).length;
                return [
                  { n:total, l:"Total de avaliações", ic:"⭐", c:"gold" },
                  { n:media, l:"Média geral (estrelas)", ic:"📊", c:"navy" },
                  { n:com_coment, l:"Com comentário", ic:"💬", c:"teal" },
                  { n:avs5, l:"Avaliações 5 estrelas", ic:"🌟", c:"success" },
                ].map((c,i) => (
                  <div key={i} className="dash-card">
                    <div className={`dash-card-icon ${c.c}`}>{c.ic}</div>
                    <div className="dash-card-num" style={{ fontSize:"1.5rem" }}>{c.n}</div>
                    <div className="dash-card-lbl">{c.l}</div>
                  </div>
                ));
              })()}
            </div>

            {/* Por atividade */}
            {atividades.filter(a => a.tipo !== "intervalo" && a.tipo !== "encerramento" && a.tipo !== "solenidade").map(a => {
              const avs = avaliacoes.filter(av => av.atividade_id === a.id);
              if (avs.length === 0) return null;
              const media = avs.reduce((s,av)=>s+av.estrelas,0)/avs.length;
              const pal = palestrantes.find(p=>p.id===a.palestrante_id);
              const dist = [5,4,3,2,1].map(n => ({ n, cnt: avs.filter(av=>av.estrelas===n).length }));
              return (
                <div key={a.id} className="table-wrap" style={{ padding:"1.25rem", marginBottom:"1.25rem" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem", flexWrap:"wrap", gap:"0.75rem" }}>
                    <div>
                      <div style={{ marginBottom:4 }}><TipoBadge tipo={a.tipo}/></div>
                      <div style={{ fontWeight:700, color:"var(--navy)", fontSize:"0.95rem" }}>{a.titulo}</div>
                      <div style={{ fontSize:"0.82rem", color:"var(--text2)", marginTop:2 }}>
                        {formatData(a.dia)} · {a.horario}
                        {pal && <span> · 🎤 {pal.nome}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                        <StarRating value={Math.round(media)} readonly size={20}/>
                        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", fontWeight:700, color:"var(--gold)" }}>{media.toFixed(1)}</span>
                      </div>
                      <div style={{ fontSize:"0.78rem", color:"var(--text3)" }}>{avs.length} avaliação{avs.length!==1?"ões":""}</div>
                    </div>
                  </div>

                  {/* Distribuição de estrelas */}
                  <div style={{ marginBottom:"1rem" }}>
                    {dist.map(({ n, cnt }) => (
                      <div key={n} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:"0.78rem", color:"var(--text2)", width:12, textAlign:"right", fontWeight:600 }}>{n}</span>
                        <span style={{ color:"#c9a84c", fontSize:14 }}>★</span>
                        <div style={{ flex:1, height:8, background:"var(--border)", borderRadius:4, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${avs.length ? (cnt/avs.length)*100 : 0}%`, background:"var(--gold)", borderRadius:4, transition:"width 0.5s" }}/>
                        </div>
                        <span style={{ fontSize:"0.75rem", color:"var(--text3)", width:20 }}>{cnt}</span>
                      </div>
                    ))}
                  </div>

                  {/* Comentários */}
                  {avs.filter(av=>av.comentario).length > 0 && (
                    <div>
                      <div style={{ fontSize:"0.78rem", fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"0.5rem" }}>Comentários</div>
                      {avs.filter(av=>av.comentario).map(av => {
                        const part = participantes.find(p=>p.id===av.participante_id);
                        return (
                          <div key={av.id} style={{ padding:"0.6rem 0.85rem", background:"var(--surface2)", borderRadius:"var(--radius-sm)", marginBottom:"0.4rem", borderLeft:"3px solid var(--gold)" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4, flexWrap:"wrap", gap:4 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                <StarRating value={av.estrelas} readonly size={14}/>
                                <span style={{ fontSize:"0.8rem", fontWeight:600, color:"var(--text)" }}>{part?.nome||"Participante"}</span>
                                {part?.instituicao && <span style={{ fontSize:"0.72rem", color:"var(--text3)" }}>· {part.instituicao}</span>}
                              </div>
                            </div>
                            <p style={{ fontSize:"0.85rem", color:"var(--text2)", fontStyle:"italic", lineHeight:1.5 }}>"{av.comentario}"</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Atividades sem avaliações */}
            {atividades.filter(a => a.tipo!=="intervalo"&&a.tipo!=="encerramento"&&a.tipo!=="solenidade" && !avaliacoes.some(av=>av.atividade_id===a.id)).length > 0 && (
              <div style={{ padding:"1rem 1.25rem", background:"var(--surface2)", borderRadius:"var(--radius-sm)", fontSize:"0.85rem", color:"var(--text3)" }}>
                ℹ️ Atividades sem avaliações ainda: {atividades.filter(a => a.tipo!=="intervalo"&&a.tipo!=="encerramento"&&a.tipo!=="solenidade" && !avaliacoes.some(av=>av.atividade_id===a.id)).map(a=>a.titulo).join(", ")}
              </div>
            )}
          </div>
        )}

        {/* ── FÓRUM ADMIN ── */}
        {aba === "forum_admin" && (
          <div>
            <div className="admin-topbar">
              <div><h1>Gestão do Fórum</h1><p>Configuração, moderação e conteúdo</p></div>
            </div>

            {/* Configuração do fórum */}
            <div className="table-wrap" style={{ padding:"1.5rem", marginBottom:"1.5rem" }}>
              <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:"1.25rem", fontSize:"0.95rem" }}>⚙️ Configurações do Fórum</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1rem" }}>
                <div className="form-group">
                  <label className="form-label">Status do Fórum</label>
                  <select className="form-input" value={forumConfig.ativo?"true":"false"}
                    onChange={e => setForumConfig(prev => ({ ...prev, ativo: e.target.value==="true" }))}>
                    <option value="true">🟢 Aberto</option>
                    <option value="false">🔴 Fechado</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Data/Hora de abertura</label>
                  <input type="datetime-local" className="form-input" value={forumConfig.data_inicio||""}
                    onChange={e => setForumConfig(prev => ({ ...prev, data_inicio: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Data/Hora de encerramento</label>
                  <input type="datetime-local" className="form-input" value={forumConfig.data_fim||""}
                    onChange={e => setForumConfig(prev => ({ ...prev, data_fim: e.target.value }))} />
                </div>
              </div>
              <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
                <div style={{ padding:"0.6rem 1rem", borderRadius:"var(--radius-sm)", fontSize:"0.85rem", fontWeight:600,
                  background: forumAberto(forumConfig) ? "var(--success-bg)" : "var(--danger-bg)",
                  color: forumAberto(forumConfig) ? "var(--success)" : "var(--danger)" }}>
                  {forumAberto(forumConfig) ? "🟢 Fórum está ABERTO agora" : "🔴 Fórum está FECHADO agora"}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => showToast("Configurações salvas!", "success")}>Salvar</button>
              </div>
            </div>

            {/* Indicadores */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"1rem", marginBottom:"1.5rem" }}>
              {[
                { n: topicos.filter(t=>!t.removido).length, l:"Tópicos ativos", ic:"💬", c:"navy" },
                { n: topicos.reduce((s,t)=>s+(t.removido?0:t.respostas.length),0), l:"Respostas totais", ic:"↩", c:"teal" },
                { n: topicos.filter(t=>t.destaque&&!t.removido).length, l:"Em destaque", ic:"⭐", c:"gold" },
                { n: topicos.filter(t=>t.fixado&&!t.removido).length, l:"Fixados", ic:"📌", c:"warn" },
                { n: topicos.filter(t=>t.removido).length, l:"Removidos", ic:"🗑", c:"danger" },
              ].map((c,i) => (
                <div key={i} className="dash-card">
                  <div className={`dash-card-icon ${c.c}`}>{c.ic}</div>
                  <div className="dash-card-num" style={{ fontSize:"1.5rem" }}>{c.n}</div>
                  <div className="dash-card-lbl">{c.l}</div>
                </div>
              ))}
            </div>

            {/* Lista de tópicos para moderação */}
            <div className="table-wrap">
              <div className="table-header">
                <span className="table-title">Todos os Tópicos</span>
                <button className="btn btn-sm btn-outline"
                  onClick={() => { if (confirm("Remover TODOS os tópicos?")) { setTopicos(prev => prev.map(t=>({...t,removido:true}))); showToast("Todos removidos","info"); } }}>
                  🗑 Limpar fórum
                </button>
              </div>
              <table>
                <thead><tr><th>Título</th><th>Autor</th><th>Cat.</th><th>Respostas</th><th>Curtidas</th><th>Flags</th><th>Ações</th></tr></thead>
                <tbody>
                  {topicos.map(t => {
                    const cat = CATEGORIAS_FORUM.find(c=>c.id===t.categoria);
                    return (
                      <tr key={t.id} style={{ opacity: t.removido ? 0.4 : 1 }}>
                        <td style={{ maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontWeight:500 }}>{t.titulo}</td>
                        <td style={{ fontSize:"0.82rem" }}><RoleBadge role={t.autor_role}/> {t.autor_nome.split(" ")[0]}</td>
                        <td>{cat && <span style={{ fontSize:"0.72rem", fontWeight:700, padding:"0.15rem 0.55rem", borderRadius:50, background:cat.cor+"18", color:cat.cor }}>{cat.id}</span>}</td>
                        <td><span className="badge badge-navy">{t.respostas.length}</span></td>
                        <td><span className="badge badge-teal">{t.curtidas.length}</span></td>
                        <td>
                          <div style={{ display:"flex", gap:"2px" }}>
                            {t.fixado && <span style={{ fontSize:"0.7rem" }}>📌</span>}
                            {t.destaque && <span style={{ fontSize:"0.7rem" }}>⭐</span>}
                            {t.removido && <span style={{ fontSize:"0.7rem", color:"var(--danger)" }}>🗑</span>}
                          </div>
                        </td>
                        <td>
                          <div style={{ display:"flex", gap:"0.25rem" }}>
                            <button className="btn btn-sm btn-outline" title={t.destaque?"Remover destaque":"Destacar"}
                              onClick={() => setTopicos(prev => prev.map(tp => tp.id===t.id ? { ...tp, destaque:!tp.destaque } : tp))}>
                              {t.destaque ? "★" : "☆"}
                            </button>
                            <button className="btn btn-sm btn-outline" title={t.fixado?"Desafixar":"Fixar"}
                              onClick={() => setTopicos(prev => prev.map(tp => tp.id===t.id ? { ...tp, fixado:!tp.fixado } : tp))}>
                              {t.fixado ? "📌" : "📎"}
                            </button>
                            <button className={`btn btn-sm ${t.removido?"btn-success":"btn-danger"}`}
                              onClick={() => setTopicos(prev => prev.map(tp => tp.id===t.id ? { ...tp, removido:!tp.removido } : tp))}>
                              {t.removido ? "↩" : "🗑"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── GAMIFICAÇÃO ADMIN ── */}
        {aba === "gamificacao" && (
          <div>
            <div className="admin-topbar">
              <div><h1>Gamificação</h1><p>Pontuação e engajamento dos participantes</p></div>
            </div>

            {/* Tabela de pontos por ação */}
            <div className="table-wrap" style={{ padding:"1.5rem", marginBottom:"1.5rem" }}>
              <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:"1.25rem", fontSize:"0.95rem" }}>⚙️ Pontos por Ação</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"0.75rem" }}>
                {Object.entries(PONTOS).map(([k,v]) => (
                  <div key={k} style={{ background:"var(--surface2)", borderRadius:"var(--radius-sm)", padding:"0.85rem 1rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:"0.85rem", color:"var(--text2)" }}>
                      {k==="presenca"?"✅ Presença":k==="topico"?"💬 Criar tópico":k==="resposta"?"↩ Responder":k==="curtida_recebida"?"❤️ Curtida recebida":k==="primeiro_dia"?"🌟 Bônus 1º dia":k==="topico_destaque"?"⭐ Destaque":"🎯 "+k}
                    </span>
                    <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:700, color:"var(--navy)" }}>+{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ranking completo */}
            <div className="table-wrap" style={{ marginBottom:"1.5rem" }}>
              <div className="table-header"><span className="table-title">🏆 Ranking Completo</span>
                <button className="btn btn-sm btn-outline" onClick={() => {
                  const ranking = getRanking(participantes, palestrantes, admins, pontuacoes);
                  const header = "Posição,Nome,Instituição,Perfil,Pontos,Nível\n";
                  const rows = ranking.map((u,i) => `${i+1},"${u.nome}","${u.inst||""}","${ROLE_LABEL[u.role]||u.role}",${u.pts},"${getNivel(u.pts).label}"`).join("\n");
                  const blob = new Blob([header+rows],{type:"text/csv"});
                  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="ranking.csv";a.click();
                  showToast("Ranking exportado!","success");
                }}>⬇ CSV</button>
              </div>
              <table>
                <thead><tr><th>#</th><th>Participante</th><th>Perfil</th><th>Nível</th><th>Pontos</th><th>Presenças</th><th>Tópicos</th><th>Respostas</th></tr></thead>
                <tbody>
                  {getRanking(participantes, palestrantes, admins, pontuacoes).map((u,i) => {
                    const pts_pres = pontuacoes.filter(p=>p.user_id===u.uid&&p.tipo==="presenca").reduce((s,p)=>s+p.valor,0);
                    const n_topicos = pontuacoes.filter(p=>p.user_id===u.uid&&p.tipo==="topico").length;
                    const n_resp = pontuacoes.filter(p=>p.user_id===u.uid&&p.tipo==="resposta").length;
                    const nivel = getNivel(u.pts);
                    return (
                      <tr key={u.uid}>
                        <td style={{ fontWeight:700, color:i<3?"var(--gold)":"var(--text3)", fontSize:"0.9rem" }}>
                          {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}º`}
                        </td>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:28,height:28,borderRadius:"50%",background:"var(--navy)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.68rem",fontWeight:700 }}>{u.iniciais}</div>
                            <div>
                              <div style={{ fontWeight:600,fontSize:"0.88rem" }}>{u.nome}</div>
                              <div style={{ fontSize:"0.75rem",color:"var(--text3)" }}>{u.inst}</div>
                            </div>
                          </div>
                        </td>
                        <td><RoleBadge role={u.role}/></td>
                        <td><span style={{ fontSize:"0.78rem",fontWeight:700,color:nivel.cor }}>{nivel.icon} {nivel.label}</span></td>
                        <td>
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            <div style={{ flex:1,height:6,background:"var(--border)",borderRadius:3,overflow:"hidden",minWidth:60 }}>
                              <div style={{ height:"100%",width:`${Math.min((u.pts/200)*100,100)}%`,background:"var(--navy)",borderRadius:3 }}/>
                            </div>
                            <span style={{ fontWeight:700,color:"var(--navy)" }}>{u.pts}</span>
                          </div>
                        </td>
                        <td style={{ fontSize:"0.85rem" }}>{Math.round(pts_pres/PONTOS.presenca)||0}×</td>
                        <td style={{ fontSize:"0.85rem" }}>{n_topicos}×</td>
                        <td style={{ fontSize:"0.85rem" }}>{n_resp}×</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Níveis */}
            <div className="table-wrap" style={{ padding:"1.25rem" }}>
              <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:"1rem", fontSize:"0.9rem" }}>🏅 Níveis de Engajamento</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"0.75rem" }}>
                {NIVEL_LABELS.map(n => {
                  const qtd = getRanking(participantes, palestrantes, admins, pontuacoes).filter(u => getNivel(u.pts).label === n.label).length;
                  return (
                    <div key={n.label} style={{ padding:"1rem", background:"var(--surface2)", borderRadius:"var(--radius-sm)", textAlign:"center", borderTop:`3px solid ${n.cor}` }}>
                      <div style={{ fontSize:"1.5rem", marginBottom:"0.25rem" }}>{n.icon}</div>
                      <div style={{ fontWeight:700, color:n.cor, fontSize:"0.88rem" }}>{n.label}</div>
                      <div style={{ fontSize:"0.75rem", color:"var(--text3)" }}>a partir de {n.min} pts</div>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.3rem", fontWeight:700, color:"var(--navy)", marginTop:"0.25rem" }}>{qtd}</div>
                      <div style={{ fontSize:"0.72rem", color:"var(--text3)" }}>participantes</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── USUÁRIOS ── */}
        {aba === "usuarios" && (
          <div>
            <div className="admin-topbar">
              <div>
                <h1>Gestão de Usuários</h1>
                <p>Admins, credenciadores e seus acessos</p>
              </div>
              <button className="btn btn-primary" onClick={() => { setFormAdmin({ role: "admin", ativo: true }); setModalAdmin(true); }}>+ Novo Usuário</button>
            </div>

            {/* Cards por role */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              {[
                { r: "super_admin", l: "Super Admins",   ic: "👑", c: "danger" },
                { r: "admin",       l: "Administradores",ic: "🔧", c: "navy" },
                { r: "credenciador",l: "Credenciadores", ic: "🏷", c: "teal" },
              ].map(({ r, l, ic, c }) => (
                <div key={r} className="dash-card">
                  <div className={`dash-card-icon ${c}`}>{ic}</div>
                  <div className="dash-card-num" style={{ fontSize: "1.6rem" }}>{admins.filter(a => a.role === r && a.ativo).length}</div>
                  <div className="dash-card-lbl">{l} ativos</div>
                </div>
              ))}
              <div className="dash-card">
                <div className="dash-card-icon warn">⛔</div>
                <div className="dash-card-num" style={{ fontSize: "1.6rem" }}>{admins.filter(a => !a.ativo).length}</div>
                <div className="dash-card-lbl">Inativos</div>
              </div>
            </div>

            <div className="table-wrap">
              <div className="table-header">
                <span className="table-title">Usuários do sistema ({admins.length})</span>
              </div>
              <table>
                <thead>
                  <tr><th>Usuário</th><th>E-mail</th><th>Instituição</th><th>Perfil</th><th>Status</th><th>Ações</th></tr>
                </thead>
                <tbody>
                  {admins.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: a.role === "super_admin" ? "var(--danger-bg)" : "var(--navy)", color: a.role === "super_admin" ? "var(--danger)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 700, flexShrink: 0 }}>
                            {a.foto_iniciais}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{a.nome}</div>
                            {a.id === user?.id && <div style={{ fontSize: "0.7rem", color: "var(--teal)" }}>← você</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--text2)" }}>{a.email}</td>
                      <td style={{ fontSize: "0.85rem" }}>{a.instituicao}</td>
                      <td>
                        <span className={`badge badge-${ROLE_COLOR[a.role] || "navy"}`}>{ROLE_LABEL[a.role]}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${a.ativo ? "success" : "danger"}`}>{a.ativo ? "Ativo" : "Inativo"}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.3rem" }}>
                          <button className="btn btn-sm btn-outline"
                            onClick={() => { setFormAdmin({ ...a }); setModalAdmin(true); }}><IconEdit /></button>
                          <button className={`btn btn-sm ${a.ativo ? "btn-danger" : "btn-success"}`}
                            disabled={a.id === user?.id}
                            title={a.id === user?.id ? "Não pode desativar sua própria conta" : ""}
                            onClick={() => {
                              if (a.id === user?.id) return;
                              setAdmins(prev => prev.map(x => x.id === a.id ? { ...x, ativo: !x.ativo } : x));
                              showToast(`Usuário ${a.ativo ? "desativado" : "ativado"}!`, a.ativo ? "info" : "success");
                            }}>
                            {a.ativo ? "⛔" : "✓"}
                          </button>
                          {a.id !== user?.id && (
                            <button className="btn btn-sm btn-danger"
                              onClick={() => {
                                if (!confirm(`Excluir ${a.nome}?`)) return;
                                setAdmins(prev => prev.filter(x => x.id !== a.id));
                                showToast("Usuário removido", "info");
                              }}>✕</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legenda de perfis */}
            <div style={{ marginTop: "1.5rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
              <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "1rem", fontSize: "0.88rem" }}>📋 Permissões por perfil</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "1rem" }}>
                {[
                  { r: "super_admin", l: "Super Admin", ic: "👑", perms: ["Dashboard", "Tudo do Admin", "Gestão de Usuários", "Alterar qualquer dado"] },
                  { r: "admin",       l: "Administrador", ic: "🔧", perms: ["Dashboard", "Evento, Programação", "Palestrantes, Inscrições", "Credenciamento, Presenças", "Certificados, Relatórios"] },
                  { r: "credenciador",l: "Credenciador", ic: "🏷", perms: ["Dashboard (resumido)", "Credenciamento apenas"] },
                ].map(({ r, l, ic, perms }) => (
                  <div key={r} style={{ padding: "1rem", background: "var(--surface2)", borderRadius: "var(--radius-sm)", borderLeft: `3px solid ${r === "super_admin" ? "var(--danger)" : r === "admin" ? "var(--navy)" : "var(--teal)"}` }}>
                    <div style={{ fontWeight: 700, marginBottom: "0.5rem", fontSize: "0.88rem" }}>{ic} {l}</div>
                    {perms.map((p, i) => <div key={i} style={{ fontSize: "0.78rem", color: "var(--text2)", marginBottom: "0.2rem" }}>• {p}</div>)}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal criar/editar admin */}
            <Modal show={!!modalAdmin} onClose={() => setModalAdmin(null)} title={formAdmin.id ? "Editar Usuário" : "Novo Usuário"}>
              <div className="form-group">
                <label className="form-label">Nome completo *</label>
                <input className="form-input" value={formAdmin.nome || ""} onChange={e => setFormAdmin(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail *</label>
                <input className="form-input" type="email" value={formAdmin.email || ""} onChange={e => setFormAdmin(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Instituição</label>
                <input className="form-input" value={formAdmin.instituicao || ""} onChange={e => setFormAdmin(f => ({ ...f, instituicao: e.target.value }))} />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Perfil de acesso *</label>
                  <select className="form-input" value={formAdmin.role || "admin"} onChange={e => setFormAdmin(f => ({ ...f, role: e.target.value }))}>
                    <option value="super_admin">👑 Super Admin</option>
                    <option value="admin">🔧 Administrador</option>
                    <option value="credenciador">🏷 Credenciador</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={formAdmin.ativo ? "true" : "false"} onChange={e => setFormAdmin(f => ({ ...f, ativo: e.target.value === "true" }))}>
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "0.25rem" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
                  {formAdmin.id ? "Nova senha (deixe em branco para manter)" : "Senha *"}
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Senha</label>
                    <input className="form-input" type="password" placeholder="Mín. 6 caracteres" value={formAdmin.senha || ""} onChange={e => setFormAdmin(f => ({ ...f, senha: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirmar senha</label>
                    <input className="form-input" type="password" placeholder="Repita" value={formAdmin.confirmSenha || ""} onChange={e => setFormAdmin(f => ({ ...f, confirmSenha: e.target.value }))} />
                  </div>
                </div>
              </div>
              <button className="btn btn-primary btn-block" onClick={() => {
                if (!formAdmin.nome?.trim() || !formAdmin.email?.trim()) { showToast("Nome e e-mail são obrigatórios", "error"); return; }
                if (!formAdmin.id && formAdmin.senha?.length < 6) { showToast("Senha mínima de 6 caracteres", "error"); return; }
                if (formAdmin.senha && formAdmin.senha !== formAdmin.confirmSenha) { showToast("Senhas não conferem", "error"); return; }
                const emailDuplo = admins.find(a => a.email === formAdmin.email && a.id !== formAdmin.id);
                if (emailDuplo) { showToast("E-mail já cadastrado", "error"); return; }
                const iniciais = formAdmin.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                if (formAdmin.id) {
                  setAdmins(prev => prev.map(a => a.id === formAdmin.id ? { ...formAdmin, foto_iniciais: iniciais, confirmSenha: undefined, senha: formAdmin.senha || a.senha } : a));
                  showToast("Usuário atualizado!", "success");
                } else {
                  setAdmins(prev => [...prev, { ...formAdmin, id: Date.now(), foto_iniciais: iniciais, confirmSenha: undefined }]);
                  showToast("Usuário criado!", "success");
                }
                setModalAdmin(null);
              }}>Salvar</button>
            </Modal>
          </div>
        )}
      </div>
    </div>
  );
}
