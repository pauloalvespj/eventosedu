import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal } from "../../base/index";
import { calcPresenca, formatData } from "../../../utils/helpers";
import { inserirPresenca, deletarPresenca, inserirPresencaTurno, deletarPresencaTurno } from "../../../lib/db";

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
  const {
    event, presencas, setPresencas, presencasTurno, setPresencasTurno,
    participantes, atividades, turnos, showToast,
  } = useAdmin();
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

  // ── Inserir/cancelar presença manual ──────────────────────────
  const [modalManual, setModalManual] = useState(false);
  const [freqManual, setFreqManual] = useState("");
  const [buscaManual, setBuscaManual] = useState("");

  function abrirModalManual() {
    setFreqManual(filtroFreq || "");
    setBuscaManual("");
    setModalManual(true);
  }

  const itemManual = freqManual ? opcoesFreq.find(o => String(o.id) === String(freqManual)) : null;
  const presencasDoItem = !itemManual ? [] : porTurno
    ? presencasTurno.filter(p => p.turno_id === itemManual.id)
    : presencas.filter(p => p.atividade_id === itemManual.id);
  const idsPresentes = new Set(presencasDoItem.map(p => p.participante_id));
  const termoManual = buscaManual.trim().toLowerCase();
  const candidatos = !itemManual ? [] : credenciados
    .filter(p => !idsPresentes.has(p.id))
    .filter(p => !termoManual || p.nome.toLowerCase().includes(termoManual))
    .slice(0, 20);

  async function adicionarPresencaManual(participanteId) {
    if (!itemManual) return;
    if (porTurno) {
      const { data, error } = await inserirPresencaTurno(participanteId, itemManual.id);
      if (error) { showToast("Erro ao registrar presença: " + error.message, "error"); return; }
      setPresencasTurno(prev => [...prev, data]);
    } else {
      const { data, error } = await inserirPresenca(participanteId, itemManual.id);
      if (error) { showToast("Erro ao registrar presença: " + error.message, "error"); return; }
      setPresencas(prev => [...prev, data]);
    }
    showToast("Presença registrada!", "success");
  }

  async function cancelarPresencaManual(registro) {
    if (!confirm("Cancelar esta presença?")) return;
    if (porTurno) {
      const { error } = await deletarPresencaTurno(registro.id);
      if (error) { showToast("Erro ao cancelar: " + error.message, "error"); return; }
      setPresencasTurno(prev => prev.filter(p => p.id !== registro.id));
    } else {
      const { error } = await deletarPresenca(registro.id);
      if (error) { showToast("Erro ao cancelar: " + error.message, "error"); return; }
      setPresencas(prev => prev.filter(p => p.id !== registro.id));
    }
    showToast("Presença cancelada", "info");
  }

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
        <button className="btn btn-hero" onClick={abrirModalManual}>
          <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Inserir presença manual
        </button>
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

      {/* ── Modal: inserir/cancelar presença manual ── */}
      <Modal show={modalManual} onClose={() => setModalManual(false)} title="Inserir Presença Manual">
        <div className="form-group">
          <label className="form-label">{porTurno ? "Turno" : "Palestra"}</label>
          <select className="form-input" value={freqManual} onChange={e => setFreqManual(e.target.value)}>
            <option value="">Selecione {porTurno ? "o turno" : "a palestra"}…</option>
            {porTurno
              ? opcoesFreq.map(t => <option key={t.id} value={t.id}>{t.nome} — {formatData(t.dia)}</option>)
              : opcoesFreq.map(a => <option key={a.id} value={a.id}>{a.titulo} — {formatData(a.dia)}</option>)}
          </select>
        </div>

        {itemManual && (
          <>
            <div className="form-group">
              <label className="form-label">Buscar participante credenciado</label>
              <input className="form-input" placeholder="Digite o nome…" value={buscaManual} onChange={e => setBuscaManual(e.target.value)} autoFocus />
            </div>
            {termoManual && (
              <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", maxHeight: 180, overflowY: "auto", marginBottom: "1rem" }}>
                {candidatos.length === 0 ? (
                  <div style={{ padding: "0.75rem", fontSize: "0.85rem", color: "var(--text3)" }}>Nenhum participante credenciado encontrado.</div>
                ) : candidatos.map(p => (
                  <div key={p.id} onClick={() => adicionarPresencaManual(p.id)}
                    style={{ padding: "0.6rem 0.85rem", cursor: "pointer", borderBottom: "1px solid var(--border)", fontSize: "0.88rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--surface2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                    <span>{p.nome}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>{p.instituicao}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text2)", marginBottom: "0.5rem" }}>
                Presenças registradas ({presencasDoItem.length})
              </div>
              {presencasDoItem.length === 0 && (
                <div style={{ fontSize: "0.85rem", color: "var(--text3)", fontStyle: "italic" }}>Nenhuma presença registrada ainda.</div>
              )}
              {presencasDoItem.map(reg => {
                const part = participantes.find(x => x.id === reg.participante_id);
                if (!part) return null;
                return (
                  <div key={reg.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                    <span>{part.nome}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{ color: "var(--text3)", fontSize: "0.78rem" }}>{new Date(reg.data_hora).toLocaleString("pt-BR")}</span>
                      <button className="btn btn-sm btn-danger" style={{ padding: "0.2rem 0.5rem" }} title="Cancelar presença" onClick={() => cancelarPresencaManual(reg)}>
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
