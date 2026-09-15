import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExcel, faEnvelope } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "../AdminContext";
import { Modal } from "../../../base/index";
import { registrarLog } from "../../../../lib/db";
import { erroFuncaoEdge } from "../../../../utils/helpers";
import { supabase } from "../../../../lib/supabase";

const fmtNumero = (n) => (n == null ? "—" : String(n).padStart(3, "0"));

function tipoDe(p) {
  const tipos = [];
  if (p.role === "admin") tipos.push("Administrador");
  if (p.is_palestrante) tipos.push("Palestrante");
  if (p.is_credenciador) tipos.push("Credenciador");
  if (tipos.length === 0) tipos.push("Participante");
  return tipos.join(", ");
}

const situacaoDe = p => p.credenciado ? "Credenciado" : "Inscrito";

const COLUNAS = [
  { key: "numero",      label: "Nº",          width: 60, getValue: p => fmtNumero(p.numero_participante), opcional: true, padrao: true,
    tdStyle: { fontWeight: 700, fontSize: "1.05rem", fontVariantNumeric: "tabular-nums", color: "var(--navy)", textAlign: "center", whiteSpace: "nowrap" } },
  { key: "nome",        label: "Nome",        width: "42%", getValue: p => p.nome || "",
    tdStyle: { fontWeight: 500 } },
  { key: "cpf",         label: "CPF",         width: 145, getValue: p => p.cpf || "", opcional: true, padrao: false,
    tdStyle: { fontFamily: "monospace", fontSize: "0.82rem", whiteSpace: "nowrap" } },
  { key: "instituicao", label: "Instituição", width: 100, getValue: p => p.instituicao || "",
    tdStyle: { whiteSpace: "nowrap" } },
  { key: "cargo",       label: "Cargo",       width: "14%", getValue: p => p.cargo || "", opcional: true, padrao: false,
    tdStyle: { fontSize: "0.78rem", color: "var(--text3)" } },
  { key: "email",       label: "E-mail",      width: "18%", getValue: p => p.email || "", opcional: true, padrao: false,
    tdStyle: { fontSize: "0.82rem", color: "var(--text2)" } },
  { key: "situacao",    label: "Situação",    width: 140, getValue: situacaoDe, opcional: true, padrao: true,
    tdStyle: { whiteSpace: "nowrap" },
    render: p => <span className={`badge badge-${p.credenciado ? "success" : "warn"}`}>{situacaoDe(p)}</span> },
];

const COLUNAS_OPCIONAIS = COLUNAS.filter(c => c.opcional);

