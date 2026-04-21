import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { atualizarCredenciamento } from "../../../lib/db";

export function Credenciamento() {
  const { participantes, setParticipantes, showToast } = useAdmin();
  const [busca, setBusca] = useState("");

  async function credenciar(id, val) {
    setParticipantes(participantes.map(p => p.id === id ? { ...p, credenciado: val } : p));
    atualizarCredenciamento(id, val);
    showToast(val ? "Participante credenciado!" : "Credenciamento removido", val ? "success" : "info");
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

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">{participantes.filter(p => p.credenciado).length}/{participantes.length} credenciados</span>
        </div>
        <table>
          <thead><tr><th>Participante</th><th>CPF</th><th>Instituição</th><th>Credenciamento</th><th>Ação</th></tr></thead>
          <tbody>
            {filtrados.map(p => (
              <tr key={p.id}>
                <td><div>
                  <div style={{ fontWeight: 600 }}>{p.nome}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text3)" }}>{p.email}</div>
                </div></td>
                <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{p.cpf}</td>
                <td>{p.instituicao}</td>
                <td><span className={`badge badge-${p.credenciado ? "success" : "warn"}`}>{p.credenciado ? <><FontAwesomeIcon icon={faCheck} style={{ marginRight: 4 }} />Credenciado</> : "Aguardando"}</span></td>
                <td>
                  {p.credenciado
                    ? <button className="btn btn-sm btn-outline" onClick={() => credenciar(p.id, false)}>Remover</button>
                    : <button className="btn btn-sm btn-success" onClick={() => credenciar(p.id, true)}><FontAwesomeIcon icon={faCheck} style={{ marginRight: 6 }} />Credenciar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
