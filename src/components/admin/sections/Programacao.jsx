import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faQrcode, faPenToSquare, faTrash, faCheck, faMicrophone,
  faDownload, faClock, faFileAlt, faEye, faEyeSlash, faFilePdf,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal, TipoBadge, QRCodeCanvas, DatePickerInput } from "../../base/index";
import { formatData, TIPO_LABEL, TIPO_COLOR, TIPO_BG, TIPO_ICON, qrPresencaValue, ATIVIDADE_STATUS_LABEL, ATIVIDADE_STATUS_BADGE } from "../../../utils/helpers";
import { gerarProgramacaoPDF } from "../../../utils/gerarProgramacaoPDF";
import {
  inserirAtividade, atualizarAtividade, deletarAtividade,
  uploadMaterial, deletarMaterial, atualizarEvento,
  fetchQrToken,
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
    atividades, setAtividades, palestrantes,
    event, setEvent, showToast,
  } = useAdmin();

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

  async function toggleStatus(a) {
    const novoStatus = a.status === "realizada" ? "agendada" : "realizada";
    setAtividades(prev => prev.map(x => x.id === a.id ? { ...x, status: novoStatus } : x));
    atualizarAtividade(a.id, { status: novoStatus });
    showToast(novoStatus === "realizada" ? "Atividade marcada como realizada — materiais liberados aos participantes" : "Atividade marcada como agendada", novoStatus === "realizada" ? "success" : "info");
  }

  function abrirEdicao(a) {
    setFormAtv({ ...a, conta_certificado: a.conta_certificado ? "true" : "false", palestrantes_ids: a.palestrantes_ids || [], materiais: a.materiais || [] });
    setModalAtv(true);
  }

  async function excluirAtividade(id) {
    if (!confirm("Excluir atividade?")) return;
    const a = atividades.find(x => x.id === id);
    setAtividades(prev => prev.filter(a => a.id !== id));
    deletarAtividade(id);
    registrarLog("atividade.excluir", "atividade", id, a?.titulo);
    showToast("Atividade excluída", "info");
  }

  const filtradas = atividades
    .filter(a => a.titulo.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => (a.dia || "").localeCompare(b.dia || "") || (a.horario || "").localeCompare(b.horario || ""));
  const visivel = event?.programacao_visivel !== false;

  async function toggleVisibilidade() {
    const novoValor = !visivel;
    setEvent(ev => ({ ...ev, programacao_visivel: novoValor }));
    atualizarEvento(event.id, { programacao_visivel: novoValor });
    showToast(novoValor ? "Programação liberada no site!" : "Programação bloqueada (Em breve)", novoValor ? "success" : "warn");
  }

  async function gerarPDF() {
    await gerarProgramacaoPDF(event, atividades, palestrantes);
  }

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Programação</h1><p>Atividades e palestras</p></div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
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
          <button className="btn btn-sm btn-primary" onClick={() => { setFormAtv({ conta_certificado: true, carga_horaria: 1, tipo: "palestra", convidados: "", palestrantes_ids: [], materiais: [], status: "agendada" }); setModalAtv(true); }}>+ Nova Atividade</button>
        </div>
      </div>

      <div className="table-wrap prog-table-wrap">
        <div className="table-header">
          <span className="table-title">Atividades ({atividades.length})</span>
          <input className="search-input" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <table style={{ width: "100%", minWidth: 760, tableLayout: "auto", fontSize: "0.82rem" }}>
          <thead><tr>
            <th style={{ whiteSpace:"nowrap" }}>Tipo</th>
            <th style={{ width:"40%" }}>Título</th>
            <th style={{ width: 82 }}>Dia</th>
            <th style={{ width: 100 }}>Horário</th>
            <th style={{ width: 44 }}>CH</th>
            <th style={{ width: 52 }}>Anexo</th>
            <th style={{ width: 90 }}>Status</th>
            <th style={{ width: 112 }}>Ações</th>
          </tr></thead>
          <tbody>
            {filtradas.map(a => (
              <tr key={a.id}>
                <td><span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"0.15rem 0.5rem", borderRadius:50, fontSize:"0.7rem", fontWeight:700, background: TIPO_BG[a.tipo]||"#eee", color: TIPO_COLOR[a.tipo]||"#333", whiteSpace:"nowrap" }}>{TIPO_ICON[a.tipo]} {TIPO_LABEL[a.tipo]||a.tipo}</span></td>
                <td>
                  <div style={{ fontWeight:500 }}>{a.titulo}</div>
                  {getPalestrantes(a).length > 0 && (
                    <div style={{ fontSize:"0.7rem", color:"var(--teal)", marginTop:1 }}>
                      <FontAwesomeIcon icon={faMicrophone} style={{ marginRight:3, fontSize:"0.65rem" }} />
                      {getPalestrantes(a).map((p, i, arr) => (
                        <span key={p.id}>
                          {p.nome}
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
                </td>
                <td style={{ fontSize:"0.78rem" }}>{formatData(a.dia)}</td>
                <td style={{ whiteSpace:"nowrap", fontSize:"0.78rem" }}>{a.horario}{a.horario_fim ? `–${a.horario_fim}` : ""}</td>
                <td style={{ fontSize:"0.78rem" }}>{a.carga_horaria}h</td>
                <td style={{ textAlign:"center" }}>
                  {(a.materiais || []).length > 0
                    ? <a href={a.materiais[0].url} target="_blank" rel="noreferrer" title={`Baixar: ${a.materiais.map(m => m.nome).join(", ")}`} style={{ color:"var(--teal)" }}>
                        <FontAwesomeIcon icon={faFilePdf} />
                      </a>
                    : <span style={{ color:"var(--text3)" }}>—</span>}
                </td>
                <td>
                  <button
                    className={`badge ${ATIVIDADE_STATUS_BADGE[a.status] || "badge-warn"}`}
                    onClick={() => toggleStatus(a)}
                    title={a.status === "realizada" ? "Clique para voltar para Agendada" : "Clique para marcar como Realizada e liberar materiais"}
                    style={{ fontSize:"0.68rem", border:"none", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4 }}
                  >
                    <FontAwesomeIcon icon={a.status === "realizada" ? faCircleCheck : faClock} />
                    {ATIVIDADE_STATUS_LABEL[a.status] || "Agendada"}
                  </button>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.2rem" }}>
                    {a.conta_certificado && event.modo_frequencia !== "turno" && <button className="btn btn-sm btn-outline" onClick={() => setModalQR(a)} title="QR Code"><FontAwesomeIcon icon={faQrcode} /></button>}
                    <button className="btn btn-sm btn-outline" onClick={() => abrirEdicao(a)}><FontAwesomeIcon icon={faPenToSquare} /></button>
                    <button className="btn btn-sm btn-danger" onClick={() => excluirAtividade(a.id)}><FontAwesomeIcon icon={faTrash} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="prog-cards">
        <div className="table-header" style={{ marginBottom: "0.75rem" }}>
          <span className="table-title">Atividades ({atividades.length})</span>
          <input className="search-input" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        {filtradas.map(a => (
          <div className="credenc-card" key={a.id}>
            <div className="credenc-card-top">
              <div>
                <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"0.15rem 0.5rem", borderRadius:50, fontSize:"0.68rem", fontWeight:700, background: TIPO_BG[a.tipo]||"#eee", color: TIPO_COLOR[a.tipo]||"#333", marginBottom:6 }}>{TIPO_ICON[a.tipo]} {TIPO_LABEL[a.tipo]||a.tipo}</span>
                <div className="credenc-card-nome">{a.titulo}</div>
                {getPalestrantes(a).length > 0 && (
                  <div className="credenc-card-sub">
                    <FontAwesomeIcon icon={faMicrophone} style={{ marginRight:4, fontSize:"0.68rem" }} />
                    {getPalestrantes(a).map(p => p.nome).join(" · ")}
                  </div>
                )}
              </div>
              <button
                className={`badge ${ATIVIDADE_STATUS_BADGE[a.status] || "badge-warn"}`}
                onClick={() => toggleStatus(a)}
                title={a.status === "realizada" ? "Clique para voltar para Agendada" : "Clique para marcar como Realizada e liberar materiais"}
                style={{ fontSize:"0.68rem", border:"none", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4, flexShrink:0 }}
              >
                <FontAwesomeIcon icon={a.status === "realizada" ? faCircleCheck : faClock} />
                {ATIVIDADE_STATUS_LABEL[a.status] || "Agendada"}
              </button>
            </div>
            <div className="credenc-card-meta">
              <span>{formatData(a.dia)}</span>
              <span>{a.horario}{a.horario_fim ? `–${a.horario_fim}` : ""}</span>
              <span>{a.carga_horaria}h</span>
              {(a.materiais || []).length > 0 && (
                <a href={a.materiais[0].url} target="_blank" rel="noreferrer" title={`Baixar: ${a.materiais.map(m => m.nome).join(", ")}`} style={{ color:"var(--teal)" }}>
                  <FontAwesomeIcon icon={faFilePdf} /> Anexo
                </a>
              )}
            </div>
            <div className="credenc-card-actions">
              {a.conta_certificado && event.modo_frequencia !== "turno" && <button className="btn btn-sm btn-outline" onClick={() => setModalQR(a)}><FontAwesomeIcon icon={faQrcode} /></button>}
              <button className="btn btn-sm btn-outline" onClick={() => abrirEdicao(a)}><FontAwesomeIcon icon={faPenToSquare} /></button>
              <button className="btn btn-sm btn-danger" onClick={() => excluirAtividade(a.id)}><FontAwesomeIcon icon={faTrash} /></button>
            </div>
          </div>
        ))}
        {filtradas.length === 0 && (
          <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text3)" }}>Nenhuma atividade encontrada.</div>
        )}
      </div>

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
                    {p.nome}
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
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={formAtv.status || "agendada"} onChange={e => setFormAtv(f => ({ ...f, status: e.target.value }))}>
              <option value="agendada">Agendada</option>
              <option value="realizada">Realizada</option>
            </select>
            {formAtv.status === "realizada" && (
              <span style={{ fontSize:"0.72rem", color:"var(--success)", fontWeight:600 }}>
                <FontAwesomeIcon icon={faCircleCheck} style={{ marginRight:4 }} />Materiais liberados para download na área do participante
              </span>
            )}
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
