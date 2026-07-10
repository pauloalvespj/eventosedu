import { useState, useRef } from "react";
import { read, utils } from "xlsx";
import { supabase } from "../../../../lib/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUpload, faEnvelope, faTrash, faPlus, faEye,
  faDownload, faCheckDouble, faPenToSquare, faFloppyDisk, faCopy,
} from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "../AdminContext";
import { Modal } from "../../../base/index";
import {
  inserirConvidado, inserirConvidadosLote,
  atualizarConvidado, deletarConvidado, marcarEmailEnviado,
} from "../../../../lib/db";
import { gerarTemplateHTML } from "../../../../lib/emailTemplate";

const STATUS_CONFIG = {
  pendente: { label: "Pendente", cls: "badge-warn"    },
  inscrito: { label: "Inscrito", cls: "badge-success" },
};

export function AbaPreConvidados() {
  const { convidados, setConvidados, participantes, event, showToast } = useAdmin();

  const [busca, setBusca]           = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [selecionados, setSelecionados] = useState(new Set());
  const [modalAdd, setModalAdd]     = useState(false);
  const [modalEdit, setModalEdit]   = useState(null);  // lead sendo editado
  const [formEdit, setFormEdit]     = useState({});
  const [modalEmail, setModalEmail] = useState(false);
  const [formAdd, setFormAdd]       = useState({ nome: "", email: "", instituicao: "" });
  const [importando, setImportando] = useState(false);
  const [enviando, setEnviando]     = useState(false);
  const [templateId, setTemplateId] = useState("");
  const fileRef = useRef();

  const templates = event?.convite_templates?.length
    ? event.convite_templates
    : (event?.convite_config && Object.keys(event.convite_config).length
      ? [{ id: "default", nome: "Convite", ...event.convite_config }]
      : []);

  // Deriva status a partir dos profiles já inscritos
  const emailsInscritos = new Set(participantes.map(p => p.email?.toLowerCase()).filter(Boolean));
  const convidadosComStatus = convidados.map(c => ({
    ...c,
    status: emailsInscritos.has(c.email?.toLowerCase()) ? "inscrito" : c.status,
  }));

  const filtrados = convidadosComStatus.filter(c => {
    const q = busca.toLowerCase();
    const ok = !q || c.nome?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.instituicao?.toLowerCase().includes(q);
    const passaStatus =
      filtroStatus === "todos"        ? true :
      filtroStatus === "email_enviado" ? c.email_enviado :
      filtroStatus === "sem_email"    ? !c.email_enviado :
      c.status === filtroStatus;
    return ok && passaStatus;
  });

  // ── Exportar / copiar leads filtrados ────────────────────────
  function baixarLeadsFiltrados() {
    if (!filtrados.length) { showToast("Nenhum lead para exportar.", "warn"); return; }
    const header = "Nome,E-mail,Instituição,Status,E-mail Enviado\n";
    const rows = filtrados.map(c => {
      const status = (STATUS_CONFIG[c.status] || STATUS_CONFIG.pendente).label;
      return `"${c.nome || ""}","${c.email || ""}","${c.instituicao || ""}","${status}","${c.email_enviado ? "Sim" : "Não"}"`;
    }).join("\n");
    // BOM garante acentuação correta ao abrir no Excel
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const nomeEvento = event?.nome?.replace(/\s+/g, "_") || "evento";
    const data = new Date().toISOString().slice(0, 10);
    a.download = `leads_${nomeEvento}_${data}.csv`;
    a.click();
    showToast(`${filtrados.length} lead${filtrados.length !== 1 ? "s" : ""} exportado${filtrados.length !== 1 ? "s" : ""}!`, "success");
  }

  function copiarEmailsFiltrados() {
    const emails = filtrados.map(c => c.email).filter(Boolean);
    if (!emails.length) { showToast("Nenhum e-mail para copiar.", "warn"); return; }
    navigator.clipboard.writeText(emails.join("; "));
    showToast(`${emails.length} e-mail${emails.length !== 1 ? "s" : ""} copiado${emails.length !== 1 ? "s" : ""}! Cole no campo Cco do Gmail.`, "success");
  }

  // ── Importar planilha ────────────────────────────────────────
  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportando(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json(sheet, { defval: "" });

      // Normaliza chaves da planilha: remove acentos, converte para minúsculas e tira espaços
      function normKey(k) {
        return String(k).toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // remove acentos
          .replace(/[\s\-_]+/g, "");                          // remove espaços, hífens e underscores
      }
      // Constrói mapa normalizado para cada row
      function getField(row, ...aliases) {
        const map = {};
        for (const k of Object.keys(row)) map[normKey(k)] = row[k];
        for (const alias of aliases) {
          const v = map[normKey(alias)];
          if (v !== undefined && String(v).trim() !== "") return String(v).trim();
        }
        return "";
      }

      const normalize = (row) => ({
        nome:       getField(row, "nome", "name", "participante"),
        email:      getField(row, "email", "e-mail", "e_mail", "mail").toLowerCase(),
        instituicao: getField(row, "orgao", "orgão", "orgao", "instituicao", "institution", "org", "entidade", "empresa"),
        event_id:   event?.id ?? 1,
        status:     "pendente",
        // colunas "Convite enviado?" e "Inscrição confirmada?" são ignoradas intencionalmente
      });

      const validos = rows.map(normalize).filter(r => r.nome && r.email);
      if (!validos.length) { showToast("Nenhum dado válido encontrado na planilha.", "error"); return; }

      // Atualiza localmente evitando duplicatas de e-mail
      const novos = validos.filter(v => !convidados.some(c => c.email === v.email));
      const locais = novos.map((c, i) => ({ ...c, id: `imp-${Date.now()}-${i}` }));
      setConvidados(prev => [...prev, ...locais]);

      // Persiste em lote
      const { error } = await inserirConvidadosLote(validos);
      if (error) showToast(`Importado localmente — erro ao salvar: ${error.message}`, "warn");
      else showToast(`${novos.length} lead${novos.length !== 1 ? "s" : ""} importado${novos.length !== 1 ? "s" : ""}!`, "success");
    } catch (err) {
      showToast("Erro ao ler a planilha: " + err.message, "error");
    } finally {
      setImportando(false);
      e.target.value = "";
    }
  }

  // ── Adicionar manualmente ────────────────────────────────────
  async function adicionarLead() {
    if (!formAdd.nome || !formAdd.email) { showToast("Nome e e-mail são obrigatórios.", "error"); return; }
    if (convidados.some(c => c.email.toLowerCase() === formAdd.email.toLowerCase())) {
      showToast("Já existe um lead com este e-mail.", "warn"); return;
    }
    const novo = { ...formAdd, id: `local-${Date.now()}`, event_id: event?.id ?? 1, status: "pendente" };
    setConvidados(prev => [...prev, novo]);
    inserirConvidado(formAdd);
    showToast("Lead adicionado!", "success");
    setFormAdd({ nome: "", email: "", instituicao: "" });
    setModalAdd(false);
  }

  // ── Editar lead ──────────────────────────────────────────────
  async function salvarEdicao() {
    if (!formEdit.nome || !formEdit.email) { showToast("Nome e e-mail são obrigatórios.", "error"); return; }
    setConvidados(prev => prev.map(c => c.id === modalEdit.id ? { ...c, ...formEdit } : c));
    atualizarConvidado(modalEdit.id, { nome: formEdit.nome, email: formEdit.email.toLowerCase().trim(), instituicao: formEdit.instituicao });
    showToast("Lead atualizado!", "success");
    setModalEdit(null);
  }

  // ── Excluir ──────────────────────────────────────────────────
  function excluir(c) {
    if (!confirm(`Remover "${c.nome}" da lista de leads?`)) return;
    setConvidados(prev => prev.filter(x => x.id !== c.id));
    deletarConvidado(c.id);
    showToast("Lead removido.", "info");
  }

  // ── Selecionar todos os filtrados ────────────────────────────
  function toggleTodos() {
    if (selecionados.size === filtrados.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(filtrados.map(c => c.id)));
    }
  }

  // ── Preview e envio de convites ──────────────────────────────
  const convite = templates.find(t => t.id === templateId) || templates[0] || {};
  const leadPreview = filtrados.find(c => selecionados.has(c.id)) || filtrados[0] || { nome: "Convidado", email: "" };

  function htmlPreview() {
    return gerarTemplateHTML({
      lead: leadPreview, event: event || {},
      bannerUrl: convite.bannerUrl, inscricaoUrl: convite.inscricaoUrl,
      assunto: convite.assunto, mensagem: convite.mensagem,
    });
  }

  function baixarHTML() {
    const blob = new Blob([htmlPreview()], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `convite-${event?.nome?.replace(/\s+/g, "_") || "evento"}.html`;
    a.click();
  }

  async function enviarConvites() {
    const ids = [...selecionados];
    if (!ids.length) { showToast("Selecione ao menos um lead.", "warn"); return; }
    setEnviando(true);
    try {
      const leadsParaEnviar = convidados.filter(c => ids.includes(c.id));
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("enviar-convite", {
        body: {
          leads: leadsParaEnviar, event,
          bannerUrl: convite.bannerUrl, inscricaoUrl: convite.inscricaoUrl,
          assunto: convite.assunto, mensagem: convite.mensagem,
          anexoUrl: convite.anexoUrl, anexoNome: convite.anexoNome,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const enviados = data?.sent || [];
      const falhas = data?.failed || [];
      if (enviados.length) {
        setConvidados(prev => prev.map(c => enviados.includes(c.id) ? { ...c, email_enviado: true } : c));
        await marcarEmailEnviado(enviados);
      }
      if (falhas.length) {
        showToast(`${enviados.length} enviado${enviados.length !== 1 ? "s" : ""}, ${falhas.length} falharam. Veja o console para detalhes.`, "warn");
        console.warn("Falhas ao enviar convites:", falhas);
      } else {
        showToast(`Convites enviados para ${enviados.length} lead${enviados.length !== 1 ? "s" : ""}!`, "success");
      }
      setSelecionados(new Set());
      setModalEmail(false);
    } catch (err) {
      // Edge Function não configurada ou SMTP com erro — orienta o admin
      showToast("Não foi possível enviar via SMTP (" + (err.message || err) + "). Baixe o HTML e envie manualmente.", "warn");
    } finally {
      setEnviando(false);
    }
  }

  const pendentes = convidadosComStatus.filter(c => c.status === "pendente").length;
  const inscritos = convidadosComStatus.filter(c => c.status === "inscrito").length;
  const emailEnviados = convidadosComStatus.filter(c => c.email_enviado).length;

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Pré-Convidados (Leads)</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text3)" }}>
            {pendentes} pendente{pendentes !== 1 ? "s" : ""} · {emailEnviados} e-mail{emailEnviados !== 1 ? "s" : ""} enviado{emailEnviados !== 1 ? "s" : ""} · {inscritos} inscrito{inscritos !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn btn-outline" onClick={() => fileRef.current.click()} disabled={importando}>
            <FontAwesomeIcon icon={faUpload} style={{ marginRight: 6 }} />
            {importando ? "Importando…" : "Importar Planilha"}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleImport} />
          <button className="btn btn-outline" onClick={() => { setFormAdd({ nome: "", email: "", instituicao: "" }); setModalAdd(true); }}>
            <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Adicionar Lead
          </button>
          {selecionados.size > 0 && (
            <button className="btn btn-primary" onClick={() => setModalEmail(true)}>
              <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: 6 }} />
              Enviar Convites ({selecionados.size})
            </button>
          )}
        </div>
      </div>

      {/* Resumo de conversão */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {[
          { n: convidadosComStatus.length, label: "Total",    cls: "badge-navy"    },
          { n: pendentes,                  label: "Pendente", cls: "badge-warn"    },
          { n: emailEnviados,              label: "E-mail enviado", cls: "badge-navy" },
          { n: inscritos,                  label: "Inscrito", cls: "badge-success" },
        ].map(({ n, label, cls }) => (
          <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.6rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 100 }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--navy)" }}>{n}</div>
            <span className={`badge ${cls}`} style={{ marginTop: 2 }}>{label}</span>
          </div>
        ))}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.6rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", minWidth: 100 }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--teal)" }}>
            {convidadosComStatus.length ? Math.round((inscritos / convidadosComStatus.length) * 100) : 0}%
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: 2 }}>Conversão</span>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Leads ({filtrados.length})</span>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <select className="search-input" style={{ width: "auto", borderRadius: "var(--radius-sm)" }}
              value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="inscrito">Inscrito</option>
              <option value="email_enviado">E-mail enviado</option>
              <option value="sem_email">Sem e-mail enviado</option>
            </select>
            <input className="search-input" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
            <button className="btn btn-sm btn-outline" title="Copiar e-mails dos leads filtrados" onClick={copiarEmailsFiltrados}>
              <FontAwesomeIcon icon={faCopy} style={{ marginRight: 6 }} />Copiar E-mails
            </button>
            <button className="btn btn-sm btn-outline" title="Baixar CSV com os leads filtrados" onClick={baixarLeadsFiltrados}>
              <FontAwesomeIcon icon={faDownload} style={{ marginRight: 6 }} />Baixar CSV
            </button>
          </div>
        </div>
        <table style={{ width: "100%", fontSize: "0.83rem" }}>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input type="checkbox" checked={selecionados.size === filtrados.length && filtrados.length > 0}
                  onChange={toggleTodos} title="Selecionar todos" />
              </th>
              <th>Nome</th><th>E-mail</th><th>Instituição</th><th>Status</th><th style={{ width: 90 }}>E-mail</th><th style={{ width: 60 }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>
                Nenhum lead encontrado. Importe uma planilha ou adicione manualmente.
              </td></tr>
            )}
            {filtrados.map(c => {
              const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.pendente;
              return (
                <tr key={c.id}>
                  <td>
                    <input type="checkbox" checked={selecionados.has(c.id)}
                      onChange={e => {
                        const s = new Set(selecionados);
                        if (e.target.checked) s.add(c.id); else s.delete(c.id);
                        setSelecionados(s);
                      }}
                    />
                  </td>
                  <td style={{ fontWeight: 500 }}>{c.nome}</td>
                  <td style={{ fontSize: "0.82rem", color: "var(--text2)" }}>{c.email}</td>
                  <td style={{ fontSize: "0.82rem" }}>{c.instituicao || <span style={{ color: "var(--text3)" }}>–</span>}</td>
                  <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                  <td style={{ textAlign: "center" }}>
                    {c.email_enviado
                      ? <span title="E-mail enviado" style={{ color: "var(--teal)", fontSize: "1rem" }}>✉ <span style={{ fontSize: "0.72rem", color: "var(--teal)" }}>Enviado</span></span>
                      : <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>–</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button className="btn btn-sm btn-outline" title="Editar lead"
                      onClick={() => { setFormEdit({ nome: c.nome, email: c.email, instituicao: c.instituicao || "" }); setModalEdit(c); }}>
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <button className="btn btn-sm btn-danger" title="Remover lead" onClick={() => excluir(c)} disabled={c.status === "inscrito"}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: adicionar lead manualmente */}
      <Modal show={modalAdd} onClose={() => setModalAdd(false)} title="Adicionar Lead">
        <div className="form-group">
          <label className="form-label">Nome *</label>
          <input className="form-input" value={formAdd.nome} onChange={e => setFormAdd(f => ({ ...f, nome: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">E-mail *</label>
          <input className="form-input" type="email" value={formAdd.email} onChange={e => setFormAdd(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Instituição</label>
          <input className="form-input" value={formAdd.instituicao} onChange={e => setFormAdd(f => ({ ...f, instituicao: e.target.value }))} />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
          <button className="btn btn-primary" onClick={adicionarLead}>
            <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Adicionar
          </button>
          <button className="btn btn-outline" onClick={() => setModalAdd(false)}>Cancelar</button>
        </div>
      </Modal>

      {/* Modal: editar lead */}
      <Modal show={!!modalEdit} onClose={() => setModalEdit(null)} title="Editar Lead">
        <div className="form-group">
          <label className="form-label">Nome *</label>
          <input className="form-input" value={formEdit.nome || ""} onChange={e => setFormEdit(f => ({ ...f, nome: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">E-mail *</label>
          <input className="form-input" type="email" value={formEdit.email || ""} onChange={e => setFormEdit(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Órgão / Instituição</label>
          <input className="form-input" value={formEdit.instituicao || ""} onChange={e => setFormEdit(f => ({ ...f, instituicao: e.target.value }))} />
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
          <button className="btn btn-primary" onClick={salvarEdicao}>
            <FontAwesomeIcon icon={faFloppyDisk} style={{ marginRight: 6 }} />Salvar
          </button>
          <button className="btn btn-outline" onClick={() => setModalEdit(null)}>Cancelar</button>
        </div>
      </Modal>

      {/* Modal: preview e envio de convite */}
      <Modal show={modalEmail} onClose={() => setModalEmail(false)} wide title={`Enviar Convites (${selecionados.size} lead${selecionados.size !== 1 ? "s" : ""})`}>
        {templates.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "var(--text2)" }}>
            Nenhum modelo de e-mail criado ainda. Vá na aba <strong>Modelos de E-mail</strong> para criar um antes de enviar.
          </p>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Modelo de E-mail</label>
              <select className="search-input" style={{ width: "100%" }}
                value={convite.id} onChange={e => setTemplateId(e.target.value)}>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.nome || "Sem nome"}</option>
                ))}
              </select>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text2)", marginBottom: "1rem" }}>
              Preview para o lead <strong>{leadPreview.nome}</strong>.
              {convite.anexoNome && <> Anexo: <strong>{convite.anexoNome}</strong>.</>}
              {" "}Edite o conteúdo na aba <strong>Modelos de E-mail</strong>.
            </p>

            {/* Preview do e-mail */}
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden", marginBottom: "1rem" }}>
              <div style={{ background: "var(--surface2)", padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}>
                <FontAwesomeIcon icon={faEye} />Preview do E-mail
              </div>
              <iframe
                title="preview-email"
                srcDoc={htmlPreview()}
                style={{ width: "100%", height: 700, border: 0, display: "block" }}
                sandbox="allow-same-origin"
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={enviarConvites} disabled={enviando}>
                <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: 6 }} />
                {enviando ? "Enviando…" : "Enviar via SMTP"}
              </button>
              <button className="btn btn-outline" onClick={baixarHTML}>
                <FontAwesomeIcon icon={faDownload} style={{ marginRight: 6 }} />Baixar HTML
              </button>
              <button className="btn btn-outline" onClick={async () => {
                const ids = [...selecionados];
                setConvidados(prev => prev.map(c => ids.includes(c.id) ? { ...c, email_enviado: true } : c));
                await marcarEmailEnviado(ids);
                setSelecionados(new Set());
                setModalEmail(false);
                showToast("Leads marcados como e-mail enviado.", "success");
              }}>
                <FontAwesomeIcon icon={faCheckDouble} style={{ marginRight: 6 }} />Marcar como Enviado
              </button>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text3)", marginTop: "0.75rem" }}>
              "Enviar via SMTP" requer a Edge Function <code>enviar-convite</code> e os secrets de SMTP configurados no projeto.
              Use "Baixar HTML" para enviar manualmente pelo seu cliente de e-mail.
            </p>
          </>
        )}
      </Modal>
    </div>
  );
}
