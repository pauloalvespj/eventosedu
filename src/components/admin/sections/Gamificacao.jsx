import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMedal, faDownload, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { PONTOS, NIVEL_LABELS } from "../../../config/gamificacao";
import { getRanking, getNivel, ROLE_LABEL } from "../../../utils/helpers";
import { RoleBadge } from "../../base/index";

export function Gamificacao() {
  const { participantes, palestrantes, admins, pontuacoes, showToast } = useAdmin();

  const ranking = getRanking(participantes, palestrantes, admins, pontuacoes);

  function exportarRanking() {
    const header = "Pos,Nome,Instituição,Role,Pontos,Nível\n";
    const rows = ranking.map((u, i) => {
      const nivel = getNivel(u.pts);
      return `${i + 1},"${u.nome}","${u.inst || "–"}","${ROLE_LABEL[u.role] || u.role}",${u.pts},"${nivel.label}"`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ranking_gamificacao.csv"; a.click();
    showToast("Ranking exportado!", "success");
  }

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Gamificação</h1><p>Ranking, pontuação e níveis</p></div>
        <button className="btn btn-sm btn-outline" onClick={exportarRanking}>
          <FontAwesomeIcon icon={faDownload} style={{ marginRight: 6 }} />Exportar CSV
        </button>
      </div>

      {/* Pontos por ação */}
      <div className="table-wrap" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "1rem", fontSize: "0.95rem" }}>
          <FontAwesomeIcon icon={faMedal} style={{ marginRight: 6 }} />Pontos por Ação
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "0.75rem" }}>
          {Object.entries(PONTOS).map(([acao, pts]) => {
            const labels = {
              presenca: "Confirmar presença",
              avaliacao: "Avaliar palestra",
              topico: "Criar tópico no fórum",
              resposta: "Responder tópico",
              curtida_recebida: "Receber curtida",
              primeiro_dia: "Bônus primeiros 10",
              topico_destaque: "Tópico em destaque",
            };
            return (
              <div key={acao} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 1rem", background: "var(--surface2)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text2)" }}>{labels[acao] || acao}</span>
                <span style={{ fontWeight: 700, color: "var(--gold)", fontSize: "1rem" }}>+{pts}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Níveis */}
      <div className="table-wrap" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "1rem", fontSize: "0.95rem" }}>
          <FontAwesomeIcon icon={faTrophy} style={{ marginRight: 6 }} />Níveis
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {NIVEL_LABELS.map((n, i) => {
            const next = NIVEL_LABELS[i + 1];
            const count = ranking.filter(u => getNivel(u.pts).label === n.label).length;
            return (
              <div key={n.label} style={{ flex: 1, minWidth: 140, padding: "1rem", background: "var(--surface2)", borderRadius: "var(--radius-sm)", borderLeft: `3px solid ${n.cor}`, textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{n.icon}</div>
                <div style={{ fontWeight: 700, color: n.cor, fontSize: "0.9rem" }}>{n.label}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text3)", margin: "2px 0" }}>{n.min}{next ? `–${next.min - 1}` : "+"} pts</div>
                <div style={{ fontSize: "0.82rem", color: "var(--text2)", fontWeight: 600 }}>{count} usuário{count !== 1 ? "s" : ""}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ranking */}
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Ranking Geral</span>
          <span style={{ fontSize: "0.82rem", color: "var(--text3)" }}>{ranking.length} com pontuação</span>
        </div>
        <table>
          <thead><tr><th>#</th><th>Usuário</th><th>Instituição</th><th>Role</th><th>Nível</th><th>Pontos</th></tr></thead>
          <tbody>
            {ranking.map((u, i) => {
              const nivel = getNivel(u.pts);
              return (
                <tr key={u.uid}>
                  <td style={{ fontWeight: 700, color: i < 3 ? "var(--gold)" : "var(--text2)", fontSize: i < 3 ? "1rem" : "0.85rem" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>
                        {u.iniciais}
                      </div>
                      {u.nome}
                    </div>
                  </td>
                  <td style={{ fontSize: "0.82rem", color: "var(--text2)" }}>{u.inst || "–"}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600, color: nivel.cor }}>
                      {nivel.icon} {nivel.label}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: "var(--gold)", fontSize: "1rem" }}>{u.pts}</span>
                  </td>
                </tr>
              );
            })}
            {ranking.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text3)", padding: "2rem" }}>Nenhuma pontuação registrada ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
