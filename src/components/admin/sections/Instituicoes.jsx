import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrash, faBuilding } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal } from "../../base/index";
import { inserirInstituicao, atualizarInstituicao, deletarInstituicao } from "../../../lib/db";

export function Instituicoes() {
  const { instituicoes, setInstituicoes, showToast } = useAdmin();
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function abrirNovo() { setForm({ ativo: true }); setModal(true); }
  function abrirEditar(inst) { setForm({ ...inst }); setModal(true); }

  async function salvar() {
    if (!form.sigla?.trim() || !form.nome?.trim()) {
      showToast("Sigla e nome são obrigatórios", "error"); return;
    }
    if (form.id) {
      setInstituicoes(prev => prev.map(i => i.id === form.id ? { ...i, ...form } : i));
      await atualizarInstituicao(form.id, { sigla: form.sigla.trim(), nome: form.nome.trim(), ativo: form.ativo });
      showToast("Instituição atualizada!", "success");
    } else {
      const nova = { sigla: form.sigla.trim(), nome: form.nome.trim(), ativo: form.ativo !== false };
      const { data, error } = await inserirInstituicao(nova);
      if (error) { showToast("Erro ao salvar: " + error.message, "error"); return; }
      setInstituicoes(prev => [...prev, data ?? { ...nova, id: Date.now() }]);
      showToast("Instituição criada!", "success");
    }
    setModal(false);
  }

  async function remover(inst) {
    if (!confirm(`Remover "${inst.sigla} – ${inst.nome}"?`)) return;
    setInstituicoes(prev => prev.filter(i => i.id !== inst.id));
    await deletarInstituicao(inst.id);
    showToast("Instituição removida", "info");
  }

  async function toggleAtivo(inst) {
    const novoAtivo = !inst.ativo;
    setInstituicoes(prev => prev.map(i => i.id === inst.id ? { ...i, ativo: novoAtivo } : i));
    await atualizarInstituicao(inst.id, { ativo: novoAtivo });
    showToast(novoAtivo ? "Instituição ativada" : "Instituição desativada", "info");
  }

  const ativas = instituicoes.filter(i => i.ativo).length;

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Instituições</h1><p>{ativas} ativa{ativas !== 1 ? "s" : ""} de {instituicoes.length}</p></div>
        <button className="btn btn-primary" onClick={abrirNovo}>
          <FontAwesomeIcon icon={faBuilding} style={{ marginRight: 6 }} />+ Nova Instituição
        </button>
      </div>

      <div className="table-wrap">
        <div className="table-header"><span className="table-title">Lista de Instituições</span></div>
        <table>
          <thead><tr><th>Sigla</th><th>Nome Completo</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {instituicoes.map(inst => (
              <tr key={inst.id} style={{ opacity: inst.ativo ? 1 : 0.5 }}>
                <td>
                  <span style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "0.9rem", color: "var(--navy)" }}>
                    {inst.sigla}
                  </span>
                </td>
                <td style={{ fontWeight: 500 }}>{inst.nome}</td>
                <td>
                  <button
                    className={`badge badge-${inst.ativo ? "success" : "danger"}`}
                    style={{ cursor: "pointer", border: "none", background: "none", padding: 0 }}
                    onClick={() => toggleAtivo(inst)}
                    title="Clique para alternar"
                  >
                    {inst.ativo ? "Ativa" : "Inativa"}
                  </button>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button className="btn btn-sm btn-outline" title="Editar" onClick={() => abrirEditar(inst)}>
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <button className="btn btn-sm btn-danger" title="Remover" onClick={() => remover(inst)}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {instituicoes.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text3)", padding: "2rem" }}>Nenhuma instituição cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal show={modal} onClose={() => setModal(false)} title={form.id ? "Editar Instituição" : "Nova Instituição"}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Sigla *</label>
            <input className="form-input" placeholder="ex: UFC" value={form.sigla || ""} onChange={e => set("sigla", e.target.value.toUpperCase())} maxLength={20} />
          </div>
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="form-label">Nome Completo *</label>
            <input className="form-input" placeholder="ex: Universidade Federal do Ceará" value={form.nome || ""} onChange={e => set("nome", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={form.ativo !== false ? "true" : "false"} onChange={e => set("ativo", e.target.value === "true")}>
              <option value="true">Ativa</option>
              <option value="false">Inativa</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary btn-block" style={{ marginTop: "0.5rem" }} onClick={salvar}>Salvar</button>
      </Modal>
    </div>
  );
}
