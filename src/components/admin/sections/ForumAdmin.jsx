import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faComments, faRotateLeft, faStar, faListCheck, faTrash, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal } from "../../base/index";
import { CATEGORIAS_FORUM } from "../../../config/gamificacao";
import { RoleBadge } from "../../base/index";
import { forumAberto } from "../../../utils/helpers";
import { atualizarForumConfig, fixarTopico, deletarTopico, criarTopico } from "../../../lib/db";

export function ForumAdmin() {
  const { user, topicos, setTopicos, forumConfig, setForumConfig, showToast } = useAdmin();

  const [modalTopico, setModalTopico] = useState(false);
  const [form, setForm] = useState({ categoria: "geral", titulo: "", corpo: "" });

  async function salvarTopico() {
    if (!form.titulo.trim() || !form.corpo.trim()) { showToast("Título e conteúdo obrigatórios", "error"); return; }
    const novoTopico = {
      id: `local-${Date.now()}`,
      event_id: forumConfig.event_id || 1,
      user_id: user?.id,
      autor_nome: user?.nome || "Admin",
      autor_role: user?.role || "admin",
      categoria: form.categoria,
      titulo: form.titulo.trim(),
      corpo: form.corpo.trim(),
      curtidas: [],
      respostas: [],
      fixado: false,
      destaque: false,
      removido: false,
      criado_em: new Date().toISOString(),
    };
    setTopicos(prev => [novoTopico, ...prev]);
    criarTopico({ event_id: novoTopico.event_id, user_id: user?.id, categoria: form.categoria, titulo: form.titulo.trim(), corpo: form.corpo.trim() });
    showToast("Tópico criado!", "success");
    setModalTopico(false);
    setForm({ categoria: "geral", titulo: "", corpo: "" });
  }

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Gestão do Fórum</h1><p>Configuração, moderação e conteúdo</p></div>
        <button className="btn btn-primary" onClick={() => setModalTopico(true)}>
          <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Novo Tópico
        </button>
      </div>

      {/* Configurações */}
      <div className="table-wrap" style={{ padding:"1.5rem", marginBottom:"1.5rem" }}>
        <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:"1.25rem", fontSize:"0.95rem" }}><FontAwesomeIcon icon={faGear} style={{ marginRight: 6 }} />Configurações do Fórum</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1rem" }}>
          <div className="form-group">
            <label className="form-label">Status do Fórum</label>
            <select className="form-input" value={forumConfig.ativo?"true":"false"} onChange={e => setForumConfig(prev => ({ ...prev, ativo: e.target.value==="true" }))}>
              <option value="true">Aberto</option><option value="false">Fechado</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Data/Hora de abertura</label>
            <input type="datetime-local" className="form-input" value={forumConfig.data_inicio||""} onChange={e => setForumConfig(prev => ({ ...prev, data_inicio: e.target.value }))} />
          </div>
        </div>
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <div style={{ padding:"0.6rem 1rem", borderRadius:"var(--radius-sm)", fontSize:"0.85rem", fontWeight:600,
            background: forumAberto(forumConfig) ? "var(--success-bg)" : "var(--danger-bg)",
            color: forumAberto(forumConfig) ? "var(--success)" : "var(--danger)" }}>
            {forumAberto(forumConfig) ? "🟢 Fórum está ABERTO agora" : "🔴 Fórum está FECHADO agora"}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => {
            atualizarForumConfig(forumConfig.id, { ativo: forumConfig.ativo, data_inicio: forumConfig.data_inicio });
            showToast("Configurações salvas!", "success");
          }}>Salvar</button>
        </div>
      </div>

      {/* Indicadores */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"1rem", marginBottom:"1.5rem" }}>
        {[
          { n: topicos.filter(t=>!t.removido).length, l:"Tópicos ativos", ic:faComments, c:"navy" },
          { n: topicos.reduce((s,t)=>s+(t.removido?0:t.respostas.length),0), l:"Respostas totais", ic:faRotateLeft, c:"teal" },
          { n: topicos.filter(t=>t.destaque&&!t.removido).length, l:"Em destaque", ic:faStar, c:"gold" },
          { n: topicos.filter(t=>t.fixado&&!t.removido).length, l:"Fixados", ic:faListCheck, c:"warn" },
          { n: topicos.filter(t=>t.removido).length, l:"Removidos", ic:faTrash, c:"danger" },
        ].map((c,i) => (
          <div key={i} className="dash-card">
            <div className={`dash-card-icon ${c.c}`}><FontAwesomeIcon icon={c.ic} /></div>
            <div className="dash-card-num" style={{ fontSize:"1.5rem" }}>{c.n}</div>
            <div className="dash-card-lbl">{c.l}</div>
          </div>
        ))}
      </div>

      {/* Lista de tópicos */}
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Todos os Tópicos</span>
          <button className="btn btn-sm btn-outline" onClick={() => {
            if (confirm("Remover TODOS os tópicos?")) {
              setTopicos(prev => prev.map(t=>({...t,removido:true})));
              showToast("Todos removidos","info");
            }
          }}><FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />Limpar fórum</button>
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
                      {t.fixado   && <FontAwesomeIcon icon={faListCheck} style={{ fontSize:"0.7rem" }} />}
                      {t.destaque && <FontAwesomeIcon icon={faStar}      style={{ fontSize:"0.7rem", color:"var(--gold)" }} />}
                      {t.removido && <FontAwesomeIcon icon={faTrash}     style={{ fontSize:"0.7rem", color:"var(--danger)" }} />}
                    </div>
                  </td>
                  <td>
                    <div style={{ display:"flex", gap:"0.25rem" }}>
                      <button className="btn btn-sm btn-outline" title={t.destaque?"Remover destaque":"Destacar"}
                        onClick={() => setTopicos(prev => prev.map(tp => tp.id===t.id ? { ...tp, destaque:!tp.destaque } : tp))}>
                        <FontAwesomeIcon icon={faStar} style={{ color: t.destaque ? "var(--gold)" : undefined }} />
                      </button>
                      <button className="btn btn-sm btn-outline" title={t.fixado?"Desafixar":"Fixar"}
                        onClick={() => { setTopicos(prev => prev.map(tp => tp.id===t.id ? { ...tp, fixado:!tp.fixado } : tp)); fixarTopico(t.id, !t.fixado); }}>
                        <FontAwesomeIcon icon={faListCheck} />
                      </button>
                      <button className={`btn btn-sm ${t.removido?"btn-success":"btn-danger"}`}
                        onClick={() => { setTopicos(prev => prev.map(tp => tp.id===t.id ? { ...tp, removido:!tp.removido } : tp)); if (!t.removido) deletarTopico(t.id); }}>
                        <FontAwesomeIcon icon={t.removido ? faRotateLeft : faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal novo tópico */}
      <Modal show={modalTopico} onClose={() => setModalTopico(false)} title="Novo Tópico">
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select className="form-input" value={form.categoria} onChange={e => setForm(f=>({...f, categoria: e.target.value}))}>
            {CATEGORIAS_FORUM.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Título *</label>
          <input className="form-input" value={form.titulo} onChange={e => setForm(f=>({...f, titulo: e.target.value}))} placeholder="Título do tópico" />
        </div>
        <div className="form-group">
          <label className="form-label">Conteúdo *</label>
          <textarea className="form-input" rows={5} value={form.corpo} onChange={e => setForm(f=>({...f, corpo: e.target.value}))} placeholder="Escreva o conteúdo do tópico..." />
        </div>
        <button className="btn btn-primary btn-block" onClick={salvarTopico}>Publicar Tópico</button>
      </Modal>
    </div>
  );
}
