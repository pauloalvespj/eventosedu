import { useState } from "react";
import { useAdmin } from "./AdminContext";
import { calcPresenca, formatData } from "../../../utils/helpers";

function MiniBarra({ pct, minimo }) {
  const cls = pct >= minimo ? "" : pct >= minimo * 0.7 ? " warn" : " danger";
  return (
    <div style={{ minWidth: 130 }}>
      <div className="progress-bar" style={{ height: 6 }}>
        <div className={`progress-fill${cls}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: 3 }}>{pct}%</div>
    </div>
  );
}

export function Presencas() {
  const { event, presencas, presencasTurno, participantes, atividades, turnos } = useAdmin();
  const [busca, setBusca] = useState("");
  const [filtroOrgao, setFiltroOrgao] = useState("");
  const [filtroFreq, setFiltroFreq] = useState(""); // id do turno ou da atividade selecionada
  const porTurno = event.modo_frequencia === "turno";
  const registros = porTurno ? presencasTurno : presencas;
  const credenciados = participantes.filter(p => p.credenciado);

  const orgaos = [...new Set(participantes.map(p => p.instituicao).filter(Boolean))].sort();
  const opcoesFreq = porTurno
    ? [...turnos].sort((a, b) => (a.dia + (a.horario_inicio||"")).localeCompare(b.dia + (b.horario_inicio||"")))
    : atividades.filter(a => a.tipo !== "intervalo").sort((a, b) => (a.dia + a.horario).localeCompare(b.dia + b.horario));

  const participantesFiltrados = participantes.filter(p => {
    if (busca.trim()) {
      const termo = busca.trim().toLowerCase();
      const cpfLimpo = (p.cpf || "").replace(/\D/g, "");
      const buscaCpf = busca.trim().replace(/\D/g, "");
      if (!p.nome.toLowerCase().includes(termo) && !(buscaCpf && cpfLimpo.includes(buscaCpf))) return false;
    }
    if (filtroOrgao && p.instituicao !== filtroOrgao) return false;
    if (filtroFreq) {
      const bateu = porTurno
        ? presencasTurno.some(pt => pt.turno_id === Number(filtroFreq) && pt.participante_id === p.id)
        : presencas.some(pr => pr.atividade_id === Number(filtroFreq) && pr.participante_id === p.id);
      if (!bateu) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h1>Presenças</h1>
          <p style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {registros.length} registros totais
            <span className="badge badge-navy" style={{ fontSize: "0.68rem" }}>
              Frequência: {porTurno ? "Por Turno" : "Por Palestra"}
            </span>
          </p>
        </div>
      </div>

      <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid var(--border)", display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Participantes</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--navy)" }}>{participantes.length}</div>
        </div>
        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Credenciados</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--gold-on-dark)" }}>{credenciados.length}/{participantes.length}</div>
        </div>
        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Registros de Presença</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--teal)" }}>{registros.length}</div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <span className="table-title">Frequência por Participante</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <select className="form-input" style={{ width: 170, marginBottom: 0 }} value={filtroOrgao} onChange={e => setFiltroOrgao(e.target.value)}>
              <option value="">Todos os órgãos</option>
              {orgaos.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select className="form-input" style={{ width: 210, marginBottom: 0 }} value={filtroFreq} onChange={e => setFiltroFreq(e.target.value)}>
              <option value="">{porTurno ? "Todos os turnos" : "Todas as palestras"}</option>
              {porTurno
                ? opcoesFreq.map(t => <option key={t.id} value={t.id}>{t.nome} — {formatData(t.dia)}</option>)
                : opcoesFreq.map(a => <option key={a.id} value={a.id}>{a.titulo} — {formatData(a.dia)}</option>)}
            </select>
            <input
              className="form-input"
              type="text"
              placeholder="Buscar por nome ou CPF…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ width: 200, marginBottom: 0 }}
            />
            {(busca || filtroOrgao || filtroFreq) && (
              <button className="btn btn-sm btn-outline" onClick={() => { setBusca(""); setFiltroOrgao(""); setFiltroFreq(""); }} style={{ padding: "0.35rem 0.6rem" }}>✕ Limpar</button>
            )}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nome</th><th>CPF</th><th>Instituição</th><th>Cargo</th>
              <th style={{ width: 90 }}>Registros</th><th>Frequência</th>
            </tr>
          </thead>
          <tbody>
            {participantesFiltrados.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text3)", padding: "2rem" }}>Nenhum participante encontrado para os filtros atuais.</td></tr>
            )}
            {participantesFiltrados.map(p => {
              const r = calcPresenca(p.id, atividades, presencas, event, turnos, presencasTurno);
              const meusRegistros = porTurno
                ? presencasTurno.filter(pt => pt.participante_id === p.id).length
                : presencas.filter(pr => pr.participante_id === p.id).length;
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.nome}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{p.cpf}</td>
                  <td>{p.instituicao}</td>
                  <td>{p.cargo}</td>
                  <td style={{ textAlign: "center" }}>{meusRegistros}</td>
                  <td>
                    {p.credenciado
                      ? <MiniBarra pct={r.pct} minimo={event.percentual_minimo} />
                      : <span style={{ fontSize: "0.78rem", color: "var(--text3)" }}>Não credenciado</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
