import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { atualizarCredenciamento, registrarLog } from "../../../lib/db";
import { Modal } from "../../base/index";

export function Credenciamento({ participantes, setParticipantes, showToast }) {
  const [busca, setBusca] = useState("");
  const [confirmRemover, setConfirmRemover] = useState(null);

  async function credenciar(id, val) {
    const credenciado_em = val ? new Date().toISOString() : null;
    setParticipantes(participantes.map(p => p.id === id ? { ...p, credenciado: val, credenciado_em } : p));
    atualizarCredenciamento(id, val);
    const alvo = participantes.find(p => p.id === id);
    registrarLog(val ? "participante.credenciar" : "participante.remover_credenciamento", "participante", id, alvo?.nome);
    showToast(val ? "Participante credenciado!" : "Credenciamento removido", val ? "success" : "info");
  }

  function confirmarRemocao() {
    if (confirmRemover) credenciar(confirmRemover.id, false);
    setConfirmRemover(null);
  }

  const filtrados = participantes.filter(p => {
    const q = busca.toLowerCase();
    return !q || p.nome.toLowerCase().includes(q) || p.cpf.includes(q) || p.email.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="admin-topbar"><div><h1>Credenciamento</h1><p>Recepção do evento</p></div></div>

      <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
        <h3 style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "1rem" }}>Busca Rápida</h3>
        <input className="form-input" placeholder="Buscar por nome, CPF ou e-mail..."
          value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      <div className="table-wrap credenc-table-wrap">
        <div className="table-header">
          <span className="table-title">{participantes.filter(p => p.credenciado).length}/{participantes.length} credenciados</span>
        </div>
        <table>
          <thead><tr><th>Participante</th><th>CPF</th><th>Instituição</th><th>Status</th><th>Data/Hora</th><th>Ação</th></tr></thead>
          <tbody>
            {filtrados.map(p => {
              const dt = p.credenciado_em ? new Date(p.credenciado_em) : null;
              const dataHora = dt ? dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "–";
              return (
              <tr key={p.id}>
                <td><div>
                  <div style={{ fontWeight: 600 }}>{p.nome}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text3)" }}>{p.email}</div>
                </div></td>
                <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{p.cpf}</td>
                <td>{p.instituicao}</td>
                <td><span className={`badge badge-${p.credenciado ? "success" : "warn"}`}>{p.credenciado ? <><FontAwesomeIcon icon={faCheck} style={{ marginRight: 4 }} />Credenciado</> : "Aguardando"}</span></td>
                <td style={{ fontSize: "0.82rem", color: p.credenciado ? "var(--text2)" : "var(--text3)" }}>{dataHora}</td>
                <td>
                  {p.credenciado
                    ? <button className="btn btn-sm btn-outline" onClick={() => setConfirmRemover(p)}>Remover</button>
                    : <button className="btn btn-sm btn-success" onClick={() => credenciar(p.id, true)}><FontAwesomeIcon icon={faCheck} style={{ marginRight: 6 }} />Credenciar</button>}
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>

      <div className="credenc-cards">
        <div className="table-header" style={{ marginBottom: "0.75rem" }}>
          <span className="table-title">{participantes.filter(p => p.credenciado).length}/{participantes.length} credenciados</span>
        </div>
        {filtrados.map(p => {
          const dt = p.credenciado_em ? new Date(p.credenciado_em) : null;
          const dataHora = dt ? dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;
          return (
            <div className="credenc-card" key={p.id}>
              <div className="credenc-card-top">
                <div>
                  <div className="credenc-card-nome">{p.nome}</div>
                  <div className="credenc-card-sub">{p.email}</div>
                </div>
                <span className={`badge badge-${p.credenciado ? "success" : "warn"}`} style={{ flexShrink: 0 }}>
                  {p.credenciado ? <><FontAwesomeIcon icon={faCheck} style={{ marginRight: 4 }} />Credenciado</> : "Aguardando"}
                </span>
              </div>
              <div className="credenc-card-meta">
                <span style={{ fontFamily: "monospace" }}>{p.cpf}</span>
                <span>{p.instituicao}</span>
              </div>
              {dataHora && <div className="credenc-card-data">{dataHora}</div>}
              <div className="credenc-card-actions">
                {p.credenciado
                  ? <button className="btn btn-sm btn-outline" onClick={() => setConfirmRemover(p)}>Remover credenciamento</button>
                  : <button className="btn btn-sm btn-success" onClick={() => credenciar(p.id, true)}><FontAwesomeIcon icon={faCheck} style={{ marginRight: 6 }} />Credenciar</button>}
              </div>
            </div>
          );
        })}
      </div>

      <Modal show={!!confirmRemover} onClose={() => setConfirmRemover(null)} title="Remover credenciamento">
        <p style={{ color: "var(--text2)", marginBottom: "1.5rem" }}>
          Tem certeza que deseja remover o credenciamento de <strong>{confirmRemover?.nome}</strong>?
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button className="btn btn-outline" onClick={() => setConfirmRemover(null)}>Cancelar</button>
          <button className="btn btn-danger" onClick={confirmarRemocao}>Remover</button>
        </div>
      </Modal>
    </div>
  );
}
