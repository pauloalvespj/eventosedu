import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faToggleOn, faToggleOff, faUpload, faEye, faFileArrowUp, faCertificate, faScroll } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { calcPresenca, formatData, baixarCSV } from "../../../utils/helpers";
import { atualizarEvento, uploadCertificado, registrarLog } from "../../../lib/db";

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

export function Certificados() {
  const { event, setEvent, atividades, participantes, setParticipantes, presencas, turnos, presencasTurno, showToast } = useAdmin();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(null); // id do participante em upload
  const [busca, setBusca] = useState("");
  const [filtroOrgao, setFiltroOrgao] = useState("");
  const [filtroFreq, setFiltroFreq] = useState(""); // id do turno ou da atividade selecionada
  const fileRefs = useRef({});
  const porTurno = event.modo_frequencia === "turno";

  async function toggleCertificado() {
    const novo = !event.certificado_disponivel;
    setEvent(prev => ({ ...prev, certificado_disponivel: novo }));
    const { error } = await atualizarEvento(event.id, { certificado_disponivel: novo });
    if (error) {
      setEvent(prev => ({ ...prev, certificado_disponivel: !novo }));
      showToast("Erro ao salvar.", "error");
    } else {
      registrarLog(novo ? "certificado.liberar" : "certificado.ocultar", "evento", event.id, event.nome);
      showToast(novo ? "Certificados liberados para os participantes." : "Certificados ocultados.", "success");
    }
  }

  async function toggleCertificadoExterno() {
    const novo = !event.certificado_externo;
    setEvent(prev => ({ ...prev, certificado_externo: novo }));
    const { error } = await atualizarEvento(event.id, { certificado_externo: novo });
    if (error) {
      setEvent(prev => ({ ...prev, certificado_externo: !novo }));
      showToast("Erro ao salvar.", "error");
    } else {
      registrarLog(novo ? "certificado.modo_externo_on" : "certificado.modo_externo_off", "evento", event.id, event.nome);
      showToast(novo ? "Modo certificado externo ativado." : "Modo certificado do sistema ativado.", "success");
    }
  }

  async function handleUpload(participante, file) {
    if (!file) return;
    setUploading(participante.id);
    try {
      const url = await uploadCertificado(participante.id, file);
      setParticipantes(participantes.map(p => p.id === participante.id ? { ...p, certificado_url: url } : p));
      showToast(`Certificado de ${participante.nome.split(" ")[0]} enviado!`, "success");
    } catch (e) {
      showToast("Erro ao enviar certificado: " + e.message, "error");
    } finally {
      setUploading(null);
    }
  }

  const cargaHorariaTotal = porTurno
    ? turnos.filter(t => t.conta_certificado).reduce((s, t) => s + Number(t.carga_horaria || 0), 0)
    : atividades.filter(a => a.conta_certificado).reduce((s, a) => s + a.carga_horaria, 0);
  const aptos = participantes.filter(p => calcPresenca(p.id, atividades, presencas, event, turnos, presencasTurno).apto);
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

  function exportarLista() {
    const header = "Nome,CPF,Instituição,Cargo,CH Cumprida,Percentual,Status\n";
    const rows = participantes.map(p => {
      const r = calcPresenca(p.id, atividades, presencas, event, turnos, presencasTurno);
      return `"${p.nome}","${p.cpf}","${p.instituicao}","${p.cargo}",${r.chCumprida}h,${r.pct}%,${r.apto ? "APTO" : "NÃO APTO"}`;
    }).join("\n");
    baixarCSV("lista_certificados.csv", header + rows);
    showToast("Lista exportada!", "success");
  }

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h1>Certificados</h1>
          <p style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Gestão e emissão
            <span className="badge badge-navy" style={{ fontSize: "0.68rem" }}>
              Frequência: {porTurno ? "Por Turno" : "Por Palestra"}
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-outline" onClick={() => navigate("/painel/modelo-cert")}
            style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FontAwesomeIcon icon={faScroll} />
            Configurar modelo
          </button>
          <button
            className={`btn ${event.certificado_disponivel ? "btn-success" : "btn-outline"}`}
            onClick={toggleCertificado}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <FontAwesomeIcon icon={event.certificado_disponivel ? faToggleOn : faToggleOff} style={{ fontSize: "1.1rem" }} />
            {event.certificado_disponivel ? "Certificados liberados" : "Liberar certificados"}
          </button>
          <button className="btn btn-gold" onClick={exportarLista}>
            <FontAwesomeIcon icon={faDownload} style={{ marginRight: 6 }} />Exportar CSV
          </button>
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

      {/* Modo do certificado */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <button
          onClick={() => event.certificado_externo && toggleCertificadoExterno()}
          style={{
            flex: 1, padding: "0.85rem 1.25rem", borderRadius: "var(--radius-sm)", cursor: "pointer",
            border: `2px solid ${!event.certificado_externo ? "var(--navy)" : "var(--border)"}`,
            background: !event.certificado_externo ? "var(--navy)" : "var(--surface2)",
            color: !event.certificado_externo ? "#fff" : "var(--text2)",
            display: "flex", alignItems: "center", gap: "0.75rem", transition: "all 0.15s",
          }}
        >
          <FontAwesomeIcon icon={faCertificate} style={{ fontSize: "1.2rem", opacity: 0.85 }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Certificado do Sistema</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.75, marginTop: 2 }}>Gerado automaticamente pela plataforma</div>
          </div>
          {!event.certificado_externo && <FontAwesomeIcon icon={faToggleOn} style={{ marginLeft: "auto", fontSize: "1.3rem" }} />}
        </button>
        <button
          onClick={() => !event.certificado_externo && toggleCertificadoExterno()}
          style={{
            flex: 1, padding: "0.85rem 1.25rem", borderRadius: "var(--radius-sm)", cursor: "pointer",
            border: `2px solid ${event.certificado_externo ? "var(--gold-on-dark)" : "var(--border)"}`,
            background: event.certificado_externo ? "var(--gold-tint)" : "var(--surface2)",
            color: event.certificado_externo ? "var(--navy)" : "var(--text2)",
            display: "flex", alignItems: "center", gap: "0.75rem", transition: "all 0.15s",
          }}
        >
          <FontAwesomeIcon icon={faFileArrowUp} style={{ fontSize: "1.2rem", opacity: 0.85 }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>Certificado Externo</div>
            <div style={{ fontSize: "0.75rem", opacity: 0.75, marginTop: 2 }}>Upload manual por participante (PDF ou imagem)</div>
          </div>
          {event.certificado_externo && <FontAwesomeIcon icon={faToggleOn} style={{ marginLeft: "auto", fontSize: "1.3rem" }} />}
        </button>
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
        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Credenciados</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--gold-on-dark)" }}>{credenciados.length}/{participantes.length}</div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <span className="table-title">Lista de Participantes</span>
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
              <th>Frequência</th><th>Status</th>
              {event.certificado_externo && <th style={{ width: 110 }}>Certificado</th>}
            </tr>
          </thead>
          <tbody>
            {participantesFiltrados.length === 0 && (
              <tr><td colSpan={event.certificado_externo ? 7 : 6} style={{ textAlign: "center", color: "var(--text3)", padding: "2rem" }}>Nenhum participante encontrado para os filtros atuais.</td></tr>
            )}
            {participantesFiltrados.map(p => {
              const r = calcPresenca(p.id, atividades, presencas, event, turnos, presencasTurno);
              const isUploading = uploading === p.id;
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.nome}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{p.cpf}</td>
                  <td>{p.instituicao}</td>
                  <td>{p.cargo}</td>
                  <td>
                    {p.credenciado
                      ? <MiniBarra pct={r.pct} minimo={event.percentual_minimo} />
                      : <span style={{ fontSize: "0.78rem", color: "var(--text3)" }}>Não credenciado</span>}
                  </td>
                  <td><span className={`badge badge-${r.apto ? "success" : "danger"}`}>{r.apto ? "APTO" : "NÃO APTO"}</span></td>
                  {event.certificado_externo && <td>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      style={{ display: "none" }}
                      ref={el => fileRefs.current[p.id] = el}
                      onChange={e => { if (e.target.files[0]) handleUpload(p, e.target.files[0]); e.target.value = ""; }}
                    />
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        className="btn btn-sm btn-outline"
                        title={p.certificado_url ? "Substituir certificado" : "Enviar certificado"}
                        disabled={isUploading}
                        onClick={() => fileRefs.current[p.id]?.click()}
                        style={p.certificado_url ? { borderColor: "var(--success)", color: "var(--success)" } : {}}
                      >
                        {isUploading
                          ? <span style={{ fontSize: "0.72rem" }}>...</span>
                          : <FontAwesomeIcon icon={faUpload} />
                        }
                      </button>
                      {p.certificado_url && (
                        <a
                          href={p.certificado_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline"
                          title="Ver certificado enviado"
                          style={{ borderColor: "var(--teal)", color: "var(--teal)" }}
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </a>
                      )}
                    </div>
                  </td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
