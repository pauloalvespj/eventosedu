import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faToggleOn, faToggleOff } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { calcPresenca } from "../../../utils/helpers";
import { atualizarEvento } from "../../../lib/db";

export function Certificados() {
  const { event, setEvent, atividades, participantes, presencas, showToast } = useAdmin();

  async function toggleCertificado() {
    const novo = !event.certificado_disponivel;
    setEvent(prev => ({ ...prev, certificado_disponivel: novo }));
    const { error } = await atualizarEvento(event.id, { certificado_disponivel: novo });
    if (error) {
      setEvent(prev => ({ ...prev, certificado_disponivel: !novo }));
      showToast("Erro ao salvar.", "error");
    } else {
      showToast(novo ? "Certificados liberados para os participantes." : "Certificados ocultados.", "success");
    }
  }

  const cargaHorariaTotal = atividades.filter(a => a.conta_certificado).reduce((s, a) => s + a.carga_horaria, 0);
  const aptos = participantes.filter(p => calcPresenca(p.id, atividades, presencas, event).apto);

  function exportarLista() {
    const header = "Nome,CPF,Instituição,Cargo,CH Cumprida,Percentual,Status\n";
    const rows = participantes.map(p => {
      const r = calcPresenca(p.id, atividades, presencas, event);
      return `"${p.nome}","${p.cpf}","${p.instituicao}","${p.cargo}",${r.chCumprida}h,${r.pct}%,${r.apto ? "APTO" : "NÃO APTO"}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "lista_certificados.csv"; a.click();
    showToast("Lista exportada!", "success");
  }

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Certificados</h1><p>Gestão e emissão</p></div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className={`btn ${event.certificado_disponivel ? "btn-success" : "btn-outline"}`}
            onClick={toggleCertificado}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <FontAwesomeIcon icon={event.certificado_disponivel ? faToggleOn : faToggleOff} style={{ fontSize: "1.1rem" }} />
            {event.certificado_disponivel ? "Certificados liberados" : "Liberar certificados"}
          </button>
          <button className="btn btn-gold" onClick={exportarLista}><FontAwesomeIcon icon={faDownload} style={{ marginRight: 6 }} />Exportar CSV</button>
        </div>
      </div>

      <div style={{
        background: event.certificado_disponivel ? "var(--success-bg)" : "var(--surface2)",
        border: `1px solid ${event.certificado_disponivel ? "var(--success)" : "var(--border)"}`,
        borderRadius: "var(--radius-sm)", padding: "0.85rem 1.25rem", marginBottom: "1.5rem",
        fontSize: "0.88rem", color: event.certificado_disponivel ? "var(--success)" : "var(--text2)",
        fontWeight: 600, display: "flex", alignItems: "center", gap: 8
      }}>
        {event.certificado_disponivel
          ? "✅ Participantes podem visualizar e imprimir o certificado na área deles."
          : "🔒 Certificados ocultos — participantes não veem a aba de certificado ainda."}
      </div>

      <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid var(--border)", display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Percentual Mínimo</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--navy)" }}>{event.percentual_minimo}%</div>
        </div>
        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>CH para Certificado</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--teal)" }}>{cargaHorariaTotal}h</div>
        </div>
        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Aptos</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--success)" }}>{aptos.length}/{participantes.length}</div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header"><span className="table-title">Lista de Participantes</span></div>
        <table>
          <thead><tr><th>Nome</th><th>CPF</th><th>Instituição</th><th>Cargo</th><th>CH Cumprida</th><th>Percentual</th><th>Status</th></tr></thead>
          <tbody>
            {participantes.map(p => {
              const r = calcPresenca(p.id, atividades, presencas, event);
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.nome}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{p.cpf}</td>
                  <td>{p.instituicao}</td>
                  <td>{p.cargo}</td>
                  <td>{r.chCumprida}h / {r.chTotal}h</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(r.pct, 100)}%`, background: r.apto ? "var(--success)" : "var(--danger)", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{r.pct}%</span>
                    </div>
                  </td>
                  <td><span className={`badge badge-${r.apto ? "success" : "danger"}`}>{r.apto ? "APTO" : "NÃO APTO"}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
