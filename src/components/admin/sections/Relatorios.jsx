import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartBar, faBuilding, faDownload } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { calcPresenca, formatData, TIPO_LABEL } from "../../../utils/helpers";
import { TipoBadge } from "../../base/index";

export function Relatorios() {
  const { event, atividades, participantes, presencas, turnos, presencasTurno, showToast } = useAdmin();

  function exportarCertificados() {
    const header = "Nome,CPF,Instituição,Cargo,CH Cumprida,Percentual,Status\n";
    const rows = participantes.map(p => {
      const r = calcPresenca(p.id, atividades, presencas, event, turnos, presencasTurno);
      return `"${p.nome}","${p.cpf}","${p.instituicao}","${p.cargo}",${r.chCumprida}h,${r.pct}%,${r.apto ? "APTO" : "NÃO APTO"}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "lista_certificados.csv"; a.click();
    showToast("Lista exportada!", "success");
  }

  return (
    <div>
      <div className="admin-topbar"><div><h1>Relatórios</h1><p>Análise e exportação de dados</p></div></div>

      {/* Participantes por instituição */}
      <div className="table-wrap" style={{ marginBottom: "1.5rem" }}>
        <div className="table-header"><span className="table-title"><FontAwesomeIcon icon={faBuilding} style={{ marginRight: 6 }} />Participantes por Instituição</span></div>
        <table>
          <thead><tr><th>Instituição</th><th>Inscritos</th><th>Credenciados</th><th>Aptos ao Certificado</th></tr></thead>
          <tbody>
            {[...new Set(participantes.map(p => p.instituicao))].sort().map(inst => {
              const pts = participantes.filter(p => p.instituicao === inst);
              const cred = pts.filter(p => p.credenciado).length;
              const aptosInst = pts.filter(p => calcPresenca(p.id, atividades, presencas, event, turnos, presencasTurno).apto).length;
              return (
                <tr key={inst}>
                  <td style={{ fontWeight: 600 }}>{inst}</td>
                  <td>{pts.length}</td>
                  <td><span className="badge badge-teal">{cred}</span></td>
                  <td><span className={`badge badge-${aptosInst > 0 ? "success" : "warn"}`}>{aptosInst}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Presença por atividade */}
      <div className="table-wrap" style={{ marginBottom: "1.5rem" }}>
        <div className="table-header">
          <span className="table-title"><FontAwesomeIcon icon={faChartBar} style={{ marginRight: 6 }} />Presença por Atividade</span>
          <button className="btn btn-sm btn-outline" onClick={() => {
            const header = "Atividade,Tipo,Dia,Horário,CH,Presentes,% Comparecimento\n";
            const rows = atividades.filter(a => a.tipo !== "intervalo").map(a => {
              const cnt = presencas.filter(p => p.atividade_id === a.id).length;
              const pct = participantes.length > 0 ? Math.round((cnt / participantes.length) * 100) : 0;
              return `"${a.titulo}","${TIPO_LABEL[a.tipo]||a.tipo}","${formatData(a.dia)}","${a.horario}",${a.carga_horaria}h,${cnt},${pct}%`;
            }).join("\n");
            const blob = new Blob([header+rows],{type:"text/csv"});
            const el=document.createElement("a");el.href=URL.createObjectURL(blob);el.download="presenca_por_atividade.csv";el.click();
            showToast("CSV exportado!","success");
          }}><FontAwesomeIcon icon={faDownload} style={{ marginRight: 6 }} />CSV</button>
        </div>
        <table>
          <thead><tr><th>Atividade</th><th>Tipo</th><th>Dia</th><th>Presentes</th><th>Comparecimento</th></tr></thead>
          <tbody>
            {atividades.filter(a => a.tipo !== "intervalo").map(a => {
              const cnt = presencas.filter(p => p.atividade_id === a.id).length;
              const pct = participantes.length > 0 ? Math.round((cnt / participantes.length) * 100) : 0;
              return (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.titulo}</td>
                  <td><TipoBadge tipo={a.tipo} /></td>
                  <td style={{ fontSize: "0.85rem" }}>{formatData(a.dia)}</td>
                  <td><span className="badge badge-navy">{cnt}</span></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
                      <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: pct >= 75 ? "var(--success)" : pct >= 50 ? "var(--gold)" : "var(--danger)", borderRadius: 4, transition: "width 0.6s" }} />
                      </div>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, minWidth: 36 }}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Exportações */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={exportarCertificados}><FontAwesomeIcon icon={faDownload} style={{ marginRight: 6 }} />Lista de Certificados (CSV)</button>
        <button className="btn btn-outline" onClick={() => {
          const header = "Nome,CPF,Instituição,Cargo,Sexo,E-mail,Credenciado\n";
          const rows = participantes.map(p => `"${p.nome}","${p.cpf}","${p.instituicao}","${p.cargo}","${p.sexo}","${p.email}","${p.credenciado?"Sim":"Não"}"`).join("\n");
          const blob = new Blob([header+rows],{type:"text/csv"});
          const el=document.createElement("a");el.href=URL.createObjectURL(blob);el.download="lista_inscritos.csv";el.click();
          showToast("Lista exportada!","success");
        }}><FontAwesomeIcon icon={faDownload} style={{ marginRight: 6 }} />Lista de Inscritos (CSV)</button>
        <button className="btn btn-outline" onClick={() => {
          const header = "Nome,CPF,Instituição,Atividade,Data/Hora\n";
          const rows = presencas.map(p => {
            const part = participantes.find(x => x.id === p.participante_id);
            const at = atividades.find(a => a.id === p.atividade_id);
            if (!part || !at) return "";
            return `"${part.nome}","${part.cpf}","${part.instituicao}","${at.titulo}","${p.data_hora}"`;
          }).filter(Boolean).join("\n");
          const blob = new Blob([header+rows],{type:"text/csv"});
          const el=document.createElement("a");el.href=URL.createObjectURL(blob);el.download="registro_presencas.csv";el.click();
          showToast("Exportado!","success");
        }}><FontAwesomeIcon icon={faDownload} style={{ marginRight: 6 }} />Registro de Presenças (CSV)</button>
      </div>
    </div>
  );
}
