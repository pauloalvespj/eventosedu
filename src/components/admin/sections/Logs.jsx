import { useState, useEffect } from "react";
import { fetchLogs } from "../../../lib/db";

const ACAO_LABEL = {
  "evento.atualizar":       "Atualizou dados do evento",
  "atividade.excluir":      "Excluiu atividade",
  "turno.excluir":          "Excluiu turno",
  "participante.excluir":   "Excluiu participante",
  "usuario.criar":          "Criou usuário",
  "usuario.editar_role":    "Editou papel de usuário",
  "participante.inscrever_se":        "Se inscreveu",
  "participante.atualizar_cadastro":  "Atualizou o próprio cadastro",
  "participante.credenciar":              "Credenciou participante",
  "participante.remover_credenciamento":  "Removeu credenciamento",
  "participantes.solicitar_atualizacao":  "Pediu atualização de cadastro",
  "certificado.liberar":    "Liberou certificados",
  "certificado.ocultar":    "Ocultou certificados",
  "certificado.modo_externo_on":  "Ativou certificado externo",
  "certificado.modo_externo_off": "Desativou certificado externo",
};

function formatDataHora(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR");
}

export function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    fetchLogs().then(({ data }) => { setLogs(data); setLoading(false); });
  }, []);

  const filtrados = logs.filter(l => {
    if (!busca.trim()) return true;
    const q = busca.trim().toLowerCase();
    return (l.actor_nome || "").toLowerCase().includes(q)
      || (l.alvo_nome || "").toLowerCase().includes(q)
      || (ACAO_LABEL[l.acao] || l.acao || "").toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="admin-topbar">
        <div><h2 style={{ margin: 0, fontSize: "1.1rem" }}>Logs de Auditoria</h2><p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text3)" }}>Ações administrativas sensíveis — quem fez o quê</p></div>
      </div>
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">{filtrados.length} registro{filtrados.length !== 1 ? "s" : ""}</span>
          <input className="search-input" placeholder="Buscar por pessoa, ação ou alvo..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <table>
          <thead><tr><th>Data/Hora</th><th>Quem</th><th>Ação</th><th>Alvo</th></tr></thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text3)", padding: "2rem" }}>Carregando…</td></tr>
            )}
            {!loading && filtrados.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text3)", padding: "2rem" }}>Nenhum registro encontrado.</td></tr>
            )}
            {filtrados.map(l => (
              <tr key={l.id}>
                <td style={{ fontSize: "0.82rem", color: "var(--text2)", whiteSpace: "nowrap" }}>{formatDataHora(l.criado_em)}</td>
                <td style={{ fontWeight: 500 }}>{l.actor_nome || "—"}</td>
                <td>{ACAO_LABEL[l.acao] || l.acao}</td>
                <td style={{ fontSize: "0.85rem", color: "var(--text2)" }}>{l.alvo_nome || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
