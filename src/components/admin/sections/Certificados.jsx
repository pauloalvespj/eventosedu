import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDownload, faToggleOn, faToggleOff, faUpload, faEye, faFileArrowUp, faCertificate, faScroll,
  faFileImport, faXmark, faCircleCheck, faCircleExclamation, faCloudArrowUp, faLink, faFloppyDisk,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal } from "../../base/index";
import { supabase } from "../../../lib/supabase";
import { calcPresenca, formatData, erroFuncaoEdge } from "../../../utils/helpers";
import { atualizarEvento, uploadCertificado, registrarLog } from "../../../lib/db";
import { gerarTemplateHTMLCertificado, DEFAULT_MENSAGEM_CERTIFICADO } from "../../../lib/emailTemplate";

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

// ── Casamento automático de arquivo → participante (upload em massa) ──
// Tenta primeiro pelo CPF (só dígitos) e depois pelo nome, ambos extraídos
// do nome do arquivo — não depende de um padrão fixo de nomenclatura.
function normalizarNome(s) {
  return (s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .replace(/\.[^.]+$/, "") // remove extensão, se for um nome de arquivo
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function encontrarParticipantePorArquivo(filename, participantes) {
  const base = filename.replace(/\.[^.]+$/, "");
  const digitos = base.replace(/\D/g, "");

  if (digitos.length >= 11) {
    const porCpf = participantes.find(p => {
      const cpfLimpo = (p.cpf || "").replace(/\D/g, "");
      return cpfLimpo && (cpfLimpo === digitos || digitos.includes(cpfLimpo));
    });
    if (porCpf) return porCpf;
  }

  const nomeArquivo = normalizarNome(base);
  if (!nomeArquivo) return null;

  const exatos = participantes.filter(p => normalizarNome(p.nome) === nomeArquivo);
  if (exatos.length === 1) return exatos[0];

  const parciais = participantes.filter(p => {
    const nomeParticipante = normalizarNome(p.nome);
    return nomeParticipante && (nomeArquivo.includes(nomeParticipante) || nomeParticipante.includes(nomeArquivo));
  });
  return parciais.length === 1 ? parciais[0] : null;
}

function CorField({ label, value, onChange }) {
  const cor = value || "#0a1f40";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input type="color" value={cor} onChange={e => onChange(e.target.value)}
        style={{ width: 32, height: 32, padding: 0, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer" }} />
      <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{label}</span>
    </div>
  );
}

const TEMPLATE_DEFAULTS_CERT = {
  assunto: "", mensagem: DEFAULT_MENSAGEM_CERTIFICADO, bannerUrl: "",
  corCabecalho: "#0a1f40", corRodape: "#0a1f40", corBotao: "#0a1f40", ctaTexto: "Ver certificado →",
};

// Aba "Enviar e-mail" — avisa por e-mail quem já está apto que o certificado
// está disponível. Um e-mail por invocação da edge function (ver comentário
// em enviar(), mesmo limite de recursos documentado nas outras telas de
// envio em massa do projeto).
function AbaEnviarCertificado({ event, participantes, atividades, presencas, turnos, presencasTurno, showToast }) {
  const [template, setTemplate] = useState({ ...TEMPLATE_DEFAULTS_CERT, ...(event.certificado_email_template || {}) });
  const [busca, setBusca] = useState("");
  const [filtroOrgao, setFiltroOrgao] = useState("");
  const [somenteAptos, setSomenteAptos] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [emailTeste, setEmailTeste] = useState("pauloalvespj@ufc.br");
  const [enviandoTeste, setEnviandoTeste] = useState(false);

  function set(k, v) { setTemplate(t => ({ ...t, [k]: v })); }

  function pctPresenca(p) {
    return calcPresenca(p.id, atividades, presencas, event, turnos, presencasTurno).pct;
  }
  function estaApto(p) {
    return calcPresenca(p.id, atividades, presencas, event, turnos, presencasTurno).apto;
  }

  const aptos = participantes.filter(p => p.ativo !== false && estaApto(p));
  const [selecionados, setSelecionados] = useState(() => new Set(aptos.map(p => p.id)));

  const orgaos = [...new Set(participantes.map(p => p.instituicao).filter(Boolean))].sort();

  const filtrados = participantes.filter(p => {
    if (p.ativo === false) return false;
    if (busca.trim() && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroOrgao && p.instituicao !== filtroOrgao) return false;
    if (somenteAptos && !estaApto(p)) return false;
    return true;
  });

  function toggleSel(id) {
    setSelecionados(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function selecionarTodos() { setSelecionados(new Set(filtrados.map(p => p.id))); }
  function limparSelecao() { setSelecionados(new Set()); }

  async function salvarTemplate() {
    setSalvando(true);
    await atualizarEvento(event.id, { certificado_email_template: template });
    setSalvando(false);
    showToast("Modelo salvo!", "success");
  }

  const certificadoUrl = event.certificado_modo === "link" && event.certificado_link_url
    ? event.certificado_link_url
    : `${window.location.origin}/painel/certificado`;

  async function enviarUmLote(lote) {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("enviar-certificado", {
      body: { destinatarios: lote, event, certificadoUrl, ...template },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (error) throw new Error(await erroFuncaoEdge(error));
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function enviarTeste() {
    const email = emailTeste.trim();
    if (!email) { showToast("Informe um e-mail para o teste.", "error"); return; }
    setEnviandoTeste(true);
    try {
      const data = await enviarUmLote([{ id: "teste", email }]);
      if (data?.failed?.length) {
        showToast("Falha ao enviar teste: " + (data.failed[0]?.error || "erro desconhecido"), "error");
      } else {
        showToast(`E-mail de teste enviado para ${email}!`, "success");
      }
    } catch (err) {
      showToast("Não foi possível enviar via SMTP (" + (err.message || err) + ").", "error");
    } finally {
      setEnviandoTeste(false);
    }
  }

  async function enviar() {
    const ids = [...selecionados];
    if (!ids.length) { showToast("Selecione ao menos um participante.", "warn"); return; }
    const semEmail = participantes.filter(p => ids.includes(p.id) && !p.email);
    if (semEmail.length) { showToast(`${semEmail.length} selecionado(s) sem e-mail cadastrado — desmarque-os antes de enviar.`, "warn"); return; }
    setEnviando(true);
    try {
      const destinatarios = participantes.filter(p => ids.includes(p.id)).map(p => ({ id: p.id, email: p.email }));

      // Um e-mail por invocação, com pausa entre elas — mesmo lotes de 5
      // estouram o limite de recursos da Edge Function (HTTP 546,
      // "WORKER_LIMIT").
      const TAMANHO_LOTE = 1;
      const enviados = [];
      const falhas = [];
      for (let i = 0; i < destinatarios.length; i += TAMANHO_LOTE) {
        const lote = destinatarios.slice(i, i + TAMANHO_LOTE);
        try {
          const data = await enviarUmLote(lote);
          enviados.push(...(data?.sent || []));
          falhas.push(...(data?.failed || []));
        } catch (err) {
          lote.forEach(d => falhas.push({ id: d.id, email: d.email, error: err.message || String(err) }));
        }
        if (i + TAMANHO_LOTE < destinatarios.length) await new Promise(r => setTimeout(r, 500));
      }

      registrarLog("certificado.email_enviado", "evento", event.id, event.nome, { enviados: enviados.length, falhas: falhas.length });
      if (falhas.length) {
        showToast(`${enviados.length} enviado(s), ${falhas.length} falharam. Veja o console.`, "warn");
        console.warn("Falhas ao enviar aviso de certificado:", falhas);
      } else {
        showToast(`E-mail enviado para ${enviados.length} participante${enviados.length !== 1 ? "s" : ""}!`, "success");
      }
    } catch (err) {
      showToast("Não foi possível enviar via SMTP (" + (err.message || err) + ").", "error");
    } finally {
      setEnviando(false);
    }
  }

  function htmlPreview() {
    return gerarTemplateHTMLCertificado({
      event: event || {}, bannerUrl: template.bannerUrl, certificadoUrl,
      assunto: template.assunto, mensagem: template.mensagem, ctaTexto: template.ctaTexto,
      corCabecalho: template.corCabecalho, corRodape: template.corRodape, corBotao: template.corBotao,
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
      <div>
        <div style={{
          fontSize: "0.82rem", color: "var(--text2)", background: "var(--surface2)",
          border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.6rem 0.85rem", marginBottom: "1.25rem",
        }}>
          O botão do e-mail leva para {event.certificado_modo === "link" ? "o link externo configurado acima" : "a área de certificados do participante"}.
        </div>
        <div className="form-group">
          <label className="form-label">Assunto</label>
          <input className="form-input" placeholder={`Certificado disponível — ${event?.nome || "Evento"}`}
            value={template.assunto} onChange={e => set("assunto", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Mensagem</label>
          <textarea className="form-input" rows={4} value={template.mensagem} onChange={e => set("mensagem", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Texto do botão</label>
          <input className="form-input" value={template.ctaTexto} onChange={e => set("ctaTexto", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">URL do Banner (opcional)</label>
          <input className="form-input" type="url" value={template.bannerUrl} onChange={e => set("bannerUrl", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Cores</label>
          <div style={{ display: "flex", gap: "1rem" }}>
            <CorField label="Cabeçalho" value={template.corCabecalho} onChange={v => set("corCabecalho", v)} />
            <CorField label="Botão" value={template.corBotao} onChange={v => set("corBotao", v)} />
            <CorField label="Rodapé" value={template.corRodape} onChange={v => set("corRodape", v)} />
          </div>
        </div>
        <button className="btn btn-sm btn-outline" onClick={salvarTemplate} disabled={salvando} style={{ marginBottom: "1.5rem" }}>
          {salvando ? "Salvando…" : "Salvar modelo"}
        </button>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <input className="form-input" placeholder="seu@email.com" value={emailTeste}
            onChange={e => setEmailTeste(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-outline" onClick={enviarTeste} disabled={enviandoTeste || !emailTeste.trim()}>
            {enviandoTeste ? "Enviando…" : "Enviar teste"}
          </button>
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--text3)", margin: "0 0 1.25rem" }}>
          Envia só para esse e-mail, sem afetar a seleção de destinatários abaixo. Use pra conferir o modelo antes de disparar pra todo mundo.
        </p>

        <div className="table-wrap">
          <div className="table-header" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
            <span className="table-title">Destinatários ({selecionados.size} selecionado{selecionados.size !== 1 ? "s" : ""})</span>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <select className="form-input" style={{ width: 160, marginBottom: 0 }} value={filtroOrgao} onChange={e => setFiltroOrgao(e.target.value)}>
                <option value="">Todos os órgãos</option>
                {orgaos.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <input className="search-input" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.5rem 1rem", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
            <button className="btn btn-sm btn-outline" onClick={selecionarTodos}>Selecionar todos</button>
            <button className="btn btn-sm btn-outline" onClick={limparSelecao}>Limpar</button>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "var(--text2)", cursor: "pointer" }}>
              <input type="checkbox" checked={somenteAptos} onChange={e => setSomenteAptos(e.target.checked)} />
              Só aptos ({aptos.length})
            </label>
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {filtrados.map(p => (
              <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.5rem 1rem", fontSize: "0.85rem", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
                <input type="checkbox" checked={selecionados.has(p.id)} onChange={() => toggleSel(p.id)} />
                <span style={{ flex: 1 }}>{p.nome}</span>
                <span className={`badge badge-${estaApto(p) ? "success" : "warn"}`} style={{ fontSize: "0.68rem" }}>{pctPresenca(p)}%</span>
                <span style={{ color: p.email ? "var(--text3)" : "var(--danger)", fontSize: "0.78rem" }}>{p.email || "sem e-mail"}</span>
              </label>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-block" style={{ marginTop: "1rem" }} onClick={enviar} disabled={enviando}>
          <FontAwesomeIcon icon={faPaperPlane} style={{ marginRight: 6 }} />
          {enviando ? "Enviando…" : `Enviar para ${selecionados.size} participante${selecionados.size !== 1 ? "s" : ""}`}
        </button>
      </div>

      <div>
        <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
          <div style={{ background: "var(--surface2)", padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Preview do E-mail
          </div>
          <iframe title="preview-certificado" srcDoc={htmlPreview()} style={{ width: "100%", height: 600, border: 0, display: "block" }} sandbox="allow-same-origin" />
        </div>
      </div>
    </div>
  );
}

export function Certificados() {
  const { event, setEvent, atividades, participantes, setParticipantes, presencas, turnos, presencasTurno, showToast } = useAdmin();
  const navigate = useNavigate();
  const [aba, setAba] = useState("gestao");
  const [uploading, setUploading] = useState(null); // id do participante em upload
  const [linkUrl, setLinkUrl] = useState(event.certificado_link_url || "");
  const [linkMensagem, setLinkMensagem] = useState(event.certificado_link_mensagem || "");
  const [salvandoLink, setSalvandoLink] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroOrgao, setFiltroOrgao] = useState("");
  const [filtroFreq, setFiltroFreq] = useState(""); // id do turno ou da atividade selecionada
  const [filtroStatus, setFiltroStatus] = useState(""); // "" = todos, "apto", "nao_apto"
  const fileRefs = useRef({});
  const porTurno = event.modo_frequencia === "turno";

  // ── Upload em massa ──────────────────────────────────────────
  const [modalBulk, setModalBulk] = useState(false);
  const [bulkItems, setBulkItems] = useState([]); // [{key, file, participanteId, status, erro}]
  const [bulkEnviando, setBulkEnviando] = useState(false);
  const bulkFileRef = useRef(null);
  const [modalExportCsv, setModalExportCsv] = useState(false);

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

  async function toggleExigePesquisa() {
    const novo = !event.certificado_exige_pesquisa;
    setEvent(prev => ({ ...prev, certificado_exige_pesquisa: novo }));
    const { error } = await atualizarEvento(event.id, { certificado_exige_pesquisa: novo });
    if (error) {
      setEvent(prev => ({ ...prev, certificado_exige_pesquisa: !novo }));
      showToast("Erro ao salvar.", "error");
    } else {
      registrarLog(novo ? "certificado.exigir_pesquisa_on" : "certificado.exigir_pesquisa_off", "evento", event.id, event.nome);
      showToast(novo ? "Certificado agora exige resposta da pesquisa." : "Certificado não exige mais a pesquisa.", "success");
    }
  }

  const MODOS = {
    sistema: "Certificado do Sistema",
    upload: "Certificado Externo (upload)",
    link: "Link Externo",
  };

  async function setModoCertificado(modo) {
    if (modo === event.certificado_modo) return;
    const anterior = event.certificado_modo;
    setEvent(prev => ({ ...prev, certificado_modo: modo }));
    const { error } = await atualizarEvento(event.id, { certificado_modo: modo });
    if (error) {
      setEvent(prev => ({ ...prev, certificado_modo: anterior }));
      showToast("Erro ao salvar.", "error");
    } else {
      registrarLog("certificado.modo_alterado", "evento", event.id, event.nome, { de: anterior, para: modo });
      showToast(`Modo "${MODOS[modo]}" ativado.`, "success");
    }
  }

  async function salvarLinkExterno() {
    setSalvandoLink(true);
    const updates = { certificado_link_url: linkUrl.trim(), certificado_link_mensagem: linkMensagem };
    const { error } = await atualizarEvento(event.id, updates);
    setSalvandoLink(false);
    if (error) {
      showToast("Erro ao salvar.", "error");
    } else {
      setEvent(prev => ({ ...prev, ...updates }));
      registrarLog("certificado.link_externo_atualizado", "evento", event.id, event.nome);
      showToast("Mensagem e link salvos!", "success");
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

  function adicionarArquivosBulk(fileList) {
    const novos = Array.from(fileList).map(file => {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      const match = encontrarParticipantePorArquivo(file.name, participantes);
      return { key, file, participanteId: match?.id ?? "", status: "pendente", erro: null };
    });
    setBulkItems(prev => {
      const existentes = new Set(prev.map(i => i.key));
      return [...prev, ...novos.filter(i => !existentes.has(i.key))];
    });
  }

  function removerItemBulk(key) {
    setBulkItems(prev => prev.filter(i => i.key !== key));
  }

  function alterarParticipanteBulk(key, participanteId) {
    setBulkItems(prev => prev.map(i => i.key === key ? { ...i, participanteId } : i));
  }

  function fecharModalBulk() {
    if (bulkEnviando) return;
    setModalBulk(false);
    setBulkItems([]);
  }

  async function enviarBulk() {
    const pendentes = bulkItems.filter(i => i.participanteId && i.status !== "ok");
    if (pendentes.length === 0) return;
    setBulkEnviando(true);
    const atualizacoes = {}; // participanteId → certificado_url
    let enviados = 0, falhas = 0;
    for (const item of pendentes) {
      setBulkItems(prev => prev.map(i => i.key === item.key ? { ...i, status: "enviando", erro: null } : i));
      try {
        const url = await uploadCertificado(item.participanteId, item.file);
        atualizacoes[item.participanteId] = url;
        enviados++;
        setBulkItems(prev => prev.map(i => i.key === item.key ? { ...i, status: "ok" } : i));
      } catch (e) {
        falhas++;
        setBulkItems(prev => prev.map(i => i.key === item.key ? { ...i, status: "erro", erro: e.message } : i));
      }
    }
    if (Object.keys(atualizacoes).length > 0) {
      setParticipantes(prev => prev.map(p => atualizacoes[p.id] ? { ...p, certificado_url: atualizacoes[p.id] } : p));
      registrarLog("certificado.upload_massa", "evento", event.id, event.nome, { enviados, falhas });
    }
    setBulkEnviando(false);
    if (falhas === 0) {
      showToast(`${enviados} certificado${enviados === 1 ? "" : "s"} enviado${enviados === 1 ? "" : "s"}!`, "success");
    } else {
      showToast(`${enviados} enviado${enviados === 1 ? "" : "s"}, ${falhas} falharam — confira abaixo.`, falhas === pendentes.length ? "error" : "info");
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

  const aptosIds = new Set(aptos.map(p => p.id));

  const participantesFiltrados = participantes.filter(p => {
    if (busca.trim()) {
      const termo = busca.trim().toLowerCase();
      const cpfLimpo = (p.cpf || "").replace(/\D/g, "");
      const buscaCpf = busca.trim().replace(/\D/g, "");
      if (!p.nome.toLowerCase().includes(termo) && !(buscaCpf && cpfLimpo.includes(buscaCpf))) return false;
    }
    if (filtroOrgao && p.instituicao !== filtroOrgao) return false;
    if (filtroStatus === "apto" && !aptosIds.has(p.id)) return false;
    if (filtroStatus === "nao_apto" && aptosIds.has(p.id)) return false;
    if (filtroFreq) {
      const bateu = porTurno
        ? presencasTurno.some(pt => pt.turno_id === Number(filtroFreq) && pt.participante_id === p.id)
        : presencas.some(pr => pr.atividade_id === Number(filtroFreq) && pr.participante_id === p.id);
      if (!bateu) return false;
    }
    return true;
  });

  // Planilha .xlsx de verdade (não CSV) — o CPF é escrito como string JS,
  // então a célula nasce com tipo texto no arquivo. Isso preserva o zero à
  // esquerda de forma confiável em qualquer programa (Excel, Sheets,
  // LibreOffice), sem depender do truque de fórmula ="..." do CSV, que
  // alguns desses programas mostram como texto literal em vez de avaliar.
  async function exportarLista(cpfComCaracteres) {
    if (aptos.length === 0) { showToast("Nenhum participante apto para exportar.", "error"); return; }
    const XLSX = await import("xlsx");
    const rows = aptos.map(p => {
      const digitos = (p.cpf || "").replace(/\D/g, "").padStart(11, "0");
      const cpf = cpfComCaracteres
        ? `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`
        : digitos;
      return { "Nome Completo": p.nome, "Email": p.email || "", "CPF": cpf };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aptos");
    XLSX.writeFile(wb, "lista_certificados.xlsx");
    showToast(`${aptos.length} apto${aptos.length === 1 ? "" : "s"} exportado${aptos.length === 1 ? "" : "s"}!`, "success");
    setModalExportCsv(false);
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
          {event.certificado_modo === "upload" && (
            <button className="btn btn-outline" onClick={() => setModalBulk(true)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FontAwesomeIcon icon={faFileImport} />
              Upload em massa
            </button>
          )}
          <button className="btn btn-gold" onClick={() => setModalExportCsv(true)}>
            <FontAwesomeIcon icon={faDownload} style={{ marginRight: 6 }} />Exportar planilha
          </button>
        </div>
      </div>

      <div className="admin-subtabs" style={{ marginBottom: "1.5rem" }}>
        {[["gestao", "Gestão", faCertificate], ["email", "Enviar e-mail", faPaperPlane]].map(([key, label, icon]) => (
          <button key={key} onClick={() => setAba(key)}
            style={{
              padding: "0.6rem 1.25rem", fontSize: "0.88rem", fontWeight: aba === key ? 700 : 500,
              color: aba === key ? "var(--navy)" : "var(--text2)", background: "none", border: "none",
              borderBottom: aba === key ? "2.5px solid var(--navy)" : "2.5px solid transparent",
              marginBottom: -2, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem",
            }}>
            <FontAwesomeIcon icon={icon} style={{ fontSize: "0.8rem" }} />{label}
          </button>
        ))}
      </div>

      {aba === "email" && (
        <AbaEnviarCertificado
          event={event} participantes={participantes} atividades={atividades}
          presencas={presencas} turnos={turnos} presencasTurno={presencasTurno} showToast={showToast}
        />
      )}

      {aba === "gestao" && <>
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

      <label style={{
        display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", userSelect: "none",
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
        padding: "0.75rem 1.1rem", marginBottom: "1.25rem", fontSize: "0.88rem",
      }}>
        <input
          type="checkbox"
          checked={!!event.certificado_exige_pesquisa}
          onChange={toggleExigePesquisa}
          style={{ width: 16, height: 16, accentColor: "var(--navy)", flexShrink: 0 }}
        />
        <span style={{ fontWeight: 600, color: "var(--text)" }}>Exigir resposta da pesquisa de satisfação para liberar o certificado</span>
        {!event.pesquisa_ativa && (
          <span style={{ fontSize: "0.76rem", color: "var(--text3)" }}>(a pesquisa de satisfação não está ativa — não tem efeito ainda)</span>
        )}
      </label>

      {/* Modo do certificado */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {[
          { modo: "sistema", icon: faCertificate, titulo: "Certificado do Sistema", desc: "Gerado automaticamente pela plataforma" },
          { modo: "upload", icon: faFileArrowUp, titulo: "Certificado Externo (upload)", desc: "Upload manual por participante (PDF ou imagem)" },
          { modo: "link", icon: faLink, titulo: "Link Externo", desc: "Mensagem + link para um sistema externo (ex.: PREX/UFC)" },
        ].map(({ modo, icon, titulo, desc }) => {
          const ativo = event.certificado_modo === modo;
          return (
            <button
              key={modo}
              onClick={() => setModoCertificado(modo)}
              style={{
                flex: "1 1 220px", padding: "0.85rem 1.25rem", borderRadius: "var(--radius-sm)", cursor: "pointer",
                border: `2px solid ${ativo ? "var(--navy)" : "var(--border)"}`,
                background: ativo ? "var(--navy)" : "var(--surface2)",
                color: ativo ? "#fff" : "var(--text2)",
                display: "flex", alignItems: "center", gap: "0.75rem", transition: "all 0.15s",
              }}
            >
              <FontAwesomeIcon icon={icon} style={{ fontSize: "1.2rem", opacity: 0.85 }} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{titulo}</div>
                <div style={{ fontSize: "0.75rem", opacity: 0.75, marginTop: 2 }}>{desc}</div>
              </div>
              {ativo && <FontAwesomeIcon icon={faToggleOn} style={{ marginLeft: "auto", fontSize: "1.3rem" }} />}
            </button>
          );
        })}
      </div>

      {event.certificado_modo === "link" && (
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid var(--border)" }}>
          <h3 style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
            <FontAwesomeIcon icon={faLink} />
            Mensagem e link exibidos aos participantes
          </h3>
          <label className="form-label">Mensagem</label>
          <textarea
            className="form-input"
            rows={6}
            placeholder="Ex.: Comunicamos que o seu certificado de participação já se encontra disponível..."
            value={linkMensagem}
            onChange={e => setLinkMensagem(e.target.value)}
            style={{ resize: "vertical" }}
          />
          <label className="form-label">Link do certificado</label>
          <input
            className="form-input"
            type="url"
            placeholder="https://sistemasprex.ufc.br/certificados/app_Login/"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
          />
          <button className="btn btn-gold" disabled={salvandoLink} onClick={salvarLinkExterno} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FontAwesomeIcon icon={faFloppyDisk} />
            {salvandoLink ? "Salvando…" : "Salvar"}
          </button>
        </div>
      )}

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
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--warn)" }}>{credenciados.length}/{participantes.length}</div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <span className="table-title">Lista de Participantes</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <select className="form-input" style={{ width: 150, marginBottom: 0 }} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="apto">Aptos</option>
              <option value="nao_apto">Não aptos</option>
            </select>
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
            {(busca || filtroOrgao || filtroFreq || filtroStatus) && (
              <button className="btn btn-sm btn-outline" onClick={() => { setBusca(""); setFiltroOrgao(""); setFiltroFreq(""); setFiltroStatus(""); }} style={{ padding: "0.35rem 0.6rem" }}>✕ Limpar</button>
            )}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nome</th><th>CPF</th><th>Instituição</th><th>Cargo</th>
              <th>Frequência</th><th>Status</th>
              {(event.certificado_modo === "upload") && <th style={{ width: 110 }}>Certificado</th>}
            </tr>
          </thead>
          <tbody>
            {participantesFiltrados.length === 0 && (
              <tr><td colSpan={(event.certificado_modo === "upload") ? 7 : 6} style={{ textAlign: "center", color: "var(--text3)", padding: "2rem" }}>Nenhum participante encontrado para os filtros atuais.</td></tr>
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
                  {(event.certificado_modo === "upload") && <td>
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
      </>}

      {/* MODAL: upload em massa de certificados */}
      <Modal show={modalBulk} onClose={fecharModalBulk} title="Upload em massa de certificados" wide>
        <p style={{ fontSize: "0.85rem", color: "var(--text2)", marginBottom: "1rem" }}>
          Selecione todos os arquivos recebidos de uma vez. O sistema tenta identificar o participante
          pelo CPF ou pelo nome no nome do arquivo — confira e corrija na lista abaixo antes de enviar.
        </p>

        <input
          type="file"
          accept=".pdf,image/*"
          multiple
          style={{ display: "none" }}
          ref={bulkFileRef}
          onChange={e => { if (e.target.files.length) adicionarArquivosBulk(e.target.files); e.target.value = ""; }}
        />
        <button className="btn btn-outline btn-block" onClick={() => bulkFileRef.current?.click()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: "1.25rem" }}>
          <FontAwesomeIcon icon={faCloudArrowUp} />
          {bulkItems.length === 0 ? "Selecionar arquivos…" : "Adicionar mais arquivos…"}
        </button>

        {bulkItems.length > 0 && (
          <>
            <div style={{ maxHeight: 360, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", marginBottom: "1rem" }}>
              {bulkItems.map(item => {
                const semCorrespondencia = !item.participanteId;
                const duplicado = item.participanteId && bulkItems.filter(i => i.participanteId === item.participanteId).length > 1;
                const jaTemCertificado = item.participanteId && participantes.find(p => p.id === item.participanteId)?.certificado_url;
                return (
                  <div key={item.key} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "0.6rem 0.85rem",
                    borderBottom: "1px solid var(--border)", background: semCorrespondencia ? "var(--warn-bg)" : "transparent",
                  }}>
                    <div style={{ flex: "0 0 20px" }}>
                      {item.status === "ok" && <FontAwesomeIcon icon={faCircleCheck} style={{ color: "var(--success)" }} />}
                      {item.status === "erro" && <FontAwesomeIcon icon={faCircleExclamation} style={{ color: "var(--danger)" }} title={item.erro} />}
                      {item.status === "enviando" && <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>...</span>}
                    </div>
                    <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.file.name}>{item.file.name}</div>
                      {item.status === "erro" && <div style={{ fontSize: "0.72rem", color: "var(--danger)" }}>{item.erro}</div>}
                      {duplicado && <div style={{ fontSize: "0.72rem", color: "var(--warn)" }}>⚠ outro arquivo também aponta para este participante</div>}
                      {jaTemCertificado && !duplicado && <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>já tem certificado — será substituído</div>}
                    </div>
                    <select
                      className="form-input"
                      style={{ flex: "1 1 240px", marginBottom: 0, fontSize: "0.85rem" }}
                      value={item.participanteId}
                      disabled={item.status === "enviando" || item.status === "ok"}
                      onChange={e => alterarParticipanteBulk(item.key, e.target.value ? Number(e.target.value) : "")}
                    >
                      <option value="">— sem correspondência —</option>
                      {[...participantes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map(p => (
                        <option key={p.id} value={p.id}>{p.nome} — {p.cpf}</option>
                      ))}
                    </select>
                    <button
                      className="btn btn-sm btn-outline"
                      title="Remover da lista"
                      disabled={item.status === "enviando"}
                      onClick={() => removerItemBulk(item.key)}
                      style={{ flex: "0 0 auto" }}
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text3)" }}>
                {bulkItems.filter(i => i.participanteId).length} de {bulkItems.length} identificados
                {bulkItems.some(i => !i.participanteId) && " — selecione manualmente os sem correspondência"}
              </span>
              <button
                className="btn btn-primary"
                disabled={bulkEnviando || bulkItems.filter(i => i.participanteId && i.status !== "ok").length === 0}
                onClick={enviarBulk}
              >
                {bulkEnviando
                  ? "Enviando…"
                  : `Enviar ${bulkItems.filter(i => i.participanteId && i.status !== "ok").length} certificado${bulkItems.filter(i => i.participanteId && i.status !== "ok").length === 1 ? "" : "s"}`}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* MODAL: como exportar o CPF na planilha de aptos */}
      <Modal show={modalExportCsv} onClose={() => setModalExportCsv(false)} title="Exportar aptos">
        <p style={{ fontSize: "0.85rem", color: "var(--text2)", marginBottom: "1.25rem" }}>
          Como o CPF deve sair na planilha?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <button className="btn btn-outline btn-block" onClick={() => exportarLista(true)} style={{ justifyContent: "flex-start", textAlign: "left" }}>
            <div>
              <div style={{ fontWeight: 700 }}>Com pontuação</div>
              <div style={{ fontSize: "0.78rem", opacity: 0.8, fontFamily: "monospace" }}>000.000.000-00</div>
            </div>
          </button>
          <button className="btn btn-outline btn-block" onClick={() => exportarLista(false)} style={{ justifyContent: "flex-start", textAlign: "left" }}>
            <div>
              <div style={{ fontWeight: 700 }}>Sem pontuação</div>
              <div style={{ fontSize: "0.78rem", opacity: 0.8, fontFamily: "monospace" }}>00000000000</div>
            </div>
          </button>
        </div>
      </Modal>
    </div>
  );
}
