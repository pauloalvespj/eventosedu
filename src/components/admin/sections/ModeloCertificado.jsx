import { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload, faTrash, faPlus, faPrint, faSave,
  faPalette, faPen, faSignature, faEye, faImage,
} from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { atualizarEvento, uploadCertAsset } from "../../../lib/db";
import { formatData, gerarHtmlCertificado } from "../../../utils/helpers";

const DEFAULTS = {
  logo_esq_url:          "",
  logo_dir_url:          "",
  titulo_participante:   "Certificado de Participação",
  titulo_palestrante:    "Certificado de Palestrante",
  texto_participante:    "participou de todas as atividades do",
  texto_palestrante:     "atuou como palestrante convidado(a) no",
  conteudo_programatico: "",
  mostrar_ch:            true,
  mostrar_lista_ativs:   false,
  borda_dupla:           true,
  cor_primaria:          "#0f3460",
  cor_secundaria:        "#c9a84c",
  assinaturas: [
    { id: 1, nome: "", cargo: "Coordenação do Evento",   assinatura_url: "" },
    { id: 2, nome: "", cargo: "Comissão Organizadora",   assinatura_url: "" },
  ],
};

const ABAS = [
  { id: "visual",        icon: faPalette,   label: "Identidade Visual" },
  { id: "conteudo",      icon: faPen,       label: "Conteúdo" },
  { id: "assinaturas",   icon: faSignature, label: "Assinaturas" },
  { id: "preview",       icon: faEye,       label: "Pré-visualização" },
];

