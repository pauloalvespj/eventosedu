import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { atualizarCredenciamento } from "../../../lib/db";

export function Credenciamento() {
  const { participantes, setParticipantes, showToast } = useAdmin();
  const [busca, setBusca] = useState("");

  async function credenciar(id, val) {
    const credenciado_em = val ? new Date().toISOString() : null;
    setParticipantes(participantes.map(p => p.id === id ? { ...p, credenciado: val, credenciado_em } : p));
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
                    ? <button className="btn btn-sm btn-outline" onClick={() => credenciar(p.id, false)}>Remover</button>
                    : <button className="btn btn-sm btn-success" onClick={() => credenciar(p.id, true)}><FontAwesomeIcon icon={faCheck} style={{ marginRight: 6 }} />Credenciar</button>}
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}
