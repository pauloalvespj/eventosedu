import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faPenToSquare, faTrash, faEye, faEyeSlash, faArrowUp, faArrowDown,
  faPaperPlane, faDownload, faChartBar,
} from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal } from "../../base/index";
import { supabase } from "../../../lib/supabase";
import { baixarCSV, calcPresenca } from "../../../utils/helpers";
import { gerarTemplateHTMLPesquisa, DEFAULT_MENSAGEM_PESQUISA } from "../../../lib/emailTemplate";
import {
  fetchPerguntasPesquisa, inserirPerguntaPesquisa, atualizarPerguntaPesquisa, deletarPerguntaPesquisa,
  fetchRespostasPesquisa, atualizarEvento,
} from "../../../lib/db";

const TEMPLATE_DEFAULTS = {
  assunto: "", mensagem: DEFAULT_MENSAGEM_PESQUISA, bannerUrl: "",
  corCabecalho: "#0a1f40", corRodape: "#0a1f40", corBotao: "#0a1f40",
};

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

function AbaPerguntas({ event, setEvent, perguntas, setPerguntas, showToast }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [intro, setIntro] = useState(event.pesquisa_intro || "");

  function abrirNova() {
    setForm({ tipo: "fechada", texto: "", opcoes: "", obrigatoria: true });
    setModal(true);
  }
  function abrirEditar(p) {
    setForm({ ...p, opcoes: (p.opcoes || []).join("\n") });
    setModal(true);
  }

  async function salvarPergunta() {
    if (!form.texto?.trim()) { showToast("Texto da pergunta obrigatório", "error"); return; }
    const opcoesArr = form.tipo === "fechada"
      ? form.opcoes.split("\n").map(o => o.trim()).filter(Boolean)
      : [];
    if (form.tipo === "fechada" && opcoesArr.length < 2) {
      showToast("Adicione ao menos 2 opções", "error"); return;
    }
    const dados = { texto: form.texto.trim(), tipo: form.tipo, opcoes: opcoesArr, obrigatoria: !!form.obrigatoria };
    if (form.id) {
      setPerguntas(prev => prev.map(p => p.id === form.id ? { ...p, ...dados } : p));
      await atualizarPerguntaPesquisa(form.id, dados);
    } else {
      const ordem = perguntas.length ? Math.max(...perguntas.map(p => p.ordem)) + 1 : 0;
      const { data } = await inserirPerguntaPesquisa({ ...dados, ordem, event_id: event.id });
      if (data) setPerguntas(prev => [...prev, data]);
    }
    setModal(false);
    showToast("Pergunta salva!", "success");
  }

  async function excluir(id) {
    if (!confirm("Excluir pergunta? As respostas já dadas também são apagadas.")) return;
    setPerguntas(prev => prev.filter(p => p.id !== id));
    await deletarPerguntaPesquisa(id);
    showToast("Pergunta excluída", "info");
  }

  async function mover(id, dir) {
    const ordenadas = [...perguntas].sort((a, b) => a.ordem - b.ordem);
    const idx = ordenadas.findIndex(p => p.id === id);
    const alvo = dir === "up" ? idx - 1 : idx + 1;
    if (alvo < 0 || alvo >= ordenadas.length) return;
    const a = ordenadas[idx], b = ordenadas[alvo];
    setPerguntas(prev => prev.map(p => p.id === a.id ? { ...p, ordem: b.ordem } : p.id === b.id ? { ...p, ordem: a.ordem } : p));
    await Promise.all([
      atualizarPerguntaPesquisa(a.id, { ordem: b.ordem }),
      atualizarPerguntaPesquisa(b.id, { ordem: a.ordem }),
    ]);
  }

  async function toggleAtiva() {
    const novo = !event.pesquisa_ativa;
    setEvent(ev => ({ ...ev, pesquisa_ativa: novo }));
    await atualizarEvento(event.id, { pesquisa_ativa: novo });
    showToast(novo ? "Pesquisa liberada para os participantes!" : "Pesquisa ocultada.", novo ? "success" : "info");
  }

  async function salvarIntro() {
    setEvent(ev => ({ ...ev, pesquisa_intro: intro }));
    await atualizarEvento(event.id, { pesquisa_intro: intro });
    showToast("Introdução salva!", "success");
  }

  const ordenadas = [...perguntas].sort((a, b) => a.ordem - b.ordem);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <button className={`btn btn-sm ${event.pesquisa_ativa ? "btn-outline" : "btn-danger"}`} onClick={toggleAtiva}>
          <FontAwesomeIcon icon={event.pesquisa_ativa ? faEye : faEyeSlash} style={{ marginRight: 6 }} />
          {event.pesquisa_ativa ? "Pesquisa liberada" : "Pesquisa oculta"}
        </button>
        <button className="btn btn-sm btn-primary" onClick={abrirNova}>
          <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Nova Pergunta
        </button>
      </div>

      <div className="form-group" style={{ marginBottom: "1.5rem" }}>
        <label className="form-label">Texto de introdução (aparece no topo do formulário)</label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <textarea className="form-input" rows={2} value={intro} onChange={e => setIntro(e.target.value)}
            placeholder="Ex: Sua opinião nos ajuda a melhorar os próximos eventos." />
          <button className="btn btn-sm btn-outline" style={{ flexShrink: 0, height: "fit-content" }} onClick={salvarIntro}>Salvar</button>
        </div>
      </div>

      {ordenadas.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text3)", background: "var(--surface)", borderRadius: "var(--radius)", border: "1px dashed var(--border2)" }}>
          Nenhuma pergunta cadastrada ainda.
        </div>
      )}

      {ordenadas.map((p, i) => (
        <div key={p.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1rem 1.25rem", marginBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span className={`badge badge-${p.tipo === "fechada" ? "navy" : "teal"}`}>{p.tipo === "fechada" ? "Fechada" : "Aberta"}</span>
              {p.obrigatoria && <span className="badge badge-warn">Obrigatória</span>}
            </div>
            <div style={{ fontWeight: 600, color: "var(--text)" }}>{p.texto}</div>
            {p.tipo === "fechada" && (
              <div style={{ fontSize: "0.8rem", color: "var(--text3)", marginTop: 4 }}>{(p.opcoes || []).join(" · ")}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
            <button className="btn btn-sm btn-outline" disabled={i === 0} onClick={() => mover(p.id, "up")} title="Mover para cima"><FontAwesomeIcon icon={faArrowUp} /></button>
            <button className="btn btn-sm btn-outline" disabled={i === ordenadas.length - 1} onClick={() => mover(p.id, "down")} title="Mover para baixo"><FontAwesomeIcon icon={faArrowDown} /></button>
            <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(p)}><FontAwesomeIcon icon={faPenToSquare} /></button>
            <button className="btn btn-sm btn-danger" onClick={() => excluir(p.id)}><FontAwesomeIcon icon={faTrash} /></button>
          </div>
        </div>
      ))}

      <Modal show={modal} onClose={() => setModal(false)} title={form.id ? "Editar Pergunta" : "Nova Pergunta"}>
        <div className="form-group">
          <label className="form-label">Tipo</label>
          <select className="form-input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
            <option value="fechada">Fechada (opções pré-definidas)</option>
            <option value="aberta">Aberta (texto livre)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Pergunta *</label>
          <textarea className="form-input" rows={2} value={form.texto || ""} onChange={e => setForm(f => ({ ...f, texto: e.target.value }))} />
        </div>
        {form.tipo === "fechada" && (
          <div className="form-group">
            <label className="form-label">Opções de resposta (uma por linha) *</label>
            <textarea className="form-input" rows={4} placeholder={"Ex:\nÓtimo\nBom\nRegular\nRuim"}
              value={form.opcoes || ""} onChange={e => setForm(f => ({ ...f, opcoes: e.target.value }))} />
          </div>
        )}
        <div className="form-group">
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={!!form.obrigatoria} onChange={e => setForm(f => ({ ...f, obrigatoria: e.target.checked }))} />
            Resposta obrigatória
          </label>
        </div>
        <button className="btn btn-primary btn-block" onClick={salvarPergunta}>Salvar</button>
      </Modal>
    </div>
  );
}

