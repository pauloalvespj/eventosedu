import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faQrcode, faPenToSquare, faTrash, faCheck, faMicrophone,
  faDownload, faClock, faFileAlt, faEye, faEyeSlash, faFilePdf,
  faExpand, faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal, TipoBadge, QRCodeCanvas, DatePickerInput } from "../../base/index";
import { formatData, formatPeriodo, TIPO_LABEL, TIPO_COLOR, TIPO_BG, TIPO_ICON, qrPresencaValue, qrPresencaTurnoValue, diaSemana } from "../../../utils/helpers";
import {
  inserirAtividade, atualizarAtividade, deletarAtividade,
  uploadMaterial, deletarMaterial, atualizarEvento,
  fetchQrToken,
  inserirTurno, atualizarTurno, deletarTurno,
  fetchQrTokenTurno,
  registrarLog,
} from "../../../lib/db";

function formatBytes(b) {
  if (!b) return "";
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)}KB`;
  return `${(b / (1024 * 1024)).toFixed(1)}MB`;
}

export function Programacao() {
  const {
    atividades, setAtividades, palestrantes, presencas,
    turnos, setTurnos, presencasTurno,
    event, setEvent, showToast,
  } = useAdmin();

  const [abaProg, setAbaProg]                   = useState("atividades"); // "atividades" | "turnos"
  const [busca, setBusca]                       = useState("");
  const [modalAtv, setModalAtv]                 = useState(false);
  const [formAtv, setFormAtv]                   = useState({});
  const [modalQR, setModalQR]                   = useState(null);
  const [qrToken, setQrToken]                   = useState(null);

  // Token do QR vem do banco (tabela atividade_qr_tokens, visível só p/ equipe)
  useEffect(() => {
    if (!modalQR) { setQrToken(null); return; }
    fetchQrToken(modalQR.id).then(setQrToken);
  }, [modalQR]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  // ── Turnos (modo de frequência "por turno") ───────────────────
  const [modalTurno, setModalTurno]             = useState(false);
  const [formTurno, setFormTurno]               = useState({});
  const [modalQRTurno, setModalQRTurno]         = useState(null);
  const [qrTokenTurno, setQrTokenTurno]         = useState(null);

  useEffect(() => {
    if (!modalQRTurno) { setQrTokenTurno(null); return; }
    fetchQrTokenTurno(modalQRTurno.id).then(setQrTokenTurno);
  }, [modalQRTurno]);

  // ── Telão (exibição em tela cheia do QR do turno para o telão do evento) ──
  const [telaoTurno, setTelaoTurno]             = useState(false);
  const telaoRef                                = useRef(null);

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

  function getPalestrantes(atv) {
    return (atv.palestrantes_ids || []).map(id => palestrantes.find(p => p.id === id)).filter(Boolean);
  }

  async function salvarAtividade() {
    if (!formAtv.titulo || !formAtv.dia || !formAtv.horario) { showToast("Preencha os campos obrigatórios", "error"); return; }
    const dados = { ...formAtv, carga_horaria: Number(formAtv.carga_horaria) || 1, conta_certificado: formAtv.conta_certificado === "true" || formAtv.conta_certificado === true, palestrantes_ids: formAtv.palestrantes_ids || [], materiais: formAtv.materiais || [] };
    if (formAtv.id) {
      setAtividades(prev => prev.map(a => a.id === formAtv.id ? { ...dados } : a));
      atualizarAtividade(formAtv.id, dados);
    } else {
      const tempId = Date.now();
      setAtividades(prev => [...prev, { ...dados, id: tempId }]);
      const { data } = await inserirAtividade({ ...dados, event_id: 1 });
      if (data) setAtividades(prev => prev.map(a => a.id === tempId ? data : a));
    }
    setModalAtv(false);
    showToast("Atividade salva!", "success");
  }

  async function excluirAtividade(id) {
    if (!confirm("Excluir atividade?")) return;
    const a = atividades.find(x => x.id === id);
    setAtividades(prev => prev.filter(a => a.id !== id));
    deletarAtividade(id);
    registrarLog("atividade.excluir", "atividade", id, a?.titulo);
    showToast("Atividade excluída", "info");
  }

  const filtradas = atividades.filter(a => a.titulo.toLowerCase().includes(busca.toLowerCase()));
  const visivel = event?.programacao_visivel !== false;

  async function toggleVisibilidade() {
    const novoValor = !visivel;
    setEvent(ev => ({ ...ev, programacao_visivel: novoValor }));
    atualizarEvento(event.id, { programacao_visivel: novoValor });
    showToast(novoValor ? "Programação liberada no site!" : "Programação bloqueada (Em breve)", novoValor ? "success" : "warn");
  }

  async function gerarPDF() {
    // Carregadas sob demanda — jspdf/autotable ficam fora do bundle inicial
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const NAVY    = [15, 52, 96];
    const WHITE   = [255, 255, 255];
    const GOLD    = [201, 168, 76];
    const DAY_BG  = [224, 232, 248];
    const INT_BG  = [242, 244, 248];
    const INT_TEXT = [130, 140, 160];

    // Logo para assinatura no rodapé
    let logoDataUrl = null;
    if (event.logo_url) {
      try {
        logoDataUrl = await new Promise(resolve => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext("2d").drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          };
          img.onerror = () => resolve(null);
          img.src = event.logo_url;
        });
      } catch { logoDataUrl = null; }
    }

    // Cabeçalho
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 32, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, 29, pageW, 3, "F");

    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(event.nome || "Evento", 14, 12);

    if (event.nome_completo) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(event.nome_completo, 14, 20);
    }

    const ano = event.data_inicio ? event.data_inicio.split("-")[0] : "";
    const periodo = event.data_inicio
      ? `${formatPeriodo(event.data_inicio, event.data_fim)}${ano ? ` de ${ano}` : ""}`
      : "";
    const localStr = event.local || "";
    const infoLinha = [periodo, localStr].filter(Boolean).join("  ·  ");
    if (infoLinha) {
      doc.setFontSize(7.5);
      doc.setTextColor(180, 200, 230);
      doc.text(infoLinha, 14, 27);
    }

    // Dias
    const dias = [...new Set(atividades.map(a => a.dia))].sort();
    let curY = 36;

    dias.forEach((dia, idx) => {
      if (idx > 0) curY += 3;
      const atvsNoDia = atividades
        .filter(a => a.dia === dia && a.tipo !== "intervalo")
        .sort((a, b) => a.horario.localeCompare(b.horario));

      autoTable(doc, {
        startY: curY,
        head: [[{
          content: `${diaSemana(dia)}, ${formatData(dia)}`,
          colSpan: 3,
          styles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 9, halign: "left", cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
        }]],
        body: atvsNoDia.map(a => {
          const pals = getPalestrantes(a);
          const palNomes = pals.map(p => p.nome + (p.instituicao ? ` – ${p.instituicao}` : "")).join("\n");
          const convs = (a.convidados || "").split("\n").filter(Boolean).join("\n");
          const pessoas = [palNomes, convs].filter(Boolean).join("\n");
          const horario = a.horario + (a.horario_fim ? ` – ${a.horario_fim}` : "");
          const conteudo = a.titulo + (pessoas ? "\n" + pessoas : "");
          return [horario, TIPO_LABEL[a.tipo] || a.tipo || "", conteudo];
        }),
        theme: "grid",
        styles: { fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, overflow: "linebreak", minCellHeight: 7 },
        columnStyles: {
          0: { cellWidth: 24, halign: "center", fontStyle: "bold" },
          1: { cellWidth: 28 },
          2: { cellWidth: "auto" },
        },
        didParseCell: (data) => {
          if (data.section !== "body") return;
          const a = atvsNoDia[data.row.index];
          if (!a) return;
          if (a.tipo === "intervalo") {
            data.cell.styles.fillColor = INT_BG;
            data.cell.styles.textColor = INT_TEXT;
          }
        },
        margin: { left: 14, right: 14 },
      });

      curY = doc.lastAutoTable.finalY;
    });

    // Rodapé
    const total = doc.getNumberOfPages();
    const logoFootH = logoDataUrl ? 16 : 0;
    const logoFootW = logoFootH * 3;
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setDrawColor(220, 224, 230);
      doc.line(14, pageH - 14, pageW - 14, pageH - 14);
      doc.setFontSize(6.5);
      doc.setTextColor(170, 175, 185);
      doc.text(`${event.nome || "Evento"} — Programação Completa`, 14, pageH - 10);
      doc.text(`${i} / ${total}`, pageW - 14, pageH - 10, { align: "right" });
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", (pageW - logoFootW) / 2, pageH - 34, logoFootW, logoFootH, undefined, "FAST");
      }
    }

    const slug = (event.nome || "programacao").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    doc.save(`${slug}-programacao.pdf`);
  }

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Programação</h1><p>Atividades e palestras</p></div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {abaProg === "atividades" && (
            <>
              <button
                className={`btn btn-sm ${visivel ? "btn-outline" : "btn-danger"}`}
                onClick={toggleVisibilidade}
                title={visivel ? "Clique para bloquear (mostra Em breve no site)" : "Clique para liberar (mostra programação no site)"}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <FontAwesomeIcon icon={visivel ? faEye : faEyeSlash} />
                {visivel ? "Visível no site" : "Em breve no site"}
              </button>
              <button className="btn btn-sm btn-outline" onClick={gerarPDF} style={{ display:"flex", alignItems:"center", gap:6 }}>
                <FontAwesomeIcon icon={faFilePdf} />
                Exportar PDF
              </button>
              <button className="btn btn-sm btn-primary" onClick={() => { setFormAtv({ conta_certificado: true, carga_horaria: 1, tipo: "palestra", convidados: "", palestrantes_ids: [], materiais: [] }); setModalAtv(true); }}>+ Nova Atividade</button>
            </>
          )}
          {abaProg === "turnos" && (
            <button className="btn btn-sm btn-primary" onClick={() => { setFormTurno({ conta_certificado: true, carga_horaria: 0 }); setModalTurno(true); }}>+ Novo Turno</button>
          )}
        </div>
      </div>

      {event.modo_frequencia === "turno" && (
        <div style={{ display:"flex", gap:"0.5rem", marginBottom:"1rem" }}>
          <button className={`btn btn-sm ${abaProg==="atividades"?"btn-primary":"btn-outline"}`} onClick={() => setAbaProg("atividades")}>Atividades</button>
          <button className={`btn btn-sm ${abaProg==="turnos"?"btn-primary":"btn-outline"}`} onClick={() => setAbaProg("turnos")}>Turnos ({turnos.length})</button>
        </div>
      )}

      {abaProg === "atividades" && (
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Atividades ({atividades.length})</span>
          <input className="search-input" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <table style={{ width: "100%", tableLayout: "auto", fontSize: "0.82rem" }}>
          <thead><tr>
            <th style={{ whiteSpace:"nowrap" }}>Tipo</th>
            <th style={{ width:"40%" }}>Título</th>
            <th style={{ width: 82 }}>Dia</th>
            <th style={{ width: 100 }}>Horário</th>
            <th style={{ width: 44 }}>CH</th>
            <th style={{ width: 52 }}>Cert.</th>
            <th style={{ width: 52 }}>Pres.</th>
            <th style={{ width: 112 }}>Ações</th>
          </tr></thead>
          <tbody>
            {filtradas.map(a => (
              <tr key={a.id}>
                <td><span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"0.15rem 0.5rem", borderRadius:50, fontSize:"0.7rem", fontWeight:700, background: TIPO_BG[a.tipo]||"#eee", color: TIPO_COLOR[a.tipo]||"#333", whiteSpace:"nowrap" }}>{TIPO_ICON[a.tipo]} {TIPO_LABEL[a.tipo]||a.tipo}</span></td>
                <td title={a.titulo} style={{ maxWidth: 0 }}>
                  <div style={{ fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.titulo}</div>
                  {getPalestrantes(a).length > 0 && (
                    <div style={{ fontSize:"0.7rem", color:"var(--teal)", marginTop:1 }}>
                      <FontAwesomeIcon icon={faMicrophone} style={{ marginRight:3, fontSize:"0.65rem" }} />
                      {getPalestrantes(a).map((p, i, arr) => (
                        <span key={p.id}>
                          {p.nome.split(" ").slice(0,2).join(" ")}
                          {arr[i+1] ? <span style={{ color:"var(--border2)" }}> · </span> : ""}
                          {(p.instituicao || p.cargo) && (
                            <span style={{ display:"block", fontSize:"0.68rem", color:"var(--text2)", fontWeight:400, marginTop:1, paddingLeft:14 }}>
                              {[p.instituicao, p.cargo].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                  {(a.materiais || []).length > 0 && (
                    <span style={{ fontSize:"0.65rem", color:"var(--teal)", fontWeight:600 }}>
                      <FontAwesomeIcon icon={faDownload} style={{ marginRight:2 }} />{a.materiais.length} material(is)
                    </span>
                  )}
                </td>
                <td style={{ fontSize:"0.78rem" }}>{formatData(a.dia)}</td>
                <td style={{ whiteSpace:"nowrap", fontSize:"0.78rem" }}>{a.horario}{a.horario_fim ? `–${a.horario_fim}` : ""}</td>
                <td style={{ fontSize:"0.78rem" }}>{a.carga_horaria}h</td>
                <td><span className={`badge badge-${a.conta_certificado ? "success" : "warn"}`} style={{ fontSize:"0.68rem" }}>{a.conta_certificado ? "Sim" : "Não"}</span></td>
                <td style={{ textAlign:"center" }}>{presencas.filter(p => p.atividade_id === a.id).length}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.2rem" }}>
                    {a.conta_certificado && event.modo_frequencia !== "turno" && <button className="btn btn-sm btn-outline" onClick={() => setModalQR(a)} title="QR Code"><FontAwesomeIcon icon={faQrcode} /></button>}
                    <button className="btn btn-sm btn-outline" onClick={() => { setFormAtv({ ...a, conta_certificado: a.conta_certificado ? "true" : "false", palestrantes_ids: a.palestrantes_ids || [], materiais: a.materiais || [] }); setModalAtv(true); }}><FontAwesomeIcon icon={faPenToSquare} /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => excluirAtividade(a.id)}><FontAwesomeIcon icon={faTrash} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {abaProg === "turnos" && event.modo_frequencia === "turno" && (
      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Turnos ({turnos.length})</span>
        </div>
        <table style={{ width: "100%", tableLayout: "auto", fontSize: "0.82rem" }}>
          <thead><tr>
            <th style={{ width:"36%" }}>Nome</th>
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
                <td style={{ fontWeight:500 }}>{t.nome}</td>
                <td style={{ fontSize:"0.78rem" }}>{formatData(t.dia)}</td>
                <td style={{ whiteSpace:"nowrap", fontSize:"0.78rem" }}>{t.horario_inicio}{t.horario_fim ? `–${t.horario_fim}` : ""}</td>
                <td style={{ fontSize:"0.78rem" }}>{t.carga_horaria}h</td>
                <td><span className={`badge badge-${t.conta_certificado ? "success" : "warn"}`} style={{ fontSize:"0.68rem" }}>{t.conta_certificado ? "Sim" : "Não"}</span></td>
                <td style={{ textAlign:"center" }}>{presencasTurno.filter(p => p.turno_id === t.id).length}</td>
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
        <button className="btn btn-primary btn-block" onClick={salvarTurno} style={{ marginTop:"1rem" }}>Salvar</button>
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

      {/* MODAL ATIVIDADE */}
      <Modal show={modalAtv} onClose={() => setModalAtv(false)} title={formAtv.id ? "Editar Atividade" : "Nova Atividade"}>
        <div className="form-group">
          <label className="form-label">Tipo de Atividade</label>
          <select className="form-input" value={formAtv.tipo || "palestra"} onChange={e => setFormAtv(f => ({ ...f, tipo: e.target.value }))}>
            <option value="palestra">Palestra</option>
            <option value="mesa_redonda">Mesa Redonda</option>
            <option value="painel">Painel</option>
            <option value="solenidade">Solenidade</option>
            <option value="encerramento">Encerramento</option>
            <option value="credenciamento">Credenciamento</option>
            <option value="intervalo">Intervalo</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Título *</label><input className="form-input" value={formAtv.titulo || ""} onChange={e => setFormAtv(f => ({ ...f, titulo: e.target.value }))} /></div>
        <div className="form-group"><label className="form-label">Descrição</label><textarea className="form-input" rows={2} value={formAtv.descricao || ""} onChange={e => setFormAtv(f => ({ ...f, descricao: e.target.value }))} /></div>
        <div className="form-grid">
          <DatePickerInput label="Dia *" value={formAtv.dia || ""} onChange={v => setFormAtv(f => ({ ...f, dia: v }))} />
          <div className="form-group"><label className="form-label">Horário início *</label><input type="time" className="form-input" value={formAtv.horario || ""} onChange={e => setFormAtv(f => ({ ...f, horario: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Horário fim</label><input type="time" className="form-input" value={formAtv.horario_fim || ""} onChange={e => setFormAtv(f => ({ ...f, horario_fim: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Carga Horária (h)</label><input type="number" min={0} step={0.25} className="form-input" value={formAtv.carga_horaria || 0} onChange={e => setFormAtv(f => ({ ...f, carga_horaria: e.target.value }))} /></div>
          <div className="form-group" style={{ gridColumn:"1/-1" }}>
            <label className="form-label">Palestrantes</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"0.4rem", padding:"0.5rem", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", minHeight:40 }}>
              {palestrantes.length === 0 && <span style={{ fontSize:"0.8rem", color:"var(--text3)" }}>Nenhum palestrante cadastrado</span>}
              {palestrantes.map(p => {
                const sel = (formAtv.palestrantes_ids || []).includes(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => {
                    const cur = formAtv.palestrantes_ids || [];
                    const next = sel ? cur.filter(id => id !== p.id) : [...cur, p.id];
                    setFormAtv(f => ({ ...f, palestrantes_ids: next }));
                  }} style={{ padding:"0.25rem 0.65rem", borderRadius:50, border:`1.5px solid ${sel?"var(--teal)":"var(--border)"}`, background:sel?"var(--teal)":"var(--surface2)", color:sel?"#fff":"var(--text)", fontSize:"0.8rem", cursor:"pointer", fontWeight:sel?600:400, display:"inline-flex", alignItems:"center", gap:5 }}>
                    {sel && <FontAwesomeIcon icon={faCheck} style={{ fontSize:"0.65rem" }} />}
                    {p.nome.split(" ").slice(0,2).join(" ")}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="form-group"><label className="form-label">Conta para certificado</label>
            <select className="form-input" value={formAtv.conta_certificado} onChange={e => setFormAtv(f => ({ ...f, conta_certificado: e.target.value }))}>
              <option value="true">Sim</option><option value="false">Não</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Convidados / Participantes (um por linha)</label>
          <textarea className="form-input" rows={2} placeholder={"Ex:\nReitor da UFC\nSuperintendente da CGU"} value={formAtv.convidados || ""} onChange={e => setFormAtv(f => ({ ...f, convidados: e.target.value }))} />
        </div>

        {/* MATERIAIS */}
        <div style={{ borderTop:"1px solid var(--border)", paddingTop:"1rem", marginTop:"0.25rem" }}>
          <div style={{ fontWeight:700, color:"var(--navy)", marginBottom:"0.75rem", fontSize:"0.88rem", display:"flex", alignItems:"center", gap:8 }}>
            <FontAwesomeIcon icon={faDownload} />Materiais para Download
            <span style={{ fontSize:"0.72rem", color:"var(--text3)", fontWeight:400 }}>arquivos disponíveis aos participantes</span>
          </div>
          {(formAtv.materiais || []).length === 0 && <div style={{ fontSize:"0.82rem", color:"var(--text3)", marginBottom:"0.75rem" }}>Nenhum arquivo adicionado.</div>}
          {(formAtv.materiais || []).map(m => (
            <div key={m.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"0.4rem 0.6rem", background:"var(--surface2)", borderRadius:"var(--radius-sm)", marginBottom:"0.4rem" }}>
              <FontAwesomeIcon icon={faFileAlt} style={{ color:"var(--teal)", flexShrink:0 }} />
              <span style={{ flex:1, fontSize:"0.82rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.nome}</span>
              <span style={{ fontSize:"0.72rem", color:"var(--text3)", flexShrink:0 }}>{formatBytes(m.tamanho)}</span>
              <a href={m.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline" style={{ padding:"0.15rem 0.5rem", fontSize:"0.72rem" }}><FontAwesomeIcon icon={faDownload} /></a>
              <button className="btn btn-sm btn-danger" style={{ padding:"0.15rem 0.5rem", fontSize:"0.72rem" }}
                onClick={() => { setFormAtv(f => ({ ...f, materiais: f.materiais.filter(x => x.id !== m.id) })); deletarMaterial(m.path).catch(() => {}); }}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          ))}
          <label style={{ cursor: uploadingMaterial ? "wait" : "pointer" }}>
            <input type="file" multiple style={{ display:"none" }} disabled={uploadingMaterial}
              onChange={async e => {
                const files = Array.from(e.target.files);
                if (!files.length) return;
                setUploadingMaterial(true);
                try {
                  for (const file of files) {
                    const mat = await uploadMaterial(formAtv.id || `new-${Date.now()}`, file);
                    setFormAtv(f => ({ ...f, materiais: [...(f.materiais || []), mat] }));
                  }
                } catch (err) { showToast("Erro ao enviar: " + err.message, "error"); }
                finally { setUploadingMaterial(false); e.target.value = ""; }
              }} />
            <span className="btn btn-sm btn-outline" style={{ pointerEvents:"none" }}>
              <FontAwesomeIcon icon={uploadingMaterial ? faClock : faDownload} style={{ marginRight:6 }} />
              {uploadingMaterial ? "Enviando..." : "Adicionar arquivo"}
            </span>
          </label>
        </div>
        <button className="btn btn-primary btn-block" onClick={salvarAtividade} style={{ marginTop:"1rem" }}>Salvar</button>
      </Modal>

      {/* MODAL QR CODE */}
      <Modal show={!!modalQR} onClose={() => setModalQR(null)} title="QR Code de Presença">
        {modalQR && (
          <div style={{ textAlign: "center" }}>
            <p style={{ marginBottom: "1rem", color: "var(--text2)", fontSize: "0.9rem", fontWeight: 600 }}>{modalQR.titulo}</p>
            <p style={{ marginBottom: "1.25rem", fontSize: "0.8rem", color: "var(--text3)" }}>{formatData(modalQR.dia)} · {modalQR.horario} · {modalQR.local}</p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
              {qrToken
                ? <QRCodeCanvas value={qrPresencaValue(modalQR.id, qrToken)} size={200} />
                : <div style={{ width: 200, height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface2)", borderRadius: 8, color: "var(--text3)", fontSize: "0.85rem" }}>Carregando…</div>}
            </div>
            {qrToken && (
              <div style={{ padding: "0.5rem 0.75rem", background: "var(--gold-pale)", borderRadius: "var(--radius-sm)", fontSize: "0.78rem", color: "var(--warn)", fontFamily: "monospace", marginBottom: "1rem", wordBreak: "break-all" }}>
                {qrPresencaValue(modalQR.id, qrToken)}
              </div>
            )}
            <button className="btn btn-sm btn-outline" onClick={() => {
              const canvas = document.querySelector("canvas");
              if (canvas) { const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = `qrcode-atividade-${modalQR.id}.png`; a.click(); }
            }}><FontAwesomeIcon icon={faDownload} style={{ marginRight: 6 }} />Baixar PNG</button>
          </div>
        )}
      </Modal>

    </div>
  );
}
