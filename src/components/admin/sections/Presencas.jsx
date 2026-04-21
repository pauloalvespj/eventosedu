import { useState } from "react";
import { useAdmin } from "./AdminContext";

export function Presencas() {
  const { presencas, participantes, atividades } = useAdmin();
  const [busca, setBusca] = useState("");

  return (
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
              const at   = atividades.find(a => a.id === p.atividade_id);
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
  );
}
