import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal, AvatarUpload } from "../../base/index";
import { InstSelect } from "./InstSelect";
import { atualizarProfile } from "../../../lib/db";

export function Palestrantes() {
  const { palestrantes, setPalestrantes, instituicoes, showToast } = useAdmin();
  const [modalPal, setModalPal] = useState(false);
  const [formPal, setFormPal]   = useState({});
  const [busca, setBusca]       = useState("");

  async function salvar() {
    if (!formPal.nome) { showToast("Nome obrigatório", "error"); return; }
    if (formPal.id) {
      setPalestrantes(palestrantes.map(p => p.id === formPal.id ? formPal : p));
      atualizarProfile(formPal.id, { nome: formPal.nome, titulo: formPal.titulo, area: formPal.area, mini_bio: formPal.mini_bio, instituicao: formPal.instituicao });
    } else {
      const iniciais = formPal.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
      setPalestrantes([...palestrantes, { ...formPal, id: `local-${Date.now()}`, foto_iniciais: iniciais, role: "palestrante" }]);
      showToast("Palestrante adicionado localmente — crie a conta via setup-users.js para persistir", "info");
    }
    setModalPal(false);
    showToast("Palestrante salvo!", "success");
  }

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Palestrantes</h1></div>
        <button className="btn btn-primary" onClick={() => { setFormPal({}); setModalPal(true); }}>+ Novo Palestrante</button>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Palestrantes ({palestrantes.length})</span>
          <input className="search-input" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <table>
          <thead><tr><th>Nome</th><th>Título</th><th>Instituição</th><th>Área</th><th>Ações</th></tr></thead>
          <tbody>
            {palestrantes.filter(p => {
              const q = busca.toLowerCase();
              return !q || p.nome?.toLowerCase().includes(q) || p.area?.toLowerCase().includes(q) || p.instituicao?.toLowerCase().includes(q);
            }).map(p => (
              <tr key={p.id}>
                <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {p.foto_url
                    ? <img src={p.foto_url} alt={p.nome} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--gold)", flexShrink: 0 }} />
                    : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 700, flexShrink: 0 }}>{p.foto_iniciais}</div>
                  }
                  <span style={{ fontWeight: 500 }}>{p.nome}</span>
                </div></td>
                <td style={{ fontSize: "0.85rem", color: "var(--text2)" }}>{p.titulo}</td>
                <td style={{ fontSize: "0.85rem" }}>{p.instituicao || <span style={{ color: "var(--text3)" }}>–</span>}</td>
                <td><span className="badge badge-navy">{p.area}</span></td>
                <td><div style={{ display: "flex", gap: "0.25rem" }}>
                  <button className="btn btn-sm btn-outline" onClick={() => { setFormPal({ ...p }); setModalPal(true); }}><FontAwesomeIcon icon={faPenToSquare} /></button>
                  <button className="btn btn-sm btn-danger" onClick={() => { setPalestrantes(palestrantes.filter(x => x.id !== p.id)); showToast("Palestrante removido", "info"); }}><FontAwesomeIcon icon={faTrash} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal show={modalPal} onClose={() => setModalPal(false)} title={formPal.id ? "Editar Palestrante" : "Novo Palestrante"}>
        {formPal.id && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
            <AvatarUpload
              userId={formPal.id}
              fotoUrl={formPal.foto_url}
              iniciais={formPal.foto_iniciais || formPal.nome?.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase()}
              size={72}
              onUploaded={url => {
                setFormPal(f => ({ ...f, foto_url: url }));
                setPalestrantes(palestrantes.map(p => p.id === formPal.id ? { ...p, foto_url: url } : p));
              }}
            />
          </div>
        )}
        <div className="form-group"><label className="form-label">Nome *</label><input className="form-input" value={formPal.nome || ""} onChange={e => setFormPal(f => ({ ...f, nome: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Título/Formação</label><input className="form-input" value={formPal.titulo || ""} onChange={e => setFormPal(f => ({ ...f, titulo: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Área de Atuação</label><input className="form-input" value={formPal.area || ""} onChange={e => setFormPal(f => ({ ...f, area: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Instituição</label><InstSelect value={formPal.instituicao||""} onChange={v => setFormPal(f=>({...f,instituicao:v}))} instituicoes={instituicoes||[]} /></div>
        <div className="form-group"><label className="form-label">Mini Biografia</label><textarea className="form-input" rows={2} value={formPal.mini_bio || ""} onChange={e => setFormPal(f => ({ ...f, mini_bio: e.target.value }))} /></div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "0.5rem", marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>Credenciais de Acesso</div>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" type="email" value={formPal.email || ""} onChange={e => setFormPal(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Senha</label><input className="form-input" type="password" placeholder="Mín. 6 caracteres" value={formPal.senha || ""} onChange={e => setFormPal(f => ({ ...f, senha: e.target.value }))} /></div>
          </div>
        </div>
        {!formPal.id && <p style={{ fontSize: "0.78rem", color: "var(--text3)", marginBottom: "0.75rem" }}>💡 A foto pode ser adicionada após salvar o palestrante.</p>}
        <button className="btn btn-primary btn-block" onClick={salvar}>Salvar</button>
      </Modal>
    </div>
  );
}