function AbaEnviar({ event, setEvent, participantes, showToast }) {
  const { atividades, presencas, turnos, presencasTurno } = useAdmin();
  const [template, setTemplate] = useState({ ...TEMPLATE_DEFAULTS, ...(event.pesquisa_template || {}) });
  const [selecionados, setSelecionados] = useState(() => new Set(participantes.filter(p => p.ativo !== false).map(p => p.id)));
  const [busca, setBusca] = useState("");
  const [filtroOrgao, setFiltroOrgao] = useState("");
  const [somenteElegiveis, setSomenteElegiveis] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function set(k, v) { setTemplate(t => ({ ...t, [k]: v })); }

  const orgaos = [...new Set(participantes.map(p => p.instituicao).filter(Boolean))].sort();

  function pctPresenca(p) {
    return calcPresenca(p.id, atividades, presencas, event, turnos, presencasTurno).pct;
  }

  const filtrados = participantes.filter(p => {
    if (p.ativo === false) return false;
    if (busca.trim() && !p.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroOrgao && p.instituicao !== filtroOrgao) return false;
    if (somenteElegiveis && pctPresenca(p) < 50) return false;
    return true;
  });

  function toggleSel(id) {
    setSelecionados(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function selecionarTodos() { setSelecionados(new Set(filtrados.map(p => p.id))); }
  function limparSelecao() { setSelecionados(new Set()); }

  async function salvarTemplate() {
    setSalvando(true);
    await atualizarEvento(event.id, { pesquisa_template: template });
    setEvent(ev => ({ ...ev, pesquisa_template: template }));
    setSalvando(false);
    showToast("Modelo salvo!", "success");
  }

  async function enviar() {
    const ids = [...selecionados];
    if (!ids.length) { showToast("Selecione ao menos um participante.", "warn"); return; }
    setEnviando(true);
    try {
      const destinatarios = participantes.filter(p => ids.includes(p.id)).map(p => ({ id: p.id, email: p.email }));
      const { data: { session } } = await supabase.auth.getSession();
      const pesquisaUrl = `${window.location.origin}/painel?aba=pesquisa`;
      const { data, error } = await supabase.functions.invoke("enviar-pesquisa", {
        body: { destinatarios, event, pesquisaUrl, ...template },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const enviados = data?.sent || [];
      const falhas = data?.failed || [];
      if (falhas.length) {
        showToast(`${enviados.length} enviado(s), ${falhas.length} falharam. Veja o console.`, "warn");
        console.warn("Falhas ao enviar pesquisa:", falhas);
      } else {
        showToast(`Pesquisa enviada para ${enviados.length} participante${enviados.length !== 1 ? "s" : ""}!`, "success");
      }
    } catch (err) {
      showToast("Não foi possível enviar via SMTP (" + (err.message || err) + ").", "error");
    } finally {
      setEnviando(false);
    }
  }

  function htmlPreview() {
    return gerarTemplateHTMLPesquisa({
      event: event || {}, bannerUrl: template.bannerUrl,
      pesquisaUrl: `${window.location.origin}/painel?aba=pesquisa`,
      assunto: template.assunto, mensagem: template.mensagem,
      corCabecalho: template.corCabecalho, corRodape: template.corRodape, corBotao: template.corBotao,
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
      <div>
        <div className="form-group">
          <label className="form-label">Assunto</label>
          <input className="form-input" placeholder={`Pesquisa de Satisfação — ${event?.nome || "Evento"}`}
            value={template.assunto} onChange={e => set("assunto", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Mensagem</label>
          <textarea className="form-input" rows={4} value={template.mensagem} onChange={e => set("mensagem", e.target.value)} />
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
              <input type="checkbox" checked={somenteElegiveis} onChange={e => setSomenteElegiveis(e.target.checked)} />
              Só elegíveis (≥50% de presença)
            </label>
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {filtrados.map(p => (
              <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.5rem 1rem", fontSize: "0.85rem", cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
                <input type="checkbox" checked={selecionados.has(p.id)} onChange={() => toggleSel(p.id)} />
                <span style={{ flex: 1 }}>{p.nome}</span>
                <span className={`badge badge-${pctPresenca(p) >= 50 ? "success" : "warn"}`} style={{ fontSize: "0.68rem" }}>{pctPresenca(p)}%</span>
                <span style={{ color: "var(--text3)", fontSize: "0.78rem" }}>{p.email}</span>
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
          <iframe title="preview-pesquisa" srcDoc={htmlPreview()} style={{ width: "100%", height: 600, border: 0, display: "block" }} sandbox="allow-same-origin" />
        </div>
      </div>
    </div>
  );
}

function AbaResultados({ perguntas, participantes, showToast }) {
  const [respostas, setRespostas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRespostasPesquisa().then(({ data }) => { setRespostas(data); setLoading(false); });
  }, []);

  const ordenadas = [...perguntas].sort((a, b) => a.ordem - b.ordem);
  const totalRespondentes = new Set(respostas.map(r => r.participante_id)).size;

  function exportar() {
    const header = "Participante,Pergunta,Resposta\n";
    const rows = respostas.map(r => {
      const p = perguntas.find(x => x.id === r.pergunta_id);
      const part = participantes.find(x => x.id === r.participante_id);
      const resp = r.resposta_opcao || r.resposta_texto || "";
      return `"${part?.nome || r.participante_id}","${p?.texto || ""}","${resp.replace(/"/g, '""')}"`;
    }).join("\n");
    baixarCSV("respostas_pesquisa.csv", header + rows);
    showToast("Exportado!", "success");
  }

  if (loading) return <div style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>Carregando…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <span style={{ fontSize: "0.88rem", color: "var(--text2)" }}>{totalRespondentes} participante{totalRespondentes !== 1 ? "s" : ""} respondeu{totalRespondentes !== 1 ? "ram" : ""} a pesquisa</span>
        <button className="btn btn-sm btn-outline" onClick={exportar}><FontAwesomeIcon icon={faDownload} style={{ marginRight: 6 }} />Exportar CSV</button>
      </div>

      {ordenadas.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text3)" }}>Nenhuma pergunta cadastrada.</div>
      )}

      {ordenadas.map(p => {
        const respsPergunta = respostas.filter(r => r.pergunta_id === p.id);
        return (
          <div key={p.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem", marginBottom: "1rem" }}>
            <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "0.25rem" }}>{p.texto}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text3)", marginBottom: "1rem" }}>{respsPergunta.length} resposta{respsPergunta.length !== 1 ? "s" : ""}</div>
            {p.tipo === "fechada" ? (
              <div>
                {(p.opcoes || []).map(op => {
                  const cnt = respsPergunta.filter(r => r.resposta_opcao === op).length;
                  const pct = respsPergunta.length ? Math.round((cnt / respsPergunta.length) * 100) : 0;
                  return (
                    <div key={op} style={{ marginBottom: "0.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 3 }}>
                        <span>{op}</span><span style={{ color: "var(--text3)" }}>{cnt} ({pct}%)</span>
                      </div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 240, overflowY: "auto" }}>
                {respsPergunta.length === 0 && <span style={{ fontSize: "0.82rem", color: "var(--text3)" }}>Nenhuma resposta ainda.</span>}
                {respsPergunta.map(r => {
                  const part = participantes.find(x => x.id === r.participante_id);
                  return (
                    <div key={r.id} style={{ fontSize: "0.85rem", background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: "0.5rem 0.75rem" }}>
                      <div style={{ fontWeight: 600, fontSize: "0.75rem", color: "var(--text3)", marginBottom: 2 }}>{part?.nome || "—"}</div>
                      {r.resposta_texto}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PesquisaSatisfacao() {
  const { event, setEvent, participantes, showToast } = useAdmin();
  const [aba, setAba] = useState("perguntas");
  const [perguntas, setPerguntas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerguntasPesquisa().then(({ data }) => { setPerguntas(data); setLoading(false); });
  }, []);

  const TABS = [
    ["perguntas", "Perguntas", faPenToSquare],
    ["enviar", "Enviar", faPaperPlane],
    ["resultados", "Resultados", faChartBar],
  ];

  return (
    <div>
      <div className="admin-subtabs">
        {TABS.map(([key, label, icon]) => (
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

      {loading ? <div style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>Carregando…</div> : (
        <>
          {aba === "perguntas" && <AbaPerguntas event={event} setEvent={setEvent} perguntas={perguntas} setPerguntas={setPerguntas} showToast={showToast} />}
          {aba === "enviar" && <AbaEnviar event={event} setEvent={setEvent} participantes={participantes} showToast={showToast} />}
          {aba === "resultados" && <AbaResultados perguntas={perguntas} participantes={participantes} showToast={showToast} />}
        </>
      )}
    </div>
  );
}
