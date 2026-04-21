import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faIdBadge, faCircleCheck, faTrophy, faCalendarDays, faClock } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { calcPresenca } from "../../../utils/helpers";

export function Dashboard() {
  const { user, event, atividades, participantes, presencas } = useAdmin();

  const cargaHorariaTotal = atividades.filter(a => a.conta_certificado).reduce((s, a) => s + a.carga_horaria, 0);
  const totalInscritos    = participantes.length;
  const totalCredenciados = participantes.filter(p => p.credenciado).length;
  const aptos             = participantes.filter(p => calcPresenca(p.id, atividades, presencas, event).apto);

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral do evento</p>
        </div>
        <span className="badge badge-navy">{event.nome.substring(0, 30)}...</span>
      </div>

      <div className="dash-grid">
        {[
          { n: totalInscritos,      l: "Total de Inscritos",       ic: faUsers,       c: "navy" },
          { n: totalCredenciados,   l: "Credenciados",             ic: faIdBadge,     c: "teal" },
          { n: presencas.length,    l: "Registros de Presença",    ic: faCircleCheck, c: "success" },
          { n: aptos.length,        l: "Aptos ao Certificado",     ic: faTrophy,      c: "gold" },
          { n: atividades.length,   l: "Atividades Cadastradas",   ic: faCalendarDays,c: "navy" },
          { n: `${cargaHorariaTotal}h`, l: "Carga Horária (Cert.)",ic: faClock,       c: "teal" },
        ].map((c, i) => (
          <div key={i} className="dash-card">
            <div className={`dash-card-icon ${c.c}`}><FontAwesomeIcon icon={c.ic} /></div>
            <div className="dash-card-num">{c.n}</div>
            <div className="dash-card-lbl">{c.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div className="table-wrap">
          <div className="table-header"><span className="table-title">Atividades mais frequentadas</span></div>
          <table>
            <thead><tr><th>Atividade</th><th>Presenças</th></tr></thead>
            <tbody>
              {[...atividades].sort((a,b) => {
                const ca = presencas.filter(p=>p.atividade_id===a.id).length;
                const cb = presencas.filter(p=>p.atividade_id===b.id).length;
                return cb - ca;
              }).slice(0, 8).map(a => {
                const cnt = presencas.filter(p => p.atividade_id === a.id).length;
                return (
                  <tr key={a.id}>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.titulo}</td>
                    <td><span className="badge badge-navy">{cnt}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="table-wrap">
          <div className="table-header"><span className="table-title">Status dos participantes</span></div>
          <table>
            <thead><tr><th>Participante</th><th>Presença</th><th>Status</th></tr></thead>
            <tbody>
              {participantes.slice(0, 6).map(p => {
                const r = calcPresenca(p.id, atividades, presencas, event);
                return (
                  <tr key={p.id}>
                    <td>{p.nome.split(" ").slice(0, 2).join(" ")}</td>
                    <td>{r.pct}%</td>
                    <td><span className={`badge badge-${r.apto ? "success" : "warn"}`}>{r.apto ? "Apto" : "Pendente"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
