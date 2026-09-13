import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash, faQrcode, faPenToSquare, faDownload, faExpand, faXmark, faFilePdf, faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal, QRCodeCanvas, DatePickerInput } from "../../base/index";
import { calcPresenca, formatData, qrPresencaTurnoValue } from "../../../utils/helpers";
import { gerarQRCodesTurnosPDF } from "../../../utils/gerarQRCodesTurnosPDF";
import { gerarListaAssinaturasPDF } from "../../../utils/gerarListaAssinaturasPDF";
import {
  inserirPresenca, deletarPresenca, inserirPresencaTurno, deletarPresencaTurno,
  inserirTurno, atualizarTurno, deletarTurno, fetchQrTokenTurno, registrarLog,
} from "../../../lib/db";

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
    participantes, atividades, turnos, setTurnos, showToast,
  } = useAdmin();
  const [busca, setBusca] = useState("");
  const [filtroFreq, setFiltroFreq] = useState(""); // id do turno ou da atividade selecionada
  const porTurno = event.modo_frequencia === "turno";
  const registros = porTurno ? presencasTurno : presencas;
  const credenciados = participantes.filter(p => p.credenciado);

  const opcoesFreq = porTurno
    ? [...turnos].sort((a, b) => (a.dia + (a.horario_inicio||"")).localeCompare(b.dia + (b.horario_inicio||"")))
    : atividades.filter(a => a.tipo !== "intervalo").sort((a, b) => (a.dia + a.horario).localeCompare(b.dia + b.horario));

  // ── Seleção de turno (quadros no topo: GERAL + um por turno) ───
  const [turnoSelecionadoId, setTurnoSelecionadoId] = useState(null); // null = GERAL
  const turnoAtivo = porTurno && turnoSelecionadoId != null ? turnos.find(t => t.id === turnoSelecionadoId) : null;

  const presentesTurnoAtivo = !turnoAtivo ? [] : presencasTurno
    .filter(pt => pt.turno_id === turnoAtivo.id)
    .map(pt => ({ registro: pt, participante: participantes.find(p => p.id === pt.participante_id) }))
    .filter(x => x.participante)
    .filter(x => {
      if (busca.trim()) {
        const termo = busca.trim().toLowerCase();
        const cpfLimpo = (x.participante.cpf || "").replace(/\D/g, "");
        const buscaCpf = busca.trim().replace(/\D/g, "");
        const bateu = x.participante.nome.toLowerCase().includes(termo)
          || (x.participante.instituicao || "").toLowerCase().includes(termo)
          || (buscaCpf && cpfLimpo.includes(buscaCpf));
        if (!bateu) return false;
      }
      return true;
    })
    .sort((a, b) => a.participante.nome.localeCompare(b.participante.nome, "pt-BR"));

  const participantesFiltrados = participantes.filter(p => {
    if (busca.trim()) {
      const termo = busca.trim().toLowerCase();
      const cpfLimpo = (p.cpf || "").replace(/\D/g, "");
      const buscaCpf = busca.trim().replace(/\D/g, "");
      const bateu = p.nome.toLowerCase().includes(termo)
        || (p.instituicao || "").toLowerCase().includes(termo)
        || (buscaCpf && cpfLimpo.includes(buscaCpf));
      if (!bateu) return false;
    }
    if (filtroFreq) {
      const bateu = porTurno
        ? presencasTurno.some(pt => pt.turno_id === Number(filtroFreq) && pt.participante_id === p.id)
        : presencas.some(pr => pr.atividade_id === Number(filtroFreq) && pr.participante_id === p.id);
      if (!bateu) return false;
    }
    return true;
  });

  // ── Ordenação da tabela ─────────────────────────────────────────
  const [ordenacao, setOrdenacao] = useState({ campo: "nome", dir: "asc" });

  function toggleOrdenacao(campo) {
    setOrdenacao(prev => prev.campo === campo ? { campo, dir: prev.dir === "asc" ? "desc" : "asc" } : { campo, dir: "asc" });
  }

  const participantesOrdenados = participantesFiltrados
    .map(p => {
      const r = calcPresenca(p.id, atividades, presencas, event, turnos, presencasTurno);
      const meusRegistros = porTurno
        ? presencasTurno.filter(pt => pt.participante_id === p.id).length
        : presencas.filter(pr => pr.participante_id === p.id).length;
      return { ...p, _registros: meusRegistros, _pct: p.credenciado ? r.pct : -1 };
    })
    .sort((a, b) => {
      let va, vb;
      switch (ordenacao.campo) {
        case "cpf": va = a.cpf || ""; vb = b.cpf || ""; break;
        case "instituicao": va = a.instituicao || ""; vb = b.instituicao || ""; break;
        case "registros": va = a._registros; vb = b._registros; break;
        case "frequencia": va = a._pct; vb = b._pct; break;
        default: va = a.nome || ""; vb = b.nome || "";
      }
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.dir === "asc" ? cmp : -cmp;
    });

  function ThOrdenavel({ campo, children, style }) {
    const ativo = ordenacao.campo === campo;
    return (
      <th style={{ ...style, cursor: "pointer", userSelect: "none" }} onClick={() => toggleOrdenacao(campo)} title="Ordenar">
        {children}{ativo ? (ordenacao.dir === "asc" ? " ▲" : " ▼") : ""}
      </th>
    );
  }

  // ── Cancelar presença (usado na lista de presentes do turno) ──
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

  // ── Registrar presença individual (botão ao lado do participante) ──
  // As marcações ficam pendentes localmente e só são gravadas quando o
  // usuário clica em "Registrar" — nada é salvo a cada clique no checkbox.
  const [participanteRegistro, setParticipanteRegistro] = useState(null);
  const [checklistParticipante, setChecklistParticipante] = useState({}); // itemId -> bool
  const [salvandoRegistroParticipante, setSalvandoRegistroParticipante] = useState(false);

  const registrosParticipanteRegistro = !participanteRegistro ? new Map() : new Map(
    (porTurno ? presencasTurno : presencas)
      .filter(r => r.participante_id === participanteRegistro.id)
      .map(r => [porTurno ? r.turno_id : r.atividade_id, r])
  );

  function abrirRegistroParticipante(p) {
    setParticipanteRegistro(p);
    const atual = {};
    (porTurno ? presencasTurno : presencas)
      .filter(r => r.participante_id === p.id)
      .forEach(r => { atual[porTurno ? r.turno_id : r.atividade_id] = true; });
    setChecklistParticipante(atual);
  }

  function fecharRegistroParticipante() {
    setParticipanteRegistro(null);
    setChecklistParticipante({});
  }

  async function confirmarRegistroParticipante() {
    if (!participanteRegistro) return;
    setSalvandoRegistroParticipante(true);
    try {
      for (const o of opcoesFreq) {
        const estava = registrosParticipanteRegistro.has(o.id);
        const quer = !!checklistParticipante[o.id];
        if (estava === quer) continue;
        if (quer) {
          if (porTurno) {
            const { data, error } = await inserirPresencaTurno(participanteRegistro.id, o.id);
            if (error) { showToast("Erro ao registrar presença: " + error.message, "error"); continue; }
            setPresencasTurno(prev => [...prev, data]);
          } else {
            const { data, error } = await inserirPresenca(participanteRegistro.id, o.id);
            if (error) { showToast("Erro ao registrar presença: " + error.message, "error"); continue; }
            setPresencas(prev => [...prev, data]);
          }
        } else {
          const registro = registrosParticipanteRegistro.get(o.id);
          if (!registro) continue;
          if (porTurno) {
            const { error } = await deletarPresencaTurno(registro.id);
            if (error) { showToast("Erro ao cancelar: " + error.message, "error"); continue; }
            setPresencasTurno(prev => prev.filter(p => p.id !== registro.id));
          } else {
            const { error } = await deletarPresenca(registro.id);
            if (error) { showToast("Erro ao cancelar: " + error.message, "error"); continue; }
            setPresencas(prev => prev.filter(p => p.id !== registro.id));
          }
        }
      }
      showToast("Presenças atualizadas!", "success");
      fecharRegistroParticipante();
    } finally {
      setSalvandoRegistroParticipante(false);
    }
  }

  // ── Lista de assinaturas (PDF) ─────────────────────────────────
  const [gerandoListaAssinaturas, setGerandoListaAssinaturas] = useState(false);

  async function baixarListaAssinaturas() {
    setGerandoListaAssinaturas(true);
    try {
      await gerarListaAssinaturasPDF(event, participantes, porTurno ? turnos : null);
    } catch (err) {
      showToast("Erro ao gerar PDF: " + err.message, "error");
    } finally {
      setGerandoListaAssinaturas(false);
    }
  }

  // ── Turnos (modo de frequência "por turno") ───────────────────
  const [modalTurno, setModalTurno]     = useState(false);
  const [formTurno, setFormTurno]       = useState({});
  const [modalQRTurno, setModalQRTurno] = useState(null);
  const [qrTokenTurno, setQrTokenTurno] = useState(null);
  const [gerandoPdfTurnos, setGerandoPdfTurnos] = useState(false);

  useEffect(() => {
    if (!modalQRTurno) { setQrTokenTurno(null); return; }
    fetchQrTokenTurno(modalQRTurno.id).then(setQrTokenTurno);
  }, [modalQRTurno]);

  // ── Telão (exibição em tela cheia do QR do turno para o telão do evento) ──
  const [telaoTurno, setTelaoTurno] = useState(false);
  const telaoRef                    = useRef(null);

  useEffect(() => {
    if (!telaoTurno) return;
    telaoRef.current?.requestFullscreen?.().catch(() => {});
    function onFsChange() { if (!document.fullscreenElement) setTelaoTurno(false); }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [telaoTurno]);

  function fecharTelao() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setTelaoTurno(false);
  }

  async function salvarTurno() {
    if (!formTurno.nome || !formTurno.dia) { showToast("Preencha os campos obrigatórios", "error"); return; }
    const dados = { ...formTurno, carga_horaria: Number(formTurno.carga_horaria) || 0, conta_certificado: formTurno.conta_certificado === "true" || formTurno.conta_certificado === true };
    if (formTurno.id) {
      setTurnos(prev => prev.map(t => t.id === formTurno.id ? { ...dados } : t));
      atualizarTurno(formTurno.id, dados);
    } else {
      const tempId = Date.now();
      setTurnos(prev => [...prev, { ...dados, id: tempId }]);
      const { data } = await inserirTurno({ ...dados, event_id: event.id });
      if (data) setTurnos(prev => prev.map(t => t.id === tempId ? data : t));
    }
    setModalTurno(false);
    showToast("Turno salvo!", "success");
  }

  async function excluirTurno(id) {
    if (!confirm("Excluir turno?")) return;
    const t = turnos.find(x => x.id === id);
    setTurnos(prev => prev.filter(t => t.id !== id));
    deletarTurno(id);
    registrarLog("turno.excluir", "turno", id, t?.nome);
    showToast("Turno excluído", "info");
  }

  async function baixarPdfQRCodesTurnos() {
    setGerandoPdfTurnos(true);
    try {
      await gerarQRCodesTurnosPDF(event, turnos);
    } catch (err) {
      showToast("Erro ao gerar PDF: " + err.message, "error");
    } finally {
      setGerandoPdfTurnos(false);
    }
  }

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h1>Presenças</h1>
          <p style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="badge badge-navy" style={{ fontSize: "0.68rem" }}>
              Frequência: {porTurno ? "Por Turno" : "Por Palestra"}
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn btn-sm btn-outline" onClick={baixarListaAssinaturas} disabled={gerandoListaAssinaturas || participantes.length === 0} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <FontAwesomeIcon icon={faFilePdf} />
            {gerandoListaAssinaturas ? "Gerando…" : "Lista de Assinaturas"}
          </button>
          {porTurno && (
            <button className="btn btn-sm btn-outline" onClick={baixarPdfQRCodesTurnos} disabled={gerandoPdfTurnos || turnos.length === 0} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FontAwesomeIcon icon={faFilePdf} />
              {gerandoPdfTurnos ? "Gerando…" : "Baixar PDF com QR Codes"}
            </button>
          )}
        </div>
      </div>

      {/* ── Seleção de turno: select no mobile, quadros no desktop ── */}
      {porTurno && (
        <select
          className="form-input presencas-turno-select"
          style={{ marginBottom: "1.5rem" }}
          value={turnoSelecionadoId ?? ""}
          onChange={e => {
            const v = e.target.value;
            if (v === "new") { setFormTurno({ conta_certificado: true, carga_horaria: 0 }); setModalTurno(true); return; }
            setTurnoSelecionadoId(v === "" ? null : Number(v));
          }}>
          <option value="">GERAL — Todos os participantes</option>
          {opcoesFreq.map(t => {
            const presentesCount = presencasTurno.filter(pt => pt.turno_id === t.id).length;
            return <option key={t.id} value={t.id}>{t.nome} — {formatData(t.dia)} ({presentesCount} pres.)</option>;
          })}
          <option value="new">+ Novo Turno</option>
        </select>
      )}

      {porTurno && (
        <div className="presencas-turno-cards" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <div
            onClick={() => setTurnoSelecionadoId(null)}
            style={{
              cursor: "pointer", flex: "1 1 150px", maxWidth: 200,
              background: !turnoAtivo ? "var(--navy)" : "var(--surface)",
              color: !turnoAtivo ? "#fff" : "var(--text)",
              border: `1.5px solid ${!turnoAtivo ? "var(--navy)" : "var(--border)"}`,
              borderRadius: "var(--radius)", padding: "0.85rem 1rem",
              display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 76,
              transition: "border-color .15s, background .15s",
            }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>GERAL</div>
            <div style={{ fontSize: "0.74rem", opacity: 0.8, marginTop: 2 }}>Todos os participantes</div>
          </div>

          {opcoesFreq.map(t => {
            const selecionado = turnoSelecionadoId === t.id;
            const presentesCount = presencasTurno.filter(pt => pt.turno_id === t.id).length;
            return (
              <div key={t.id}
                onClick={() => setTurnoSelecionadoId(t.id)}
                style={{
                  cursor: "pointer", flex: "1 1 190px", maxWidth: 240,
                  background: selecionado ? "var(--navy)" : "var(--surface)",
                  color: selecionado ? "#fff" : "var(--text)",
                  border: `1.5px solid ${selecionado ? "var(--navy)" : "var(--border)"}`,
                  borderRadius: "var(--radius)", padding: "0.85rem 1rem",
                  display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 76,
                  transition: "border-color .15s, background .15s",
                }}>
                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{t.nome}</div>
                <div style={{ fontSize: "0.76rem", opacity: 0.8, marginTop: 3 }}>
                  {formatData(t.dia)}{t.horario_inicio ? ` · ${t.horario_inicio}${t.horario_fim ? `–${t.horario_fim}` : ""}` : ""}
                </div>
                <div style={{ fontSize: "0.76rem", fontWeight: 600, marginTop: 3, color: selecionado ? "#fff" : "var(--teal)" }}>
                  {presentesCount} presença{presentesCount === 1 ? "" : "s"}
                </div>
              </div>
            );
          })}

          <button
            onClick={() => { setFormTurno({ conta_certificado: true, carga_horaria: 0 }); setModalTurno(true); }}
            style={{
              flex: "1 1 190px", maxWidth: 240, minHeight: 76,
              border: "1.5px dashed var(--border2)", borderRadius: "var(--radius)",
              background: "transparent", color: "var(--text3)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.85rem", fontWeight: 600,
            }}>
            + Novo Turno
          </button>
        </div>
      )}

      {turnoAtivo ? (
        <>
          <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid var(--border)", display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", fontWeight: 700, color: "var(--navy)" }}>{turnoAtivo.nome}</div>
              <div style={{ fontSize: "0.82rem", color: "var(--text3)", marginTop: 2 }}>
                {formatData(turnoAtivo.dia)}{turnoAtivo.horario_inicio ? ` · ${turnoAtivo.horario_inicio}${turnoAtivo.horario_fim ? `–${turnoAtivo.horario_fim}` : ""}` : ""}
                {" · "}<strong style={{ color: "var(--teal)" }}>{presencasTurno.filter(pt => pt.turno_id === turnoAtivo.id).length}</strong> de {credenciados.length} credenciados presentes
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button className="btn btn-sm btn-outline" onClick={() => setModalQRTurno(turnoAtivo)}><FontAwesomeIcon icon={faQrcode} style={{ marginRight: 6 }} />QR Code</button>
              <button className="btn btn-sm btn-outline" onClick={() => { setFormTurno({ ...turnoAtivo, conta_certificado: turnoAtivo.conta_certificado ? "true" : "false" }); setModalTurno(true); }}>
                <FontAwesomeIcon icon={faPenToSquare} style={{ marginRight: 6 }} />Editar turno
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => { const id = turnoAtivo.id; excluirTurno(id); setTurnoSelecionadoId(prev => prev === id ? null : prev); }}>
                <FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />Excluir
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
              <span className="table-title">Presentes ({presentesTurnoAtivo.length})</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", flex: "1 1 240px" }}>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Buscar por nome, órgão ou CPF…"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  style={{ flex: "1 1 220px", minWidth: 180, marginBottom: 0 }}
                />
                {busca && (
                  <button className="btn btn-sm btn-outline" onClick={() => setBusca("")} style={{ padding: "0.35rem 0.6rem" }}>✕ Limpar</button>
                )}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nome</th><th>Instituição</th><th style={{ width: 140 }}>Registrado em</th><th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {presentesTurnoAtivo.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text3)", padding: "2rem" }}>Nenhuma presença registrada neste turno ainda.</td></tr>
                )}
                {presentesTurnoAtivo.map(({ registro, participante }) => (
                  <tr key={registro.id}>
                    <td style={{ fontWeight: 500 }}>{participante.nome}</td>
                    <td>{participante.instituicao}</td>
                    <td style={{ fontSize: "0.78rem", color: "var(--text3)" }}>{new Date(registro.data_hora).toLocaleString("pt-BR")}</td>
                    <td style={{ textAlign: "center" }}>
                      <button className="btn btn-sm btn-danger" title="Cancelar presença" onClick={() => cancelarPresencaManual(registro)}>
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
      <>
      <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid var(--border)", display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Participantes</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--navy)" }}>{participantes.length}</div>
        </div>
        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Credenciados</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--warn)" }}>{credenciados.length}/{participantes.length}</div>
        </div>
        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Registros de Presença</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--teal)" }}>{registros.length}</div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <span className="table-title">Frequência por Participante</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", flex: "1 1 240px" }}>
            {!porTurno && (
              <select className="form-input" style={{ flex: "1 1 200px", minWidth: 180, marginBottom: 0 }} value={filtroFreq} onChange={e => setFiltroFreq(e.target.value)}>
                <option value="">Todas as palestras</option>
                {opcoesFreq.map(a => <option key={a.id} value={a.id}>{a.titulo} — {formatData(a.dia)}</option>)}
              </select>
            )}
            <input
              className="form-input"
              type="text"
              placeholder="Buscar por nome, órgão ou CPF…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ flex: "1 1 220px", minWidth: 180, marginBottom: 0 }}
            />
            {(busca || filtroFreq) && (
              <button className="btn btn-sm btn-outline" onClick={() => { setBusca(""); setFiltroFreq(""); }} style={{ padding: "0.35rem 0.6rem" }}>✕ Limpar</button>
            )}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <ThOrdenavel campo="nome">Nome</ThOrdenavel>
              <ThOrdenavel campo="cpf">CPF</ThOrdenavel>
              <ThOrdenavel campo="instituicao">Instituição</ThOrdenavel>
              <ThOrdenavel campo="registros" style={{ width: 90 }}>Registros</ThOrdenavel>
              <ThOrdenavel campo="frequencia">Frequência</ThOrdenavel>
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {participantesOrdenados.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text3)", padding: "2rem" }}>Nenhum participante encontrado para os filtros atuais.</td></tr>
            )}
            {participantesOrdenados.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 500 }}>{p.nome}</td>
                <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{p.cpf}</td>
                <td>{p.instituicao}</td>
                <td style={{ textAlign: "center" }}>{p._registros}</td>
                <td>
                  {p.credenciado
                    ? <MiniBarra pct={p._pct} minimo={event.percentual_minimo} />
                    : <span style={{ fontSize: "0.78rem", color: "var(--text3)" }}>Não credenciado</span>}
                </td>
                <td style={{ textAlign: "center" }}>
                  {p.credenciado && (
                    <button className="btn btn-sm btn-outline" title="Registrar presença" onClick={() => abrirRegistroParticipante(p)}>
                      <FontAwesomeIcon icon={faCheck} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}

      {/* ── Modal: registrar presença individual (botão ao lado do participante) ── */}
      <Modal show={!!participanteRegistro} onClose={fecharRegistroParticipante} title={`Registrar Presença${participanteRegistro ? ` — ${participanteRegistro.nome}` : ""}`}>
        {participanteRegistro && (
          <div>
            <p style={{ fontSize: "0.85rem", color: "var(--text3)", marginBottom: "1rem" }}>
              Marque {porTurno ? "os turnos" : "as palestras"} em que este participante esteve presente, desmarque para cancelar, e clique em Registrar.
            </p>
            {opcoesFreq.length === 0 ? (
              <div style={{ fontSize: "0.85rem", color: "var(--text3)", fontStyle: "italic" }}>
                {porTurno ? "Nenhum turno cadastrado." : "Nenhuma palestra cadastrada."}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: 340, overflowY: "auto" }}>
                  {opcoesFreq.map(o => {
                    const marcado = !!checklistParticipante[o.id];
                    return (
                      <label key={o.id}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.5rem 0.65rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", background: marcado ? "var(--success-bg)" : "transparent" }}>
                        <input type="checkbox" checked={marcado} onChange={e => setChecklistParticipante(prev => ({ ...prev, [o.id]: e.target.checked }))} />
                        <span style={{ flex: 1, fontSize: "0.88rem" }}>{porTurno ? o.nome : o.titulo}</span>
                        <span style={{ color: "var(--text3)", fontSize: "0.78rem" }}>{formatData(o.dia)}</span>
                      </label>
                    );
                  })}
                </div>
                <button className="btn btn-primary btn-block" style={{ marginTop: "1rem" }} onClick={confirmarRegistroParticipante} disabled={salvandoRegistroParticipante}>
                  {salvandoRegistroParticipante ? "Salvando…" : "Registrar"}
                </button>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL TURNO */}
      <Modal show={modalTurno} onClose={() => setModalTurno(false)} title={formTurno.id ? "Editar Turno" : "Novo Turno"}>
        <div className="form-group"><label className="form-label">Nome *</label><input className="form-input" placeholder="Ex: Manhã" value={formTurno.nome || ""} onChange={e => setFormTurno(f => ({ ...f, nome: e.target.value }))} /></div>
        <div className="form-grid">
          <DatePickerInput label="Dia *" value={formTurno.dia || ""} onChange={v => setFormTurno(f => ({ ...f, dia: v }))} />
          <div className="form-group"><label className="form-label">Horário início</label><input type="time" className="form-input" value={formTurno.horario_inicio || ""} onChange={e => setFormTurno(f => ({ ...f, horario_inicio: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Horário fim</label><input type="time" className="form-input" value={formTurno.horario_fim || ""} onChange={e => setFormTurno(f => ({ ...f, horario_fim: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Carga Horária (h)</label><input type="number" min={0} step={0.25} className="form-input" value={formTurno.carga_horaria || 0} onChange={e => setFormTurno(f => ({ ...f, carga_horaria: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Conta para certificado</label>
            <select className="form-input" value={formTurno.conta_certificado} onChange={e => setFormTurno(f => ({ ...f, conta_certificado: e.target.value }))}>
              <option value="true">Sim</option><option value="false">Não</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary btn-block" onClick={salvarTurno} style={{ marginTop: "1rem" }}>Salvar</button>
      </Modal>

      {/* MODAL QR CODE DO TURNO */}
      <Modal show={!!modalQRTurno} onClose={() => setModalQRTurno(null)} title="QR Code de Presença do Turno">
        {modalQRTurno && (
          <div style={{ textAlign: "center" }}>
            <p style={{ marginBottom: "1rem", color: "var(--text2)", fontSize: "0.9rem", fontWeight: 600 }}>{modalQRTurno.nome}</p>
            <p style={{ marginBottom: "1.25rem", fontSize: "0.8rem", color: "var(--text3)" }}>{formatData(modalQRTurno.dia)}{modalQRTurno.horario_inicio ? ` · ${modalQRTurno.horario_inicio}${modalQRTurno.horario_fim ? `–${modalQRTurno.horario_fim}` : ""}` : ""}</p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
              {qrTokenTurno
                ? <QRCodeCanvas value={qrPresencaTurnoValue(modalQRTurno.id, qrTokenTurno)} size={200} />
                : <div style={{ width: 200, height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface2)", borderRadius: 8, color: "var(--text3)", fontSize: "0.85rem" }}>Carregando…</div>}
            </div>
            {qrTokenTurno && (
              <div style={{ padding: "0.5rem 0.75rem", background: "var(--gold-pale)", borderRadius: "var(--radius-sm)", fontSize: "0.78rem", color: "var(--warn)", fontFamily: "monospace", marginBottom: "1rem", wordBreak: "break-all" }}>
                {qrPresencaTurnoValue(modalQRTurno.id, qrTokenTurno)}
              </div>
            )}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              <button className="btn btn-sm btn-outline" onClick={() => {
                const canvas = document.querySelector("canvas");
                if (canvas) { const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = `qrcode-turno-${modalQRTurno.id}.png`; a.click(); }
              }}><FontAwesomeIcon icon={faDownload} style={{ marginRight: 6 }} />Baixar PNG</button>
              <button className="btn btn-sm btn-primary" onClick={() => setTelaoTurno(true)} disabled={!qrTokenTurno}>
                <FontAwesomeIcon icon={faExpand} style={{ marginRight: 6 }} />Exibir no telão
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* TELÃO — exibição em tela cheia do QR do turno (projeção no evento) */}
      {telaoTurno && modalQRTurno && (
        <div ref={telaoRef} style={{
          position: "fixed", inset: 0, zIndex: 5000,
          background: "var(--hero-gradient, linear-gradient(135deg,var(--hero-dark),var(--hero)))",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "4vh 4vw", textAlign: "center",
        }}>
          <button className="btn btn-sm btn-outline" onClick={fecharTelao} title="Fechar (Esc)"
            style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}>
            <FontAwesomeIcon icon={faXmark} style={{ marginRight: 6 }} />Fechar
          </button>

          {event.logo_url && (
            <img src={event.logo_url} alt={event.nome} style={{ maxHeight: "min(20vh,220px)", maxWidth: "55vw", objectFit: "contain", marginBottom: "2rem", filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.25))" }} />
          )}

          <div style={{
            background: "#fff", borderRadius: "1.25rem", padding: "clamp(1.5rem,3vw,2.5rem)",
            boxShadow: "0 25px 80px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column", alignItems: "center",
            margin: "0.5rem 0 2rem",
          }}>
            <QRCodeCanvas value={qrPresencaTurnoValue(modalQRTurno.id, qrTokenTurno)} size={Math.min(360, typeof window !== "undefined" ? Math.round(window.innerHeight * 0.36) : 360)} />
          </div>

          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(1.1rem,2.2vw,1.6rem)", color: "#1c2333", fontWeight: 700 }}>
            {modalQRTurno.nome}
          </div>

          <div style={{ marginTop: "2rem", fontSize: "clamp(0.8rem,1.3vw,0.95rem)", color: "var(--hero-subtext)" }}>
            📱 Aponte a câmera do celular para o QR Code e confirme sua presença
          </div>
        </div>
      )}
    </div>
  );
}
