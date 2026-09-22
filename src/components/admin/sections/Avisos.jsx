import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrash, faBullhorn, faTriangleExclamation, faCircleExclamation, faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal, DatePickerInput } from "../../base/index";
import { inserirAviso, atualizarAviso, deletarAviso, registrarLog } from "../../../lib/db";
import { formatData, avisoVigente, avisosExibindo } from "../../../utils/helpers";

const TIPOS = [
  { value: "danger", label: "Vermelho — urgente/erro", icon: faCircleExclamation, cor: "var(--danger)", bg: "var(--danger-bg)" },
  { value: "alerta", label: "Amarelo — alerta",        icon: faTriangleExclamation, cor: "var(--warn)", bg: "var(--warn-bg)" },
  { value: "sucesso", label: "Verde — sucesso/informativo", icon: faCircleCheck, cor: "var(--success)", bg: "var(--success-bg)" },
];
const tipoInfo = v => TIPOS.find(t => t.value === v) || TIPOS[1];

export function Avisos() {
  const { avisos, setAvisos, showToast } = useAdmin();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function abrirNovo() {
    setForm({ tipo: "alerta", ativo: true, mensagem: "", data_inicio: "", data_fim: "" });
    setModal(true);
  }

  function abrirEditar(aviso) {
    setForm({ ...aviso, data_inicio: aviso.data_inicio || "", data_fim: aviso.data_fim || "" });
    setModal(true);
  }

  async function salvar() {
    if (!form.mensagem?.trim()) { showToast("Escreva a mensagem do aviso", "error"); return; }
    if (form.data_inicio && form.data_fim && form.data_fim < form.data_inicio) {
      showToast("Data final não pode ser antes da inicial", "error"); return;
    }
    setSalvando(true);
    const campos = {
      mensagem: form.mensagem.trim(),
      tipo: form.tipo || "alerta",
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      ativo: form.ativo !== false,
    };

    if (form.id) {
      setAvisos(prev => prev.map(a => a.id === form.id ? { ...a, ...campos } : a));
      const { error } = await atualizarAviso(form.id, campos);
      if (error) { showToast("Erro ao salvar: " + error.message, "error"); setSalvando(false); return; }
      registrarLog("aviso.editar", "aviso", form.id, campos.mensagem.slice(0, 60));
      showToast("Aviso atualizado!", "success");
    } else {
      const { data, error } = await inserirAviso(campos);
      if (error) { showToast("Erro ao criar: " + error.message, "error"); setSalvando(false); return; }
      setAvisos(prev => [data, ...prev]);
      registrarLog("aviso.criar", "aviso", data?.id, campos.mensagem.slice(0, 60));
      showToast("Aviso criado!", "success");
    }
    setSalvando(false);
    setModal(false);
  }

  async function remover(aviso) {
    if (!confirm("Excluir este aviso?")) return;
    setAvisos(prev => prev.filter(a => a.id !== aviso.id));
    await deletarAviso(aviso.id);
    registrarLog("aviso.excluir", "aviso", aviso.id, aviso.mensagem.slice(0, 60));
    showToast("Aviso excluído", "info");
  }

  async function toggleAtivo(aviso) {
    const novo = !aviso.ativo;
    setAvisos(prev => prev.map(a => a.id === aviso.id ? { ...a, ativo: novo } : a));
    await atualizarAviso(aviso.id, { ativo: novo });
    showToast(novo ? "Aviso ativado" : "Aviso desativado", "info");
  }

  const listaOrdenada = [...avisos].sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
  const ativosAgora = avisosExibindo(avisos).length;

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Avisos</h1><p>{ativosAgora} exibido{ativosAgora !== 1 ? "s" : ""} agora para os participantes</p></div>
        <button className="btn btn-primary" onClick={abrirNovo}>
          <FontAwesomeIcon icon={faBullhorn} style={{ marginRight: 6 }} />+ Novo Aviso
        </button>
      </div>

      <div className="table-wrap">
        <div className="table-header"><span className="table-title">Lista de Avisos</span></div>
        <table>
          <thead>
            <tr>
              <th>Mensagem</th>
              <th style={{ width: 130 }}>Tipo</th>
              <th style={{ width: 190 }}>Vigência</th>
              <th style={{ width: 110 }}>Status</th>
              <th style={{ width: 90 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {listaOrdenada.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text3)", padding: "2rem" }}>Nenhum aviso cadastrado.</td></tr>
            )}
            {listaOrdenada.map(aviso => {
              const info = tipoInfo(aviso.tipo);
              const exibindo = aviso.ativo && avisoVigente(aviso);
              return (
                <tr key={aviso.id} style={{ opacity: aviso.ativo ? 1 : 0.55 }}>
                  <td style={{ maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={aviso.mensagem}>{aviso.mensagem}</td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", fontWeight: 600, color: info.cor }}>
                      <FontAwesomeIcon icon={info.icon} />{info.label.split(" — ")[0]}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.82rem", color: "var(--text2)" }}>
                    {aviso.data_inicio || aviso.data_fim
                      ? `${aviso.data_inicio ? formatData(aviso.data_inicio) : "sem início"} — ${aviso.data_fim ? formatData(aviso.data_fim) : "sem fim"}`
                      : <span style={{ color: "var(--text3)" }}>sempre</span>}
                  </td>
                  <td>
                    <button
                      className={`badge badge-${exibindo ? "success" : aviso.ativo ? "warn" : "navy"}`}
                      style={{ cursor: "pointer", border: "none", padding: "0.3rem 0.6rem" }}
                      onClick={() => toggleAtivo(aviso)}
                      title="Clique para ativar/desativar"
                    >
                      {exibindo ? "Exibindo" : aviso.ativo ? "Fora do período" : "Inativo"}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button className="btn btn-sm btn-outline" title="Editar" onClick={() => abrirEditar(aviso)}>
                        <FontAwesomeIcon icon={faPenToSquare} />
                      </button>
                      <button className="btn btn-sm btn-danger" title="Excluir" onClick={() => remover(aviso)}>
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL: Criar / Editar */}
      <Modal show={modal} onClose={() => setModal(false)} title={form.id ? "Editar Aviso" : "Novo Aviso"}>
        <div className="form-group">
          <label className="form-label">Mensagem *</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Ex: O credenciamento abre às 8h no auditório principal."
            value={form.mensagem || ""}
            onChange={e => set("mensagem", e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Tipo</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {TIPOS.map(t => (
              <label key={t.value}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "0.6rem 0.75rem", borderRadius: "var(--radius-sm)",
                  border: `1.5px solid ${form.tipo === t.value ? t.cor : "var(--border)"}`, cursor: "pointer",
                  background: form.tipo === t.value ? t.bg : "transparent",
                }}>
                <input type="radio" name="tipo-aviso" checked={form.tipo === t.value} onChange={() => set("tipo", t.value)} style={{ accentColor: t.cor }} />
                <FontAwesomeIcon icon={t.icon} style={{ color: t.cor }} />
                <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-grid">
          <DatePickerInput label="Data inicial (opcional)" value={form.data_inicio || ""} onChange={v => set("data_inicio", v)} />
          <DatePickerInput label="Data final (opcional)" value={form.data_fim || ""} onChange={v => set("data_fim", v)} />
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--text3)", marginTop: "-0.5rem", marginBottom: "1rem" }}>
          Deixe em branco para não limitar o início e/ou o fim da exibição.
        </p>

        <div className="form-group">
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" checked={form.ativo !== false} onChange={e => set("ativo", e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--navy)" }} />
            <span className="form-label" style={{ margin: 0 }}>Ativo</span>
          </label>
        </div>

        <button className="btn btn-primary btn-block" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </Modal>
    </div>
  );
}