export function AbaGeral() {
  const { event, participantes, showToast } = useAdmin();
  const [filtros, setFiltros] = useState({});
  const [ordenacao, setOrdenacao] = useState({ campo: "numero", dir: "asc" });
  const [colunasVisiveis, setColunasVisiveis] = useState(() =>
    Object.fromEntries(COLUNAS_OPCIONAIS.map(c => [c.key, c.padrao]))
  );
  const colunasAtivas = COLUNAS.filter(c => !c.opcional || colunasVisiveis[c.key]);

  const [modalComunicado, setModalComunicado]     = useState(false);
  const [templateComunicadoId, setTemplateComunicadoId] = useState("");
  const [enviandoComunicado, setEnviandoComunicado] = useState(false);
  const [emailTesteComunicado, setEmailTesteComunicado] = useState("pauloalvespj@ufc.br");
  const [enviandoTesteComunicado, setEnviandoTesteComunicado] = useState(false);

  const filtrados = participantes.filter(p =>
    colunasAtivas.every(c => {
      const f = (filtros[c.key] || "").trim().toLowerCase();
      if (!f) return true;
      return c.getValue(p).toString().toLowerCase().includes(f);
    })
  );

  const colunaOrdenacao = colunasAtivas.find(c => c.key === ordenacao.campo) || COLUNAS.find(c => c.key === "numero");
  const ordenados = colunaOrdenacao
    ? [...filtrados].sort((a, b) => {
        const cmp = colunaOrdenacao.getValue(a).toString().localeCompare(colunaOrdenacao.getValue(b).toString(), "pt-BR", { sensitivity: "base", numeric: true });
        return ordenacao.dir === "asc" ? cmp : -cmp;
      })
    : filtrados;

  function alternarOrdenacao(campo) {
    setOrdenacao(o => o.campo === campo ? { campo, dir: o.dir === "asc" ? "desc" : "asc" } : { campo, dir: "asc" });
  }

  function setaOrdenacao(campo) {
    if (ordenacao.campo !== campo) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{ordenacao.dir === "asc" ? "↑" : "↓"}</span>;
  }

  const algumFiltro = Object.values(filtros).some(v => (v || "").trim());
  const aprovados = participantes.filter(p => p.ativo !== false && p.status_inscricao === "aprovado");
  const templatesComunicado = event?.convite_templates || [];

  async function dispararComunicado(template, leads) {
    const inscricaoUrl = template.inscricaoUrl || window.location.origin;
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("enviar-convite", {
      body: {
        leads, event,
        bannerUrl: template.bannerUrl, inscricaoUrl,
        assunto: template.assunto, mensagem: template.mensagem,
        anexoUrl: template.anexoUrl, anexoNome: template.anexoNome,
        corCabecalho: template.corCabecalho, corRodape: template.corRodape, corBotao: template.corBotao,
        ctaTexto: template.ctaTexto,
        avisoTitulo: template.avisoTitulo, avisoTexto: template.avisoTexto, avisoDestaque: template.avisoDestaque,
        avisoLinkUrl: template.avisoLinkUrl, avisoLinkTexto: template.avisoLinkTexto,
        ocultarRealizacao: template.ocultarRealizacao, ocultarCta: template.ocultarCta,
      },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (error) throw new Error(await erroFuncaoEdge(error));
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function enviarTesteComunicado() {
    const template = templatesComunicado.find(t => t.id === templateComunicadoId);
    if (!template) { showToast("Escolha um modelo.", "error"); return; }
    const email = emailTesteComunicado.trim();
    if (!email) { showToast("Informe um e-mail para o teste.", "error"); return; }
    setEnviandoTesteComunicado(true);
    try {
      const data = await dispararComunicado(template, [{ id: "teste", email }]);
      if (!data) return;
      if (data.failed?.length) {
        showToast("Falha ao enviar teste: " + (data.failed[0]?.error || "erro desconhecido"), "error");
      } else {
        showToast(`E-mail de teste enviado para ${email}!`, "success");
      }
    } catch (err) {
      showToast("Não foi possível enviar via SMTP (" + (err.message || err) + ").", "error");
    } finally {
      setEnviandoTesteComunicado(false);
    }
  }

  async function solicitarComunicado() {
    const template = templatesComunicado.find(t => t.id === templateComunicadoId);
    if (!template) { showToast("Escolha um modelo.", "error"); return; }
    if (!aprovados.length) { showToast("Nenhum participante confirmado.", "warn"); return; }
    setEnviandoComunicado(true);
    try {
      const leads = aprovados.map(p => ({ id: p.id, email: p.email }));
      // Um e-mail por invocação, com pausa entre elas — mesmo lotes de 5
      // estouram o limite de recursos da Edge Function (HTTP 546,
      // "WORKER_LIMIT"); só o envio de teste (1 e-mail) é confiável.
      const TAMANHO_LOTE = 1;
      const enviados = [];
      const falhas = [];
      for (let i = 0; i < leads.length; i += TAMANHO_LOTE) {
        const lote = leads.slice(i, i + TAMANHO_LOTE);
        try {
          const data = await dispararComunicado(template, lote);
          enviados.push(...(data?.sent || []));
          falhas.push(...(data?.failed || []));
        } catch (err) {
          lote.forEach(l => falhas.push({ id: l.id, email: l.email, error: err.message || String(err) }));
        }
        if (i + TAMANHO_LOTE < leads.length) await new Promise(r => setTimeout(r, 500));
      }
      registrarLog("participantes.enviar_comunicado", "participante", null, null, { modelo: template.nome, enviados: enviados.length, falhas: falhas.length });
      if (falhas.length) {
        showToast(`${enviados.length} enviado(s), ${falhas.length} falharam. Veja o console.`, "warn");
        console.warn("Falhas ao enviar comunicado:", falhas);
      } else {
        showToast(`E-mail enviado para ${enviados.length} participante${enviados.length !== 1 ? "s" : ""}!`, "success");
      }
      setModalComunicado(false);
    } catch (err) {
      showToast("Não foi possível enviar via SMTP (" + (err.message || err) + ").", "error");
    } finally {
      setEnviandoComunicado(false);
    }
  }

  async function exportarXLS() {
    const XLSX = await import("xlsx");
    const rows = ordenados.map(p => ({
      ...(colunasVisiveis.numero ? { "Nº": fmtNumero(p.numero_participante) } : {}),
      "Nome": p.nome || "",
      "Tipo": tipoDe(p),
      ...(colunasVisiveis.cpf ? { "CPF": p.cpf || "" } : {}),
      "Instituição": p.instituicao || "",
      ...(colunasVisiveis.cargo ? { "Cargo": p.cargo || "" } : {}),
      ...(colunasVisiveis.email ? { "E-mail": p.email || "" } : {}),
      ...(colunasVisiveis.situacao ? { "Situação": situacaoDe(p) } : {}),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participantes");
    XLSX.writeFile(wb, "participantes-geral.xlsx");
    showToast("Planilha exportada!", "success");
  }

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Geral</h2>
        </div>
        <div style={{ display: "flex", gap: "0.85rem 1.1rem", alignItems: "center", flexWrap: "wrap" }}>
          {COLUNAS_OPCIONAIS.map(c => (
            <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.82rem", cursor: "pointer" }}>
              <input type="checkbox" checked={!!colunasVisiveis[c.key]}
                onChange={e => setColunasVisiveis(v => ({ ...v, [c.key]: e.target.checked }))} />
              {c.label}
            </label>
          ))}
          {algumFiltro && (
            <button className="btn btn-sm btn-outline" onClick={() => setFiltros({})}>Limpar filtros</button>
          )}
          <button className="btn btn-outline" disabled={aprovados.length === 0 || templatesComunicado.length === 0}
            onClick={() => setModalComunicado(true)}
            title={`Enviar Comunicado (${aprovados.length}) — escolha um modelo (Participantes → Modelos) e envie pra todos os aprovados: orientações de véspera, lembretes, avisos.`}>
            <FontAwesomeIcon icon={faEnvelope} />
          </button>
          <button className="btn btn-outline" onClick={exportarXLS} title="Exportar XLS">
            <FontAwesomeIcon icon={faFileExcel} />
          </button>
        </div>
      </div>

      {/* Filtros por coluna — barra própria, visível tanto na tabela (desktop) quanto nos cards (mobile) */}
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
        {colunasAtivas.map(c => (
          <div key={c.key} style={{ flex: "1 1 130px", minWidth: 110 }}>
            <label style={{ display: "block", fontSize: "0.68rem", color: "var(--text3)", marginBottom: 2 }}>{c.label}</label>
            <input
              className="search-input"
              style={{ width: "100%", fontSize: "0.78rem" }}
              placeholder="Filtrar..."
              value={filtros[c.key] || ""}
              onChange={e => setFiltros(f => ({ ...f, [c.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <div className="table-wrap geral-table-wrap">
        <div className="table-header">
          <span className="table-title">Todos ({filtrados.length})</span>
        </div>
        <table style={{ width: "100%", minWidth: 980, fontSize: "0.83rem" }}>
          <thead>
            <tr>
              {colunasAtivas.map(c => (
                <th key={c.key} style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", ...(c.width ? { width: c.width } : {}) }} onClick={() => alternarOrdenacao(c.key)}>
                  {c.label}{setaOrdenacao(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenados.map(p => (
              <tr key={p.id} style={p.ativo === false ? { opacity: 0.55 } : undefined}>
                {colunasAtivas.map(c => (
                  <td key={c.key} style={c.tdStyle}>{c.render ? c.render(p) : c.getValue(p)}</td>
                ))}
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={colunasAtivas.length} style={{ textAlign: "center", padding: "1.5rem", color: "var(--text3)" }}>Nenhum inscrito encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="geral-cards">
        <div className="table-header" style={{ marginBottom: "0.75rem" }}>
          <span className="table-title">Todos ({filtrados.length})</span>
        </div>
        {ordenados.map(p => (
          <div className="credenc-card" key={p.id} style={p.ativo === false ? { opacity: 0.55 } : undefined}>
            <div className="credenc-card-top">
              <div>
                <div className="credenc-card-nome">
                  {colunasVisiveis.numero && <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text3)", marginRight: 6 }}>{fmtNumero(p.numero_participante)}</span>}
                  {p.nome}
                </div>
                {colunasVisiveis.email && <div className="credenc-card-sub">{p.email}</div>}
              </div>
              {colunasVisiveis.situacao && <span className={`badge badge-${p.credenciado ? "success" : "warn"}`} style={{ flexShrink: 0 }}>{situacaoDe(p)}</span>}
            </div>
            <div className="credenc-card-meta">
              {colunasVisiveis.cpf && <span style={{ fontFamily: "monospace" }}>{p.cpf}</span>}
              <span>{p.instituicao}</span>
              {colunasVisiveis.cargo && <span>{p.cargo}</span>}
            </div>
          </div>
        ))}
        {filtrados.length === 0 && (
          <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text3)" }}>Nenhum inscrito encontrado.</div>
        )}
      </div>

      <Modal show={modalComunicado} onClose={() => setModalComunicado(false)} title="Enviar comunicado">
        <div className="form-group">
          <label className="form-label">Modelo</label>
          <select className="form-input" value={templateComunicadoId} onChange={e => setTemplateComunicadoId(e.target.value)}>
            <option value="">Selecione um modelo…</option>
            {templatesComunicado.map(t => (
              <option key={t.id} value={t.id}>{t.nome || "Sem nome"}</option>
            ))}
          </select>
        </div>
        <p style={{ fontSize: "0.9rem", color: "var(--text2)", lineHeight: 1.6, margin: "0.75rem 0 1rem" }}>
          Envia o modelo escolhido para os <strong>{aprovados.length}</strong> inscrito{aprovados.length !== 1 ? "s" : ""} com inscrição aprovada (inclui palestrantes).
        </p>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <input className="form-input" placeholder="seu@email.com" value={emailTesteComunicado}
            onChange={e => setEmailTesteComunicado(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-outline" onClick={enviarTesteComunicado} disabled={enviandoTesteComunicado || !emailTesteComunicado.trim() || !templateComunicadoId}>
            {enviandoTesteComunicado ? "Enviando…" : "Enviar teste"}
          </button>
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--text3)", margin: "0 0 1.25rem" }}>
          Envia só para esse e-mail, sem afetar os {aprovados.length} inscrito{aprovados.length !== 1 ? "s" : ""}. Use pra conferir o modelo antes de disparar pra todo mundo.
        </p>

        <button className="btn btn-primary btn-block" onClick={solicitarComunicado} disabled={enviandoComunicado || !templateComunicadoId || aprovados.length === 0}>
          {enviandoComunicado ? "Enviando…" : `Enviar para ${aprovados.length} pessoa${aprovados.length !== 1 ? "s" : ""}`}
        </button>
      </Modal>
    </div>
  );
}
