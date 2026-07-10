import { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faUpload, faTrash, faEye, faPaperclip, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "../AdminContext";
import { atualizarEvento, uploadConviteAnexo } from "../../../../lib/db";
import { gerarTemplateHTML, DEFAULT_MENSAGEM } from "../../../../lib/emailTemplate";

const TEMPLATE_DEFAULTS = {
  assunto: "",
  mensagem: DEFAULT_MENSAGEM,
  bannerUrl: "",
  inscricaoUrl: typeof window !== "undefined" ? window.location.origin : "",
  anexoUrl: "",
  anexoNome: "",
};

function seedTemplates(event) {
  if (Array.isArray(event.convite_templates) && event.convite_templates.length) {
    return event.convite_templates;
  }
  if (event.convite_config && Object.keys(event.convite_config).length) {
    return [{ id: "default", nome: "Convite", ...TEMPLATE_DEFAULTS, ...event.convite_config }];
  }
  return [{ id: `tpl-${Date.now()}`, nome: "Convite", ...TEMPLATE_DEFAULTS }];
}

export function AbaConfigEmail() {
  const { event, setEvent, showToast } = useAdmin();

  const [templates, setTemplates] = useState(() => seedTemplates(event));
  const [ativoId, setAtivoId]     = useState(() => templates[0]?.id);
  const [salvando, setSalvando]   = useState(false);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const fileRef = useRef();

  const ativo = templates.find(t => t.id === ativoId) || templates[0];

  function set(field, value) {
    setTemplates(prev => prev.map(t => t.id === ativo.id ? { ...t, [field]: value } : t));
  }

  function novoModelo() {
    const novo = { id: `tpl-${Date.now()}`, nome: "Novo Modelo", ...TEMPLATE_DEFAULTS };
    setTemplates(prev => [...prev, novo]);
    setAtivoId(novo.id);
  }

  function removerModelo(id) {
    if (templates.length <= 1) { showToast("Mantenha ao menos um modelo.", "warn"); return; }
    if (!confirm("Remover este modelo de e-mail?")) return;
    const restantes = templates.filter(t => t.id !== id);
    setTemplates(restantes);
    if (ativoId === id) setAtivoId(restantes[0]?.id);
  }

  async function handleAnexo(e) {
    const file = e.target.files[0];
    if (!file) return;
    setEnviandoAnexo(true);
    try {
      const url = await uploadConviteAnexo(event.id, file);
      setTemplates(prev => prev.map(t => t.id === ativo.id ? { ...t, anexoUrl: url, anexoNome: file.name } : t));
      showToast("Anexo enviado!", "success");
    } catch (err) {
      showToast("Erro ao enviar anexo: " + err.message, "error");
    } finally {
      setEnviandoAnexo(false);
      e.target.value = "";
    }
  }

  function removerAnexo() {
    set("anexoUrl", "");
    set("anexoNome", "");
  }

  async function salvar() {
    setSalvando(true);
    const { error } = await atualizarEvento(event.id, { convite_templates: templates });
    if (error) {
      showToast("Erro ao salvar modelos de e-mail.", "error");
    } else {
      setEvent(prev => ({ ...prev, convite_templates: templates }));
      showToast("Modelos de e-mail salvos!", "success");
    }
    setSalvando(false);
  }

  function htmlPreview() {
    return gerarTemplateHTML({
      event: event || {},
      bannerUrl: ativo.bannerUrl,
      inscricaoUrl: ativo.inscricaoUrl,
      assunto: ativo.assunto,
      mensagem: ativo.mensagem,
    });
  }

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Modelos de E-mail</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text3)" }}>
            Crie modelos (convite, lembrete, etc.) — na hora de enviar, escolha qual usar na aba Pré-Convidados.
          </p>
        </div>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
          <FontAwesomeIcon icon={faSave} style={{ marginRight: 6 }} />
          {salvando ? "Salvando…" : "Salvar Modelos"}
        </button>
      </div>

      {/* Seletor de modelos */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        {templates.map(t => (
          <button key={t.id}
            className={`btn btn-sm ${ativoId === t.id ? "btn-primary" : "btn-outline"}`}
            onClick={() => setAtivoId(t.id)}>
            {t.nome || "Sem nome"}
          </button>
        ))}
        <button className="btn btn-sm btn-outline" onClick={novoModelo}>
          <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Novo Modelo
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        <div>
          <div className="form-group">
            <label className="form-label">Nome do Modelo</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="form-input" type="text" placeholder="Ex: Convite, Lembrete, Última Chamada..."
                value={ativo.nome} onChange={e => set("nome", e.target.value)} />
              <button className="btn btn-sm btn-danger" title="Remover modelo" onClick={() => removerModelo(ativo.id)}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Assunto do E-mail</label>
            <input className="form-input" type="text" placeholder={`Convite — ${event?.nome || "Evento"}`}
              value={ativo.assunto} onChange={e => set("assunto", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Mensagem</label>
            <textarea className="form-input" rows={6} value={ativo.mensagem} onChange={e => set("mensagem", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">URL do Banner do Evento (opcional)</label>
            <input className="form-input" type="url" placeholder="https://exemplo.com/banner.jpg"
              value={ativo.bannerUrl} onChange={e => set("bannerUrl", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">URL da Página de Inscrição *</label>
            <input className="form-input" type="url" value={ativo.inscricaoUrl} onChange={e => set("inscricaoUrl", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Anexo (PDF, imagem, etc.)</label>
            {ativo.anexoNome ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
                <FontAwesomeIcon icon={faPaperclip} />
                <a href={ativo.anexoUrl} target="_blank" rel="noreferrer">{ativo.anexoNome}</a>
                <button className="btn btn-sm btn-danger" title="Remover anexo" onClick={removerAnexo}>
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            ) : (
              <button className="btn btn-outline" onClick={() => fileRef.current.click()} disabled={enviandoAnexo}>
                <FontAwesomeIcon icon={faUpload} style={{ marginRight: 6 }} />
                {enviandoAnexo ? "Enviando…" : "Anexar Arquivo"}
              </button>
            )}
            <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleAnexo} />
          </div>
        </div>

        <div>
          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
            <div style={{ background: "var(--surface2)", padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}>
              <FontAwesomeIcon icon={faEye} />Preview do E-mail — {ativo.nome}
            </div>
            <iframe
              title="preview-config-email"
              srcDoc={htmlPreview()}
              style={{ width: "100%", height: 800, border: 0, display: "block" }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
