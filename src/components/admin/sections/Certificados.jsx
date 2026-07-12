import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faToggleOn, faToggleOff, faUpload, faEye, faFileArrowUp, faCertificate, faScroll } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { calcPresenca } from "../../../utils/helpers";
import { atualizarEvento, uploadCertificado } from "../../../lib/db";

export function Certificados() {
  const { event, setEvent, atividades, participantes, setParticipantes, presencas, showToast } = useAdmin();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(null); // id do participante em upload
  const [busca, setBusca] = useState("");
  const fileRefs = useRef({});

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

  async function toggleCertificadoExterno() {
    const novo = !event.certificado_externo;
    setEvent(prev => ({ ...prev, certificado_externo: novo }));
    const { error } = await atualizarEvento(event.id, { certificado_externo: novo });
    if (error) {
      setEvent(prev => ({ ...prev, certificado_externo: !novo }));
      showToast("Erro ao salvar.", "error");
    } else {
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

  const cargaHorariaTotal = atividades.filter(a => a.conta_certificado).reduce((s, a) => s + a.carga_horaria, 0);
  const aptos = participantes.filter(p => calcPresenca(p.id, atividades, presencas, event).apto);

  const participantesFiltrados = busca.trim()
    ? participantes.filter(p => {
        const termo = busca.trim().toLowerCase();
        const cpfLimpo = (p.cpf || "").replace(/\D/g, "");
        const buscaCpf = busca.trim().replace(/\D/g, "");
        return p.nome.toLowerCase().includes(termo) || (buscaCpf && cpfLimpo.includes(buscaCpf));
      })
    : participantes;

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
      </div>

      <div className="table-wrap">
        <div className="table-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <span className="table-title">Lista de Participantes</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              className="form-input"
              type="text"
              placeholder="Buscar por nome ou CPF…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ width: 220, marginBottom: 0 }}
            />
            {busca && (
              <button className="btn btn-sm btn-outline" onClick={() => setBusca("")} style={{ padding: "0.35rem 0.6rem" }}>✕</button>
            )}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nome</th><th>CPF</th><th>Instituição</th><th>Cargo</th>
              <th>CH Cumprida</th><th>Status</th>
              {event.certificado_externo && <th style={{ width: 110 }}>Certificado</th>}
            </tr>
          </thead>
          <tbody>
            {participantesFiltrados.length === 0 && (
              <tr><td colSpan={event.certificado_externo ? 7 : 6} style={{ textAlign: "center", color: "var(--text3)", padding: "2rem" }}>Nenhum participante encontrado para "{busca}".</td></tr>
            )}
            {participantesFiltrados.map(p => {
              const r = calcPresenca(p.id, atividades, presencas, event);
              const isUploading = uploading === p.id;
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.nome}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{p.cpf}</td>
                  <td>{p.instituicao}</td>
                  <td>{p.cargo}</td>
                  <td>{r.chCumprida}h / {r.chTotal}h</td>
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
