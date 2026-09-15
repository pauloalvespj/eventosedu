import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { atualizarCredenciamento, atualizarProfile, registrarLog } from "../../../lib/db";
import { Modal } from "../../base/index";
import { formatCPF, validateCPF } from "../../../utils/helpers";

export function Credenciamento({ participantes, setParticipantes, showToast }) {
  const [busca, setBusca] = useState("");
  const [confirmRemover, setConfirmRemover] = useState(null);
  const [pendencia, setPendencia] = useState(null);

  async function credenciar(id, val, extraUpdates = {}) {
    const credenciado_em = val ? new Date().toISOString() : null;
    const updates = { ...extraUpdates, credenciado: val, credenciado_em };
    setParticipantes(participantes.map(p => p.id === id ? { ...p, ...updates } : p));
    atualizarCredenciamento(id, val);
    const alvo = participantes.find(p => p.id === id);
    registrarLog(val ? "participante.credenciar" : "participante.remover_credenciamento", "participante", id, alvo?.nome);
    showToast(val ? "Participante credenciado!" : "Credenciamento removido", val ? "success" : "info");
  }

  function confirmarRemocao() {
    if (confirmRemover) credenciar(confirmRemover.id, false);
    setConfirmRemover(null);
  }

  function iniciarCredenciamento(p) {
    const faltaCpf = !p.cpf;
    if (!faltaCpf) { credenciar(p.id, true); return; }
    setPendencia({ participante: p, cpf: "", erro: "", salvando: false });
  }

  async function salvarPendenciaECredenciar() {
    const { participante, cpf } = pendencia;
    if (!validateCPF(cpf)) {
      setPendencia(pd => ({ ...pd, erro: "CPF inválido." }));
      return;
    }
    setPendencia(pd => ({ ...pd, salvando: true, erro: "" }));
    const updates = { cpf };
    const { error } = await atualizarProfile(participante.id, updates);
    if (error) {
      setPendencia(pd => ({ ...pd, salvando: false, erro: "Erro ao salvar dados. Tente novamente." }));
      return;
    }
    registrarLog("participante.completar_dados", "participante", participante.id, participante.nome);
    setPendencia(null);
    credenciar(participante.id, true, updates);
  }

  const fmtNumero = (n) => (n == null ? "—" : String(n).padStart(3, "0"));

  // ── Filtros por coluna ───────────────────────────────────────────
  const [filtrosCol, setFiltrosCol] = useState({ numero: "", nome: "", cpf: "", instituicao: "", status: "todos" });
  const algumFiltroCol = filtrosCol.numero || filtrosCol.nome || filtrosCol.cpf || filtrosCol.instituicao || filtrosCol.status !== "todos";

  const filtrados = participantes.filter(p => {
    const q = busca.toLowerCase();
    const okBusca = !q || p.nome.toLowerCase().includes(q) || p.cpf.includes(q) || p.email.toLowerCase().includes(q)
      || fmtNumero(p.numero_participante).includes(q);
    if (!okBusca) return false;
    if (filtrosCol.numero && !fmtNumero(p.numero_participante).toLowerCase().includes(filtrosCol.numero.toLowerCase())) return false;
    if (filtrosCol.nome && !(p.nome.toLowerCase().includes(filtrosCol.nome.toLowerCase()) || (p.email || "").toLowerCase().includes(filtrosCol.nome.toLowerCase()))) return false;
    if (filtrosCol.cpf && !(p.cpf || "").toLowerCase().includes(filtrosCol.cpf.toLowerCase())) return false;
    if (filtrosCol.instituicao && !(p.instituicao || "").toLowerCase().includes(filtrosCol.instituicao.toLowerCase())) return false;
    if (filtrosCol.status === "credenciado" && !p.credenciado) return false;
    if (filtrosCol.status === "aguardando" && p.credenciado) return false;
    return true;
  });

  // ── Ordenação da tabela ─────────────────────────────────────────
  const [ordenacao, setOrdenacao] = useState({ campo: "nome", dir: "asc" });

  function toggleOrdenacao(campo) {
    setOrdenacao(prev => prev.campo === campo ? { campo, dir: prev.dir === "asc" ? "desc" : "asc" } : { campo, dir: "asc" });
  }

  function ThOrdenavel({ campo, children, style }) {
    const ativo = ordenacao.campo === campo;
    return (
      <th style={{ ...style, cursor: "pointer", userSelect: "none" }} onClick={() => toggleOrdenacao(campo)} title="Ordenar">
        {children}{ativo ? (ordenacao.dir === "asc" ? " ▲" : " ▼") : ""}
      </th>
    );
  }

  const filtradosOrdenados = [...filtrados].sort((a, b) => {
    let va, vb;
    switch (ordenacao.campo) {
      case "numero": va = a.numero_participante ?? -1; vb = b.numero_participante ?? -1; break;
      case "cpf": va = a.cpf || ""; vb = b.cpf || ""; break;
      case "instituicao": va = a.instituicao || ""; vb = b.instituicao || ""; break;
      case "status": va = a.credenciado ? 1 : 0; vb = b.credenciado ? 1 : 0; break;
      case "data": va = a.credenciado_em || ""; vb = b.credenciado_em || ""; break;
      default: va = a.nome || ""; vb = b.nome || "";
    }
    const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
    return ordenacao.dir === "asc" ? cmp : -cmp;
  });

  return (
    <div>
      <div className="admin-topbar"><div><h1>Credenciamento</h1><p>Recepção do evento</p></div></div>

      <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
        <h3 style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "1rem" }}>Busca Rápida</h3>
        <input className="form-input" placeholder="Buscar por nome, número, CPF ou e-mail..."
          value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      <div className="table-wrap credenc-table-wrap">
        <div className="table-header">
          <span className="table-title">{participantes.filter(p => p.credenciado).length}/{participantes.length} credenciados</span>
        </div>
        <table>
          <thead>
          <tr>
            <ThOrdenavel campo="numero" style={{ width: 84 }}>Nº</ThOrdenavel>
            <ThOrdenavel campo="nome">Participante</ThOrdenavel>
            <ThOrdenavel campo="cpf">CPF</ThOrdenavel>
            <ThOrdenavel campo="instituicao">Instituição</ThOrdenavel>
            <ThOrdenavel campo="status">Status</ThOrdenavel>
            <ThOrdenavel campo="data">Data/Hora</ThOrdenavel>
            <th>Ação</th>
          </tr>
          <tr>
            <th style={{ padding: "0.3rem 0.4rem", fontWeight: 400 }}>
              <input className="search-input" style={{ width: "100%", fontSize: "0.76rem", padding: "0.25rem 0.5rem" }}
                placeholder="Filtrar..." value={filtrosCol.numero} onChange={e => setFiltrosCol(f => ({ ...f, numero: e.target.value }))} />
            </th>
            <th style={{ padding: "0.3rem 0.4rem", fontWeight: 400 }}>
              <input className="search-input" style={{ width: "100%", fontSize: "0.76rem", padding: "0.25rem 0.5rem" }}
                placeholder="Filtrar..." value={filtrosCol.nome} onChange={e => setFiltrosCol(f => ({ ...f, nome: e.target.value }))} />
            </th>
            <th style={{ padding: "0.3rem 0.4rem", fontWeight: 400 }}>
              <input className="search-input" style={{ width: "100%", fontSize: "0.76rem", padding: "0.25rem 0.5rem" }}
                placeholder="Filtrar..." value={filtrosCol.cpf} onChange={e => setFiltrosCol(f => ({ ...f, cpf: e.target.value }))} />
            </th>
            <th style={{ padding: "0.3rem 0.4rem", fontWeight: 400 }}>
              <input className="search-input" style={{ width: "100%", fontSize: "0.76rem", padding: "0.25rem 0.5rem" }}
                placeholder="Filtrar..." value={filtrosCol.instituicao} onChange={e => setFiltrosCol(f => ({ ...f, instituicao: e.target.value }))} />
            </th>
            <th style={{ padding: "0.3rem 0.4rem", fontWeight: 400 }}>
              <select className="search-input" style={{ width: "100%", fontSize: "0.76rem", padding: "0.25rem 0.5rem" }}
                value={filtrosCol.status} onChange={e => setFiltrosCol(f => ({ ...f, status: e.target.value }))}>
                <option value="todos">Todos</option>
                <option value="credenciado">Credenciado</option>
                <option value="aguardando">Aguardando</option>
              </select>
            </th>
            <th></th>
            <th>
              {algumFiltroCol && <button className="btn btn-sm btn-outline" style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }} onClick={() => setFiltrosCol({ numero: "", nome: "", cpf: "", instituicao: "", status: "todos" })}>Limpar</button>}
            </th>
          </tr>
          </thead>
          <tbody>
            {filtradosOrdenados.map(p => {
              const dt = p.credenciado_em ? new Date(p.credenciado_em) : null;
              const dataHora = dt ? dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "–";
              return (
              <tr key={p.id}>
                <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--text2)", textAlign: "center" }}>{fmtNumero(p.numero_participante)}</td>
                <td><div>
                  <div style={{ fontWeight: 600 }}>{p.nome}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text3)" }}>{p.email}</div>
                </div></td>
                <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{p.cpf}</td>
                <td>{p.instituicao}</td>
                <td><span className={`badge badge-${p.credenciado ? "success" : "warn"}`}>{p.credenciado ? <><FontAwesomeIcon icon={faCheck} style={{ marginRight: 4 }} />Credenciado</> : "Aguardando"}</span></td>
                <td style={{ fontSize: "0.82rem", color: p.credenciado ? "var(--text2)" : "var(--text3)" }}>{dataHora}</td>
                <td>
                  {p.credenciado
                    ? <button className="btn btn-sm btn-outline" onClick={() => setConfirmRemover(p)}>Remover</button>
                    : <button className="btn btn-sm btn-success" onClick={() => iniciarCredenciamento(p)}><FontAwesomeIcon icon={faCheck} style={{ marginRight: 6 }} />Credenciar</button>}
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>

      <div className="credenc-cards">
        <div className="table-header" style={{ marginBottom: "0.75rem" }}>
          <span className="table-title">{participantes.filter(p => p.credenciado).length}/{participantes.length} credenciados</span>
        </div>
        {filtradosOrdenados.map(p => {
          const dt = p.credenciado_em ? new Date(p.credenciado_em) : null;
          const dataHora = dt ? dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;
          return (
            <div className="credenc-card" key={p.id}>
              <div className="credenc-card-top">
                <div>
                  <div className="credenc-card-nome">
                    <span style={{ fontFamily: "monospace", color: "var(--text3)", marginRight: 6 }}>{fmtNumero(p.numero_participante)}</span>
                    {p.nome}
                  </div>
                  <div className="credenc-card-sub">{p.email}</div>
                </div>
                <span className={`badge badge-${p.credenciado ? "success" : "warn"}`} style={{ flexShrink: 0 }}>
                  {p.credenciado ? <><FontAwesomeIcon icon={faCheck} style={{ marginRight: 4 }} />Credenciado</> : "Aguardando"}
                </span>
              </div>
              <div className="credenc-card-meta">
                <span style={{ fontFamily: "monospace" }}>{p.cpf}</span>
                <span>{p.instituicao}</span>
              </div>
              {dataHora && <div className="credenc-card-data">{dataHora}</div>}
              <div className="credenc-card-actions">
                {p.credenciado
                  ? <button className="btn btn-sm btn-outline" onClick={() => setConfirmRemover(p)}>Remover credenciamento</button>
                  : <button className="btn btn-sm btn-success" onClick={() => iniciarCredenciamento(p)}><FontAwesomeIcon icon={faCheck} style={{ marginRight: 6 }} />Credenciar</button>}
              </div>
            </div>
          );
        })}
      </div>

      <Modal show={!!confirmRemover} onClose={() => setConfirmRemover(null)} title="Remover credenciamento">
        <p style={{ color: "var(--text2)", marginBottom: "1.5rem" }}>
          Tem certeza que deseja remover o credenciamento de <strong>{confirmRemover?.nome}</strong>?
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button className="btn btn-outline" onClick={() => setConfirmRemover(null)}>Cancelar</button>
          <button className="btn btn-danger" onClick={confirmarRemocao}>Remover</button>
        </div>
      </Modal>

      <Modal show={!!pendencia} onClose={() => setPendencia(null)} title="Completar cadastro">
        <div style={{ fontSize: "0.8rem", color: "var(--text3)", marginTop: "-0.75rem", marginBottom: "1.25rem" }}>{pendencia?.participante.nome}</div>
        <p style={{ color: "var(--text2)", fontSize: "0.88rem", marginBottom: "1rem" }}>
          Para credenciar, informe o CPF abaixo:
        </p>
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="form-label">CPF *</label>
            <input className="form-input" placeholder="000.000.000-00" maxLength={14}
              value={pendencia?.cpf || ""} onChange={e => setPendencia(pd => ({ ...pd, cpf: formatCPF(e.target.value) }))} />
          </div>
        </div>
        {pendencia?.erro && <div className="form-error" style={{ marginBottom: "0.75rem" }}>{pendencia.erro}</div>}
        <button className="btn btn-primary btn-block" style={{ marginTop: "0.5rem" }} onClick={salvarPendenciaECredenciar} disabled={pendencia?.salvando}>
          {pendencia?.salvando ? "Salvando..." : "Salvar e credenciar"}
        </button>
      </Modal>
    </div>
  );
}