export function ModeloCertificado() {
  const { event, setEvent, atividades, showToast } = useAdmin();

  const [cfg, setCfg] = useState(() => ({ ...DEFAULTS, ...(event.cert_config || {}) }));
  const [aba, setAba] = useState("visual");
  const [salvando, setSalvando] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [tipoPreview, setTipoPreview] = useState("participante");
  const sigRefs = useRef({});

  function set(field, value) {
    setCfg(prev => ({ ...prev, [field]: value }));
  }

  function setAss(id, field, value) {
    setCfg(prev => ({
      ...prev,
      assinaturas: prev.assinaturas.map(a => a.id === id ? { ...a, [field]: value } : a),
    }));
  }

  function addAssinatura() {
    const newId = Date.now();
    setCfg(prev => ({
      ...prev,
      assinaturas: [...prev.assinaturas, { id: newId, nome: "", cargo: "", assinatura_url: "" }],
    }));
  }

  function removeAssinatura(id) {
    setCfg(prev => ({ ...prev, assinaturas: prev.assinaturas.filter(a => a.id !== id) }));
  }

  async function handleUploadLogo(campo, file) {
    if (!file) return;
    setUploading(campo);
    try {
      const url = await uploadCertAsset(event.id, campo, file);
      set(campo, url);
      showToast("Logo enviado!", "success");
    } catch (e) {
      showToast("Erro ao enviar logo: " + e.message, "error");
    } finally {
      setUploading(null);
    }
  }

  async function handleUploadAssinatura(assId, file) {
    if (!file) return;
    setUploading(`ass_${assId}`);
    try {
      const url = await uploadCertAsset(event.id, `assinatura_${assId}`, file);
      setAss(assId, "assinatura_url", url);
      showToast("Assinatura enviada!", "success");
    } catch (e) {
      showToast("Erro ao enviar assinatura: " + e.message, "error");
    } finally {
      setUploading(null);
    }
  }

  async function salvar() {
    setSalvando(true);
    const { error } = await atualizarEvento(event.id, { cert_config: cfg });
    if (error) {
      showToast("Erro ao salvar configuração.", "error");
    } else {
      setEvent(prev => ({ ...prev, cert_config: cfg }));
      showToast("Configuração salva!", "success");
    }
    setSalvando(false);
  }

  function abrirImpressao() {
    const userDemo = tipoPreview === "participante"
      ? { nome: "Nome do Participante", cargo: "Cargo Exemplo", instituicao: "Instituição Exemplo", cpf: "000.000.000-00" }
      : { nome: "Nome do Palestrante", titulo: "Dr.", instituicao: "Universidade Exemplo" };
    const presencaDemo = { chCumprida: 16, pct: 80 };
    const atvsDemo = atividades.filter(a => a.conta_certificado).slice(0, 4);
    const palestrasDemo = atividades.filter(a => a.tipo === "palestra").slice(0, 2);
    const html = gerarHtmlCertificado(userDemo, event, presencaDemo, [], atvsDemo, tipoPreview, palestrasDemo, 8, cfg);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  }

  const previewHtml = (() => {
    const userDemo = tipoPreview === "participante"
      ? { nome: "Nome do Participante", cargo: "Cargo Exemplo", instituicao: "Instituição Exemplo", cpf: "000.000.000-00" }
      : { nome: "Nome do Palestrante", titulo: "Dr.", instituicao: "Universidade Exemplo" };
    const presencaDemo = { chCumprida: 16, pct: 80 };
    const atvsDemo = atividades.filter(a => a.conta_certificado).slice(0, 4);
    const palestrasDemo = atividades.filter(a => a.tipo === "palestra").slice(0, 2);
    return gerarHtmlCertificado(userDemo, event, presencaDemo, [], atvsDemo, tipoPreview, palestrasDemo, 8, cfg);
  })();

  return (
    <div>
      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1>Modelo do Certificado</h1>
          <p>Configure logos, conteúdo, assinaturas e visualize o resultado</p>
        </div>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando}
          style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FontAwesomeIcon icon={faSave} />
          {salvando ? "Salvando…" : "Salvar configuração"}
        </button>
      </div>

      {/* Aviso SQL se necessário */}
      {!event.cert_config && (
        <div style={{ background: "var(--warn-bg)", border: "1px solid var(--warn)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1.25rem", marginBottom: "1.25rem", fontSize: "0.83rem", color: "var(--warn)" }}>
          ⚠️ Execute no banco: <code style={{ fontFamily: "monospace", background: "rgba(0,0,0,0.05)", padding: "0.1rem 0.4rem", borderRadius: 4 }}>ALTER TABLE events ADD COLUMN IF NOT EXISTS cert_config jsonb DEFAULT '&#123;&#125;';</code>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.5rem", borderBottom: "2px solid var(--border)" }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{
              padding: "0.65rem 1.25rem", background: "transparent", border: "none",
              borderBottom: `2px solid ${aba === a.id ? "var(--navy)" : "transparent"}`,
              marginBottom: -2, cursor: "pointer", fontWeight: aba === a.id ? 700 : 500,
              color: aba === a.id ? "var(--navy)" : "var(--text2)",
              display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem",
              transition: "all 0.15s",
            }}>
            <FontAwesomeIcon icon={a.icon} style={{ fontSize: "0.85rem" }} />
            {a.label}
          </button>
        ))}
      </div>

      {/* ── ABA: IDENTIDADE VISUAL ── */}
      {aba === "visual" && (
        <div style={{ maxWidth: 720 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
            {[
              { campo: "logo_esq_url", label: "Logo Esquerda", desc: "Ex: logotipo do evento" },
              { campo: "logo_dir_url", label: "Logo Direita",  desc: "Ex: logotipo do órgão" },
            ].map(({ campo, label, desc }) => (
              <div key={campo} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)", marginBottom: "0.25rem" }}>{label}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: "1rem" }}>{desc}</div>
                {cfg[campo] ? (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <img src={cfg[campo]} alt={label} style={{ maxHeight: 70, maxWidth: "100%", objectFit: "contain", display: "block", marginBottom: "0.5rem", borderRadius: 4, border: "1px solid var(--border)" }} />
                    <button className="btn btn-sm btn-danger" onClick={() => set(campo, "")} style={{ fontSize: "0.75rem" }}>
                      <FontAwesomeIcon icon={faTrash} style={{ marginRight: 4 }} />Remover
                    </button>
                  </div>
                ) : (
                  <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface2)", borderRadius: 6, border: "2px dashed var(--border)", marginBottom: "0.75rem", color: "var(--text3)", fontSize: "0.8rem" }}>
                    <FontAwesomeIcon icon={faImage} style={{ marginRight: 6 }} /> Sem logo
                  </div>
                )}
                <label style={{ cursor: uploading === campo ? "default" : "pointer" }}>
                  <input type="file" accept="image/*" style={{ display: "none" }}
                    disabled={uploading === campo}
                    onChange={e => { if (e.target.files[0]) { handleUploadLogo(campo, e.target.files[0]); e.target.value = ""; } }} />
                  <span className={`btn btn-sm btn-outline ${uploading === campo ? "" : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, pointerEvents: uploading === campo ? "none" : "auto", opacity: uploading === campo ? 0.6 : 1 }}>
                    <FontAwesomeIcon icon={faUpload} />
                    {uploading === campo ? "Enviando…" : "Enviar logo"}
                  </span>
                </label>
              </div>
            ))}
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem", marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)", marginBottom: "1rem" }}>Aparência</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Cor primária (bordas, títulos)</label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <input type="color" value={cfg.cor_primaria} onChange={e => set("cor_primaria", e.target.value)}
                    style={{ width: 40, height: 36, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                  <input className="form-input" value={cfg.cor_primaria} onChange={e => set("cor_primaria", e.target.value)}
                    style={{ fontFamily: "monospace", flex: 1 }} maxLength={7} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Cor secundária (dourado)</label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <input type="color" value={cfg.cor_secundaria} onChange={e => set("cor_secundaria", e.target.value)}
                    style={{ width: 40, height: 36, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                  <input className="form-input" value={cfg.cor_secundaria} onChange={e => set("cor_secundaria", e.target.value)}
                    style={{ fontFamily: "monospace", flex: 1 }} maxLength={7} />
                </div>
              </div>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: 500 }}>
                <input type="checkbox" checked={cfg.borda_dupla} onChange={e => set("borda_dupla", e.target.checked)} style={{ width: 16, height: 16 }} />
                Exibir borda dupla ornamental
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA: CONTEÚDO ── */}
      {aba === "conteudo" && (
        <div style={{ maxWidth: 720 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem", marginBottom: "1.25rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)", marginBottom: "1rem" }}>Títulos</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Título — Participante</label>
                <input className="form-input" value={cfg.titulo_participante} onChange={e => set("titulo_participante", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Título — Palestrante</label>
                <input className="form-input" value={cfg.titulo_palestrante} onChange={e => set("titulo_palestrante", e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem", marginBottom: "1.25rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)", marginBottom: "0.25rem" }}>Texto do corpo</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: "1rem" }}>
              Texto que vem após o nome do participante/palestrante. Use <code style={{ background: "var(--surface2)", padding: "0.1rem 0.3rem", borderRadius: 3 }}>{"{{evento}}"}</code> para inserir o nome do evento.
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Texto — Participante</label>
                <input className="form-input" value={cfg.texto_participante} onChange={e => set("texto_participante", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Texto — Palestrante</label>
                <input className="form-input" value={cfg.texto_palestrante} onChange={e => set("texto_palestrante", e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem", marginBottom: "1.25rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)", marginBottom: "0.25rem" }}>Conteúdo Programático</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: "0.75rem" }}>
              Texto que descreve a programação do evento. Exibido no certificado abaixo do corpo principal.
            </div>
            <textarea className="form-input" rows={6}
              placeholder={"Ex:\n- Abertura e apresentação\n- Painel: Tópico A\n- Palestra: Tópico B\n- Mesa redonda\n- Encerramento"}
              value={cfg.conteudo_programatico}
              onChange={e => set("conteudo_programatico", e.target.value)}
              style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
            />
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)", marginBottom: "1rem" }}>Exibição de dados</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { field: "mostrar_ch",         label: "Exibir carga horária e percentual de presença" },
                { field: "mostrar_lista_ativs", label: "Exibir lista de atividades cursadas (participante)" },
              ].map(({ field, label }) => (
                <label key={field} style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: 500 }}>
                  <input type="checkbox" checked={cfg[field]} onChange={e => set(field, e.target.checked)} style={{ width: 16, height: 16 }} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ABA: ASSINATURAS ── */}
      {aba === "assinaturas" && (
        <div style={{ maxWidth: 720 }}>
          <div style={{ fontSize: "0.83rem", color: "var(--text3)", marginBottom: "1.25rem" }}>
            Configure as assinaturas exibidas no rodapé do certificado. Você pode fazer upload da imagem da assinatura digitalizada ou deixar apenas a linha com o nome e cargo.
          </div>

          {cfg.assinaturas.map((ass, idx) => (
            <div key={ass.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--navy)" }}>Assinatura {idx + 1}</div>
                {cfg.assinaturas.length > 1 && (
                  <button className="btn btn-sm btn-danger" onClick={() => removeAssinatura(ass.id)} style={{ padding: "0.2rem 0.5rem" }}>
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                )}
              </div>
              <div className="form-grid" style={{ marginBottom: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">Nome (opcional)</label>
                  <input className="form-input" placeholder="Ex: João da Silva" value={ass.nome}
                    onChange={e => setAss(ass.id, "nome", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cargo / Título</label>
                  <input className="form-input" placeholder="Ex: Coordenação do Evento" value={ass.cargo}
                    onChange={e => setAss(ass.id, "cargo", e.target.value)} />
                </div>
              </div>

              {/* Upload assinatura */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                {ass.assinatura_url ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <img src={ass.assinatura_url} alt="Assinatura" style={{ height: 48, maxWidth: 180, objectFit: "contain", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", padding: 4 }} />
                    <button className="btn btn-sm btn-danger" onClick={() => setAss(ass.id, "assinatura_url", "")} style={{ padding: "0.2rem 0.5rem" }}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ) : (
                  <div style={{ height: 48, width: 160, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface2)", borderRadius: 6, border: "2px dashed var(--border)", color: "var(--text3)", fontSize: "0.75rem" }}>
                    Sem imagem
                  </div>
                )}
                <label style={{ cursor: uploading === `ass_${ass.id}` ? "default" : "pointer" }}>
                  <input type="file" accept="image/*" style={{ display: "none" }}
                    ref={el => sigRefs.current[ass.id] = el}
                    disabled={uploading === `ass_${ass.id}`}
                    onChange={e => { if (e.target.files[0]) { handleUploadAssinatura(ass.id, e.target.files[0]); e.target.value = ""; } }} />
                  <span className="btn btn-sm btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: 6, opacity: uploading === `ass_${ass.id}` ? 0.6 : 1 }}>
                    <FontAwesomeIcon icon={faUpload} />
                    {uploading === `ass_${ass.id}` ? "Enviando…" : "Upload assinatura"}
                  </span>
                </label>
                <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>PNG com fundo transparente recomendado</span>
              </div>
            </div>
          ))}

          <button className="btn btn-outline" onClick={addAssinatura}
            style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FontAwesomeIcon icon={faPlus} />
            Adicionar assinatura
          </button>
        </div>
      )}

      {/* ── ABA: PRÉ-VISUALIZAÇÃO ── */}
      {aba === "preview" && (
        <div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: 3, gap: 3 }}>
              {["participante", "palestrante"].map(tipo => (
                <button key={tipo} onClick={() => setTipoPreview(tipo)}
                  style={{
                    padding: "0.4rem 1rem", borderRadius: "var(--radius-sm)", border: "none",
                    background: tipoPreview === tipo ? "var(--navy)" : "transparent",
                    color: tipoPreview === tipo ? "#fff" : "var(--text2)",
                    fontWeight: 600, fontSize: "0.83rem", cursor: "pointer", transition: "all 0.15s",
                  }}>
                  {tipo === "participante" ? "Participante" : "Palestrante"}
                </button>
              ))}
            </div>
            <button className="btn btn-outline" onClick={abrirImpressao}
              style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FontAwesomeIcon icon={faPrint} />
              Abrir para impressão
            </button>
            <span style={{ fontSize: "0.78rem", color: "var(--text3)" }}>
              Pré-visualização com dados fictícios. Salve antes de imprimir para ver as últimas alterações.
            </span>
          </div>

          {/* Preview escalado */}
          <div style={{ overflow: "hidden", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "#f0f0f0", width: "100%", position: "relative" }}>
            {/* Container que define a altura visível — A4 landscape 297×210mm a ~45% */}
            <div style={{ width: "100%", paddingTop: "calc(210 / 297 * 100%)", position: "relative" }}>
              <iframe
                key={tipoPreview + JSON.stringify(cfg)}
                srcDoc={previewHtml}
                title="Pré-visualização do certificado"
                style={{
                  position: "absolute", top: 0, left: 0,
                  width: "297mm", height: "210mm",
                  border: "none",
                  transformOrigin: "top left",
                  transform: `scale(calc(100vw * 0.72 / 1122px))`, // aproximado, JS vai ajustar
                }}
                ref={el => {
                  if (!el) return;
                  function scaleFrame() {
                    const container = el.parentElement;
                    if (!container) return;
                    const w = container.offsetWidth;
                    const scale = w / 1122; // 297mm em px (96dpi)
                    el.style.transform = `scale(${scale})`;
                    container.style.paddingTop = `${(794 * scale)}px`; // 210mm em px
                  }
                  scaleFrame();
                  window.addEventListener("resize", scaleFrame);
                }}
              />
            </div>
          </div>

          {/* Checklist de validação */}
          <div style={{ marginTop: "1.5rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "1rem", fontSize: "0.88rem" }}>Checklist de validação</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {[
                { ok: !!cfg.logo_esq_url,                 label: "Logo esquerda configurado" },
                { ok: !!cfg.logo_dir_url,                 label: "Logo direita configurado" },
                { ok: !!cfg.titulo_participante,           label: "Título do certificado definido" },
                { ok: !!cfg.texto_participante,            label: "Texto do participante definido" },
                { ok: !!cfg.conteudo_programatico,         label: "Conteúdo programático preenchido" },
                { ok: cfg.assinaturas.some(a => a.cargo),  label: "Ao menos uma assinatura configurada" },
                { ok: cfg.assinaturas.some(a => a.assinatura_url), label: "Imagem de assinatura enviada" },
                { ok: !!event.data_inicio && !!event.data_fim, label: "Datas do evento definidas" },
                { ok: !!event.local,                       label: "Local do evento definido" },
                { ok: !!event.nome_completo || !!event.nome, label: "Nome do evento definido" },
              ].map(({ ok, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.83rem", color: ok ? "var(--success)" : "var(--text3)" }}>
                  <span style={{ fontSize: "1rem" }}>{ok ? "✅" : "⬜"}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
