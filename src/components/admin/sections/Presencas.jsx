import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faTrash, faQrcode, faPenToSquare, faDownload, faExpand, faXmark, faFilePdf,
} from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal, QRCodeCanvas, DatePickerInput } from "../../base/index";
import { calcPresenca, formatData, qrPresencaTurnoValue } from "../../../utils/helpers";
import { gerarQRCodesTurnosPDF } from "../../../utils/gerarQRCodesTurnosPDF";
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
  const [filtroOrgao, setFiltroOrgao] = useState("");
  const [filtroFreq, setFiltroFreq] = useState(""); // id do turno ou da atividade selecionada
  const porTurno = event.modo_frequencia === "turno";
  const registros = porTurno ? presencasTurno : presencas;
  const credenciados = participantes.filter(p => p.credenciado);
  const [abaPresenca, setAbaPresenca] = useState("registros"); // "registros" | "turnos"

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
            {registros.length} registros totais
            <span className="badge badge-navy" style={{ fontSize: "0.68rem" }}>
              Frequência: {porTurno ? "Por Turno" : "Por Palestra"}
            </span>
          </p>
        </div>
        {abaPresenca === "registros" ? (
          <button className="btn btn-hero" onClick={abrirModalManual}>
            <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Inserir presença manual
          </button>
        ) : (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-sm btn-outline" onClick={baixarPdfQRCodesTurnos} disabled={gerandoPdfTurnos || turnos.length === 0} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FontAwesomeIcon icon={faFilePdf} />
              {gerandoPdfTurnos ? "Gerando…" : "Baixar PDF com QR Codes"}
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => { setFormTurno({ conta_certificado: true, carga_horaria: 0 }); setModalTurno(true); }}>+ Novo Turno</button>
          </div>
        )}
      </div>

      {porTurno && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <button className={`btn btn-sm ${abaPresenca === "registros" ? "btn-primary" : "btn-outline"}`} onClick={() => setAbaPresenca("registros")}>Registros de Presença</button>
          <button className={`btn btn-sm ${abaPresenca === "turnos" ? "btn-primary" : "btn-outline"}`} onClick={() => setAbaPresenca("turnos")}>Turnos ({turnos.length})</button>
        </div>
      )}

      {abaPresenca === "turnos" && porTurno && (
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Turnos ({turnos.length})</span>
        </div>
        <table style={{ width: "100%", tableLayout: "auto", fontSize: "0.82rem" }}>
          <thead><tr>
            <th style={{ width: "36%" }}>Nome</th>
            <th style={{ width: 90 }}>Dia</th>
            <th style={{ width: 110 }}>Horário</th>
            <th style={{ width: 50 }}>CH</th>
            <th style={{ width: 60 }}>Cert.</th>
            <th style={{ width: 60 }}>Pres.</th>
            <th style={{ width: 120 }}>Ações</th>
          </tr></thead>
          <tbody>
            {turnos.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 500 }}>{t.nome}</td>
                <td style={{ fontSize: "0.78rem" }}>{formatData(t.dia)}</td>
                <td style={{ whiteSpace: "nowrap", fontSize: "0.78rem" }}>{t.horario_inicio}{t.horario_fim ? `–${t.horario_fim}` : ""}</td>
                <td style={{ fontSize: "0.78rem" }}>{t.carga_horaria}h</td>
                <td><span className={`badge badge-${t.conta_certificado ? "success" : "warn"}`} style={{ fontSize: "0.68rem" }}>{t.conta_certificado ? "Sim" : "Não"}</span></td>
                <td style={{ textAlign: "center" }}>{presencasTurno.filter(p => p.turno_id === t.id).length}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.2rem" }}>
                    <button className="btn btn-sm btn-outline" onClick={() => setModalQRTurno(t)} title="QR Code"><FontAwesomeIcon icon={faQrcode} /></button>
                    <button className="btn btn-sm btn-outline" onClick={() => { setFormTurno({ ...t, conta_certificado: t.conta_certificado ? "true" : "false" }); setModalTurno(true); }}><FontAwesomeIcon icon={faPenToSquare} /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => excluirTurno(t.id)}><FontAwesomeIcon icon={faTrash} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {abaPresenca === "registros" && (
      <>
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
      </>
      )}

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
