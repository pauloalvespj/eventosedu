import { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faUpload, faTrash, faEye, faPaperclip } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "../AdminContext";
import { atualizarEvento, uploadConviteAnexo } from "../../../../lib/db";
import { gerarTemplateHTML, DEFAULT_MENSAGEM } from "../../../../lib/emailTemplate";

const DEFAULTS = {
  assunto: "",
  mensagem: DEFAULT_MENSAGEM,
  bannerUrl: "",
  inscricaoUrl: typeof window !== "undefined" ? window.location.origin : "",
  anexoUrl: "",
  anexoNome: "",
};

export function AbaConfigEmail() {
  const { event, setEvent, showToast } = useAdmin();

  const [cfg, setCfg] = useState(() => ({ ...DEFAULTS, ...(event.convite_config || {}) }));
  const [salvando, setSalvando] = useState(false);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const fileRef = useRef();

  function set(field, value) {
    setCfg(prev => ({ ...prev, [field]: value }));
  }

  async function handleAnexo(e) {
    const file = e.target.files[0];
    if (!file) return;
    setEnviandoAnexo(true);
    try {
      const url = await uploadConviteAnexo(event.id, file);
      setCfg(prev => ({ ...prev, anexoUrl: url, anexoNome: file.name }));
      showToast("Anexo enviado!", "success");
    } catch (err) {
      showToast("Erro ao enviar anexo: " + err.message, "error");
    } finally {
      setEnviandoAnexo(false);
      e.target.value = "";
    }
  }

  function removerAnexo() {
    setCfg(prev => ({ ...prev, anexoUrl: "", anexoNome: "" }));
  }

  async function salvar() {
    setSalvando(true);
    const { error } = await atualizarEvento(event.id, { convite_config: cfg });
    if (error) {
      showToast("Erro ao salvar configuração de e-mail.", "error");
    } else {
      setEvent(prev => ({ ...prev, convite_config: cfg }));
      showToast("Configuração de e-mail salva!", "success");
    }
    setSalvando(false);
  }

  function htmlPreview() {
    return gerarTemplateHTML({
      lead: { nome: "Convidado Exemplo" },
      event: event || {},
      bannerUrl: cfg.bannerUrl,
      inscricaoUrl: cfg.inscricaoUrl,
      assunto: cfg.assunto,
      mensagem: cfg.mensagem,
    });
  }

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Configurar E-mail de Convite</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text3)" }}>
            Defina assunto, mensagem e anexo usados ao enviar convites na aba Pré-Convidados.
          </p>
        </div>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
          <FontAwesomeIcon icon={faSave} style={{ marginRight: 6 }} />
          {salvando ? "Salvando…" : "Salvar Configuração"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        <div>
          <div className="form-group">
            <label className="form-label">Assunto do E-mail</label>
            <input className="form-input" type="text" placeholder={`Convite — ${event?.nome || "Evento"}`}
              value={cfg.assunto} onChange={e => set("assunto", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Mensagem</label>
            <textarea className="form-input" rows={6} value={cfg.mensagem} onChange={e => set("mensagem", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">URL do Banner do Evento (opcional)</label>
            <input className="form-input" type="url" placeholder="https://exemplo.com/banner.jpg"
              value={cfg.bannerUrl} onChange={e => set("bannerUrl", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">URL da Página de Inscrição *</label>
            <input className="form-input" type="url" value={cfg.inscricaoUrl} onChange={e => set("inscricaoUrl", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Anexo (PDF, imagem, etc.)</label>
            {cfg.anexoNome ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
                <FontAwesomeIcon icon={faPaperclip} />
                <a href={cfg.anexoUrl} target="_blank" rel="noreferrer">{cfg.anexoNome}</a>
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
              <FontAwesomeIcon icon={faEye} />Preview do E-mail
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
