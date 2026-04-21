import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faPenToSquare, faTrash, faFloppyDisk } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal } from "../../base/index";
import { InstSelect } from "./InstSelect";
import { atualizarProfile } from "../../../lib/db";

export function Inscricoes() {
  const { participantes, setParticipantes, instituicoes, showToast } = useAdmin();
  const [busca, setBusca]         = useState("");
  const [modalPart, setModalPart] = useState(null);
  const [formPart, setFormPart]   = useState({});

  const filtrados = participantes.filter(p => {
    const q = busca.toLowerCase();
    return !q || p.nome?.toLowerCase().includes(q) || p.cpf?.includes(q) || p.instituicao?.toLowerCase().includes(q) || p.cargo?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
  });

  function salvar() {
    if (!formPart.nome) { showToast("Nome obrigatório", "error"); return; }
    if (modalPart === "new") {
      const novo = { ...formPart, id: `local-${Date.now()}`, role: "participante", credenciado: false,
        foto_iniciais: formPart.nome.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase() };
      setParticipantes([...participantes, novo]);
      showToast("Inscrito adicionado!", "success");
    } else {
      setParticipantes(participantes.map(x => x.id === formPart.id ? { ...x, ...formPart } : x));
      atualizarProfile(formPart.id, { nome:formPart.nome, cpf:formPart.cpf, instituicao:formPart.instituicao, cargo:formPart.cargo });
      showToast("Inscrito atualizado!", "success");
    }
    setModalPart(null);
  }

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Inscrições</h1><p>{participantes.length} participantes inscritos</p></div>
        <button className="btn btn-primary" onClick={() => { setFormPart({ nome:"", cpf:"", email:"", instituicao:"", cargo:"" }); setModalPart("new"); }}>
          <FontAwesomeIcon icon={faUsers} style={{ marginRight: 6 }} />Novo Inscrito
        </button>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Participantes ({filtrados.length})</span>
          <input className="search-input" placeholder="Buscar por nome, CPF, instituição..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <table style={{ width:"100%", fontSize:"0.83rem" }}>
          <thead><tr><th>Nome</th><th>CPF</th><th>Instituição / Cargo</th><th>E-mail</th><th>Status</th><th style={{ width:88 }}>Ações</th></tr></thead>
          <tbody>
            {filtrados.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight:500 }}>{p.nome}</td>
                <td style={{ fontFamily:"monospace", fontSize:"0.82rem" }}>{p.cpf}</td>
                <td><div>{p.instituicao}</div><div style={{ fontSize:"0.78rem", color:"var(--text3)" }}>{p.cargo}</div></td>
                <td style={{ fontSize:"0.82rem", color:"var(--text2)" }}>{p.email}</td>
                <td><span className={`badge badge-${p.credenciado?"success":"warn"}`}>{p.credenciado?"Credenciado":"Inscrito"}</span></td>
                <td>
                  <div style={{ display:"flex", gap:"0.25rem" }}>
                    <button className="btn btn-sm btn-outline" onClick={() => { setFormPart({...p}); setModalPart(p.id); }} title="Editar"><FontAwesomeIcon icon={faPenToSquare} /></button>
                    <button className="btn btn-sm btn-danger" title="Remover" onClick={() => {
                      if (!confirm(`Remover "${p.nome}" das inscrições?`)) return;
                      setParticipantes(participantes.filter(x => x.id !== p.id));
                      atualizarProfile(p.id, { ativo: false });
                      showToast("Participante removido.", "info");
                    }}><FontAwesomeIcon icon={faTrash} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal show={!!modalPart} onClose={() => setModalPart(null)} title={modalPart === "new" ? "Novo Inscrito" : "Editar Inscrito"}>
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn:"1/-1" }}>
            <label className="form-label">Nome completo *</label>
            <input className="form-input" value={formPart.nome||""} onChange={e => setFormPart(f=>({...f,nome:e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label">CPF</label>
            <input className="form-input" style={{ fontFamily:"monospace" }} placeholder="000.000.000-00" value={formPart.cpf||""} onChange={e => setFormPart(f=>({...f,cpf:e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="form-input" type="email" value={formPart.email||""} onChange={e => setFormPart(f=>({...f,email:e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label">Instituição</label>
            <InstSelect value={formPart.instituicao||""} onChange={v => setFormPart(f=>({...f,instituicao:v}))} instituicoes={instituicoes||[]} />
          </div>
          <div className="form-group">
            <label className="form-label">Cargo / Título</label>
            <input className="form-input" value={formPart.cargo||""} onChange={e => setFormPart(f=>({...f,cargo:e.target.value}))} />
          </div>
        </div>
        <div style={{ display:"flex", gap:"0.5rem", marginTop:"0.5rem" }}>
          <button className="btn btn-primary" onClick={salvar}><FontAwesomeIcon icon={faFloppyDisk} style={{ marginRight: 6 }} />Salvar</button>
          <button className="btn btn-outline" onClick={() => setModalPart(null)}>Cancelar</button>
        </div>
      </Modal>
    </div>
  );
}
