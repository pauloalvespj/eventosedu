import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faPenToSquare, faTrash, faFloppyDisk, faRotateLeft, faCheck, faXmark, faDownload, faTriangleExclamation, faIdBadge } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "../AdminContext";
import { Modal, AvatarUpload, RoleBadge } from "../../../base/index";
import { InstSelect } from "../InstSelect";
import { atualizarProfile, deletarParticipante, adminCriarUsuario, reativarInscricao, atualizarEmailAuth, registrarLog } from "../../../../lib/db";
import { baixarCSV, erroFuncaoEdge } from "../../../../utils/helpers";
import { supabase } from "../../../../lib/supabase";

const ROLE_OPTS = [
  { value: "participante", label: "Participante" },
  { value: "palestrante",  label: "Palestrante" },
  { value: "credenciador", label: "Credenciador" },
  { value: "admin",        label: "Administrador" },
];

export function AbaInscritos() {
  const { event, participantes, setParticipantes, instituicoes, setInstituicoes, showToast } = useAdmin();
  const [modalAtualizacao, setModalAtualizacao]   = useState(false);
  const [enviandoAtualizacao, setEnviandoAtualizacao] = useState(false);
  const [emailTeste, setEmailTeste]               = useState("pauloalvespj@ufc.br");
  const [enviandoTeste, setEnviandoTeste]         = useState(false);
  const [busca, setBusca]               = useState("");
  const [filtroRole, setFiltroRole]     = useState("todos");
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [mostrarPendentes, setMostrarPendentes]   = useState(false); // fila de aprovação (limite de inscrições)
  const [mostrarIncompletos, setMostrarIncompletos] = useState(false); // cadastro sem CPF/órgão/cargo/nome publico
  const [mostrarCompletos, setMostrarCompletos]     = useState(false);
  const [modalPart, setModalPart]       = useState(null);
  const [formPart, setFormPart]         = useState({});
  const [reativando, setReativando]     = useState(null);
  const [aprovando, setAprovando]       = useState(null);
  const [ordenacao, setOrdenacao]       = useState({ campo: null, dir: "asc" });

  function estaIncompleto(p) {
    return !p.cpf || !p.instituicao || !p.cargo || !p.nome_publico || (p.nome || "").trim().split(/\s+/).filter(Boolean).length < 2;
  }

  function corAvatarBorda(p) {
    if (p.role === "admin") return "var(--gold, #c9a84c)";
    if (p.is_credenciador) return "#22c55e";
    if (p.is_palestrante) return "#ef4444";
    return null;
  }

  function camposFaltando(p) {
    const faltando = [];
    if ((p.nome || "").trim().split(/\s+/).filter(Boolean).length < 2) faltando.push("Nome completo");
    if (!p.nome_publico) faltando.push("Nome para crachá");
    if (!p.cpf) faltando.push("CPF");
    if (!p.instituicao) faltando.push("Instituição");
    if (!p.cargo) faltando.push("Cargo");
    return faltando;
  }

  const totPendentes = participantes.filter(p => p.status_inscricao === "pendente" && p.ativo !== false).length;

  const filtrados = participantes.filter(p => {
    const q = busca.toLowerCase();
    const ok = !q || p.nome?.toLowerCase().includes(q) || p.cpf?.includes(q)
      || p.instituicao?.toLowerCase().includes(q) || p.cargo?.toLowerCase().includes(q)
      || p.email?.toLowerCase().includes(q);
    const cancelado = p.ativo === false;
    const pendenteAprovacao = p.status_inscricao === "pendente" && !cancelado;
    const incompleto = !cancelado && estaIncompleto(p);
    const roleMatch = filtroRole === "todos"
      || (filtroRole === "participante" && p.role === "participante")
      || (filtroRole === "admin" && p.role === "admin")
      || (filtroRole === "credenciador" && p.is_credenciador)
      || (filtroRole === "palestrante" && p.is_palestrante);
    if (mostrarCancelados)   return ok && roleMatch && cancelado;
    if (mostrarPendentes)    return ok && pendenteAprovacao;
    if (mostrarIncompletos)  return ok && incompleto;
    if (mostrarCompletos)    return ok && roleMatch && !cancelado && !pendenteAprovacao && !incompleto;
    return ok && roleMatch && !cancelado && !pendenteAprovacao;
  });

  async function aprovar(p) {
    setAprovando(p.id);
    setParticipantes(participantes.map(x => x.id === p.id ? { ...x, status_inscricao: "aprovado" } : x));
    await atualizarProfile(p.id, { status_inscricao: "aprovado" });
    setAprovando(null);
    showToast(`Inscrição de ${p.nome.split(" ")[0]} aprovada!`, "success");
  }

  async function recusar(p) {
    if (!confirm(`Recusar a inscrição de "${p.nome}"?`)) return;
    setAprovando(p.id);
    setParticipantes(participantes.map(x => x.id === p.id ? { ...x, status_inscricao: "recusado" } : x));
    await atualizarProfile(p.id, { status_inscricao: "recusado" });
    setAprovando(null);
    showToast(`Inscrição de ${p.nome.split(" ")[0]} recusada.`, "info");
  }

  function alternarOrdenacao(campo) {
    setOrdenacao(o => o.campo === campo ? { campo, dir: o.dir === "asc" ? "desc" : "asc" } : { campo, dir: "asc" });
  }

  const ordenados = ordenacao.campo
    ? [...filtrados].sort((a, b) => {
        const cmp = (a[ordenacao.campo] || "").toString().localeCompare((b[ordenacao.campo] || "").toString(), "pt-BR", { sensitivity: "base" });
        return ordenacao.dir === "asc" ? cmp : -cmp;
      })
    : filtrados;

  function setaOrdenacao(campo) {
    if (ordenacao.campo !== campo) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{ordenacao.dir === "asc" ? "↑" : "↓"}</span>;
  }

  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!formPart.nome) { showToast("Nome obrigatório", "error"); return; }
    const _pal  = !!formPart._palestrante;
    const _adm  = !!formPart._admin;
    const _cred = !!formPart._credenciador;
    const role           = _adm ? "admin" : "participante";
    const is_palestrante = _pal;
    const is_credenciador = _cred;
    if (modalPart === "new") {
      if (!formPart.email) { showToast("E-mail obrigatório para criar acesso", "error"); return; }
      setSalvando(true);
      const { data, error } = await adminCriarUsuario({
        nome: formPart.nome,
        email: formPart.email,
        cpf: formPart.cpf,
        cargo: formPart.cargo,
        instituicao: formPart.instituicao,
        role,
        senha: formPart.senha,
        is_palestrante,
        is_credenciador,
      });
      setSalvando(false);
      if (error) {
        showToast("Erro ao criar usuário: " + (error.message || JSON.stringify(error)), "error");
        return;
      }
      setParticipantes([...participantes, { ...data.user, is_palestrante, is_credenciador }]);
      if (role === "admin" || is_credenciador) {
        registrarLog("usuario.criar", "participante", data.user.id, formPart.nome, { role, is_credenciador });
      }
      showToast("Inscrito criado com acesso ao sistema!", "success");
    } else {
      const original = participantes.find(p => p.id === formPart.id);
      setSalvando(true);
      const emailNovo = formPart.email?.trim().toLowerCase();
      const emailOriginal = original?.email?.trim().toLowerCase();
      if (emailNovo && emailNovo !== emailOriginal) {
        const { error: emailErr } = await atualizarEmailAuth(formPart.id, emailNovo);
        if (emailErr) {
          setSalvando(false);
          showToast("Erro ao atualizar e-mail: " + (emailErr.message || JSON.stringify(emailErr)), "error");
          return;
        }
        await atualizarProfile(formPart.id, { email: emailNovo });
      }
      const { error: updErr } = await atualizarProfile(formPart.id, { nome: formPart.nome, nome_publico: formPart.nome_publico, cpf: formPart.cpf, instituicao: formPart.instituicao, cargo: formPart.cargo, role, is_palestrante, is_credenciador });
      setSalvando(false);
      if (updErr) {
        showToast("Erro ao salvar inscrito: " + (updErr.message || JSON.stringify(updErr)), "error");
        return;
      }
      setParticipantes(participantes.map(x => x.id === formPart.id ? { ...x, ...formPart, role, is_palestrante, is_credenciador } : x));
      if (original && (original.role !== role || !!original.is_credenciador !== is_credenciador)) {
        registrarLog("usuario.editar_role", "participante", formPart.id, formPart.nome, { role_antes: original.role, role_depois: role, credenciador_antes: !!original.is_credenciador, credenciador_depois: is_credenciador });
      }
      showToast("Inscrito atualizado!", "success");
    }
    setModalPart(null);
  }

  async function handleReativar(p) {
    setReativando(p.id);
    const { error } = await reativarInscricao(p.id);
    setReativando(null);
    if (error) { showToast("Erro ao reativar: " + error.message, "error"); return; }
    setParticipantes(participantes.map(x => x.id === p.id ? { ...x, ativo: true } : x));
    showToast(`Inscrição de ${p.nome.split(" ")[0]} reativada.`, "success");
  }

  const totP = participantes.filter(p => p.ativo !== false).length;
  const totCancelados = participantes.filter(p => p.ativo === false).length;
  const incompletos = participantes.filter(p => p.ativo !== false && estaIncompleto(p));
  const completos = participantes.filter(p => p.ativo !== false && p.status_inscricao !== "pendente" && !estaIncompleto(p));

  async function dispararAtualizacaoCadastro(leads) {
    const template = (event.convite_templates || []).find(t => t.id === "tpl-atualizacao-cadastro");
    if (!template) { showToast("Modelo 'Atualização de Cadastro' não encontrado em Modelos de E-mail.", "error"); return null; }
    // O CTA desse modelo é login, não inscrição — se o admin não preencheu,
    // usa a página de login do próprio site (não a home com modal).
    const inscricaoUrl = template.inscricaoUrl || `${window.location.origin}/login`;
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("enviar-convite", {
      body: {
        leads, event,
        bannerUrl: template.bannerUrl, inscricaoUrl,
        assunto: template.assunto, mensagem: template.mensagem,
        corCabecalho: template.corCabecalho, corRodape: template.corRodape, corBotao: template.corBotao,
        ctaTexto: template.ctaTexto,
        // Gera um link de login direto por pessoa (magic link) — quem já tem
        // conta clica e já entra logado, sem passar pelo formulário de novo.
        magicLink: true, origin: window.location.origin,
      },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (error) throw new Error(await erroFuncaoEdge(error));
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function solicitarAtualizacaoCadastro() {
    if (!incompletos.length) { showToast("Nenhum participante com dado faltando.", "warn"); return; }
    setEnviandoAtualizacao(true);
    try {
      const leads = incompletos.map(p => ({ id: p.id, email: p.email }));
      const data = await dispararAtualizacaoCadastro(leads);
      if (!data) return;
      const enviados = data.sent || [];
      const falhas = data.failed || [];
      registrarLog("participantes.solicitar_atualizacao", "participante", null, null, { enviados: enviados.length, falhas: falhas.length });
      if (falhas.length) {
        showToast(`${enviados.length} enviado(s), ${falhas.length} falharam. Veja o console.`, "warn");
        console.warn("Falhas ao enviar solicitação de atualização:", falhas);
      } else {
        showToast(`E-mail enviado para ${enviados.length} participante${enviados.length !== 1 ? "s" : ""}!`, "success");
      }
      setModalAtualizacao(false);
    } catch (err) {
      showToast("Não foi possível enviar via SMTP (" + (err.message || err) + ").", "error");
    } finally {
      setEnviandoAtualizacao(false);
    }
  }

  async function enviarTesteAtualizacao() {
    const email = emailTeste.trim();
    if (!email) { showToast("Informe um e-mail para o teste.", "error"); return; }
    setEnviandoTeste(true);
    try {
      const data = await dispararAtualizacaoCadastro([{ id: "teste", email }]);
      if (!data) return;
      if (data.failed?.length) {
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

  function exportarCSV() {
    const header = "Nome,Instituição,Cargo\n";
    const rows = participantes.map(p => `"${p.nome || ""}","${p.instituicao || ""}","${p.cargo || ""}"`).join("\n");
    baixarCSV("participantes.csv", header + rows);
    showToast("Lista exportada!", "success");
  }

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Inscrições</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text3)" }}>
            {totP} inscrito{totP !== 1 ? "s" : ""}
            {totCancelados > 0 && <span style={{ color: "var(--danger, #c0392b)", marginLeft: 6 }}>· {totCancelados} cancelado{totCancelados !== 1 ? "s" : ""}</span>}
            {totPendentes > 0 && <span style={{ color: "var(--warn, #a07020)", marginLeft: 6 }}>· {totPendentes} pendente{totPendentes !== 1 ? "s" : ""} de aprovação</span>}
            {incompletos.length > 0 && <span style={{ color: "var(--warn, #a07020)", marginLeft: 6 }}>· {incompletos.length} com cadastro incompleto</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button className="btn btn-outline" onClick={exportarCSV}>
          <FontAwesomeIcon icon={faDownload} style={{ marginRight: 6 }} />Exportar CSV
        </button>
        <button className="btn btn-primary" onClick={() => {
          setFormPart({ nome: "", cpf: "", email: "", instituicao: "", cargo: "", _palestrante: false, _admin: false, _credenciador: false });
          setModalPart("new");
        }}>
          <FontAwesomeIcon icon={faUsers} style={{ marginRight: 6 }} />Novo Inscrito
        </button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Inscritos ({filtrados.length})</span>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              className={`btn btn-sm ${mostrarPendentes ? "btn-gold" : "btn-outline"}`}
              onClick={() => { setMostrarPendentes(v => !v); setMostrarCancelados(false); setMostrarIncompletos(false); setMostrarCompletos(false); }}
              title="Exibir inscrições pendentes de aprovação (fila do limite de inscrições)"
              style={{ whiteSpace: "nowrap" }}
            >
              {mostrarPendentes ? "Ver todos" : `Aprovação pendente${totPendentes > 0 ? ` (${totPendentes})` : ""}`}
            </button>
            <button
              className={`btn btn-sm ${mostrarIncompletos ? "btn-gold" : "btn-outline"}`}
              onClick={() => { setMostrarIncompletos(v => !v); setMostrarCancelados(false); setMostrarPendentes(false); setMostrarCompletos(false); }}
              title="Exibir inscritos sem CPF, órgão, cargo ou nome para crachá preenchido"
              style={{ whiteSpace: "nowrap" }}
            >
              {mostrarIncompletos ? "Ver todos" : `Incompleto${incompletos.length > 0 ? ` (${incompletos.length})` : ""}`}
            </button>
            <button
              className={`btn btn-sm ${mostrarCompletos ? "btn-gold" : "btn-outline"}`}
              onClick={() => { setMostrarCompletos(v => !v); setMostrarCancelados(false); setMostrarPendentes(false); setMostrarIncompletos(false); }}
              title="Exibir inscritos com cadastro completo (CPF, órgão, cargo e nome para crachá preenchidos)"
              style={{ whiteSpace: "nowrap" }}
            >
              {mostrarCompletos ? "Ver todos" : `Completo${completos.length > 0 ? ` (${completos.length})` : ""}`}
            </button>
            <button
              className={`btn btn-sm ${mostrarCancelados ? "btn-danger" : "btn-outline"}`}
              onClick={() => { setMostrarCancelados(v => !v); setMostrarPendentes(false); setMostrarIncompletos(false); setMostrarCompletos(false); }}
              title="Exibir inscrições canceladas"
              style={{ whiteSpace: "nowrap" }}
            >
              {mostrarCancelados ? "Ver todos" : `Cancelados${totCancelados > 0 ? ` (${totCancelados})` : ""}`}
            </button>
            {!mostrarCancelados && !mostrarPendentes && !mostrarIncompletos && !mostrarCompletos && (
              <select className="search-input" style={{ width: "auto", borderRadius: "var(--radius-sm)" }}
                value={filtroRole} onChange={e => setFiltroRole(e.target.value)}>
                <option value="todos">Todos</option>
                {ROLE_OPTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            )}
            <input className="search-input" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
        </div>
        <table style={{ width: "100%", fontSize: "0.83rem" }}>
          <thead>
            <tr>
              <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => alternarOrdenacao("nome")}>Nome{setaOrdenacao("nome")}</th>
              <th>CPF</th>
              <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => alternarOrdenacao("instituicao")}>Instituição / Cargo{setaOrdenacao("instituicao")}</th>
              <th>E-mail</th><th style={{ width: 88 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map(p => {
              const cancelado = p.ativo === false;
              const corBorda = corAvatarBorda(p);
              return (
                <tr key={p.id} style={{ ...(cancelado ? { opacity: 0.55 } : {}), ...(p.role === "admin" ? { background: "#eff6ff" } : {}) }}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {p.foto_url
                        ? <img src={p.foto_url} alt={p.nome} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", outline: corBorda ? `2px solid ${corBorda}` : "none", outlineOffset: 3, flexShrink: 0 }} />
                        : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0, outline: corBorda ? `2px solid ${corBorda}` : "none", outlineOffset: 3 }}>{p.nome?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || p.foto_iniciais || "?"}</div>
                      }
                      <div style={{ display: "flex", flexDirection: "column", gap: 0, lineHeight: 1.2 }}>
                        <span style={{ fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 5 }}>
                          {p.nome}
                          {!cancelado && estaIncompleto(p) && (
                            <span title={`Cadastro incompleto: ${camposFaltando(p).join(", ")}`} style={{ display: "inline-flex" }}>
                              <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: "#f59e0b", fontSize: "0.68rem" }} />
                            </span>
                          )}
                        </span>
                        {p.nome_publico && (
                          <span style={{ fontSize: "0.7rem", color: "var(--text3, #aaa)", display: "inline-flex", alignItems: "center", gap: 4 }} title="Nome público">
                            <FontAwesomeIcon icon={faIdBadge} />{p.nome_publico}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.82rem", whiteSpace: "nowrap" }}>{p.cpf}</td>
                  <td><div>{p.instituicao}</div><div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>{p.cargo}</div></td>
                  <td style={{ fontSize: "0.82rem", color: "var(--text2)" }}>{p.email}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      {mostrarPendentes ? (
                        <>
                          <button className="btn btn-sm btn-success" title="Aprovar inscrição"
                            disabled={aprovando === p.id} onClick={() => aprovar(p)}>
                            <FontAwesomeIcon icon={faCheck} />
                          </button>
                          <button className="btn btn-sm btn-danger" title="Recusar inscrição"
                            disabled={aprovando === p.id} onClick={() => recusar(p)}>
                            <FontAwesomeIcon icon={faXmark} />
                          </button>
                        </>
                      ) : cancelado ? (
                        <button className="btn btn-sm btn-outline" title="Reativar inscrição"
                          disabled={reativando === p.id}
                          onClick={() => handleReativar(p)}>
                          <FontAwesomeIcon icon={faRotateLeft} />
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-outline" title="Editar"
                          onClick={() => { setFormPart({ ...p, _palestrante: !!p.is_palestrante, _admin: p.role === "admin", _credenciador: !!p.is_credenciador }); setModalPart(p.id); }}>
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                      )}
                      <button className="btn btn-sm btn-danger" title="Remover permanentemente" onClick={async () => {
                        if (!confirm(`Remover "${p.nome}" permanentemente? Isso apaga o acesso ao sistema.`)) return;
                        setParticipantes(participantes.filter(x => x.id !== p.id));
                        const { error } = await deletarParticipante(p.id);
                        if (error) {
                          setParticipantes(participantes);
                          showToast("Erro ao remover: " + error.message, "error");
                        } else {
                          registrarLog("participante.excluir", "participante", p.id, p.nome);
                          showToast("Participante removido.", "info");
                        }
                      }}>
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding: "0.6rem 1rem", display: "flex", gap: "1.25rem", fontSize: "0.75rem", color: "var(--text3)", borderTop: "1px solid var(--border)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--navy)", outline: "2px solid var(--gold, #c9a84c)", outlineOffset: 3, display: "inline-block" }} />
            Administrador
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--navy)", outline: "2px solid #22c55e", outlineOffset: 3, display: "inline-block" }} />
            Credenciador
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--navy)", outline: "2px solid #ef4444", outlineOffset: 3, display: "inline-block" }} />
            Palestrante
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
        <button className="btn btn-outline" style={{ borderColor: "var(--warn)", color: "var(--warn)" }} disabled={incompletos.length === 0}
          onClick={() => setModalAtualizacao(true)}>
          📧 Pedir atualização ({incompletos.length})
        </button>
        <p style={{ fontSize: "0.8rem", color: "var(--text3)", margin: 0, flex: 1, minWidth: 220 }}>
          Envia um e-mail pedindo pra completar o cadastro pra quem está sem CPF, sem instituição, ou preencheu só um nome (sem sobrenome).
        </p>
      </div>

      <Modal show={!!modalPart} onClose={() => setModalPart(null)}
        title={modalPart === "new" ? "Novo Inscrito" : "Editar Inscrito"} wide>
        {modalPart !== "new" && formPart.id && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
            <AvatarUpload
              userId={formPart.id}
              fotoUrl={formPart.foto_url}
              iniciais={formPart.foto_iniciais || formPart.nome?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
              size={64}
              onUploaded={url => {
                setFormPart(f => ({ ...f, foto_url: url }));
                setParticipantes(participantes.map(p => p.id === formPart.id ? { ...p, foto_url: url } : p));
              }}
            />
          </div>
        )}
        <div className="form-group" style={{ marginBottom: "0.75rem" }}>
          <label className="form-label">Funções no evento</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
            {[
              { key: "participante", label: "Participante", locked: true },
              { key: "_palestrante", label: "Palestrante" },
              { key: "_admin",       label: "Administrador" },
              { key: "_credenciador",label: "Credenciador" },
            ].map(({ key, label, locked }) => {
              const ativo = locked || !!formPart[key];
              return (
                <button key={key} type="button"
                  disabled={locked}
                  onClick={() => {
                    if (locked) return;
                    setFormPart(f => ({ ...f, [key]: !f[key] }));
                  }}
                  style={{
                    padding: "0.3rem 0.9rem", borderRadius: 99, fontSize: "0.82rem", fontWeight: 600,
                    cursor: locked ? "default" : "pointer",
                    background: ativo ? "var(--navy)" : "transparent",
                    color: ativo ? "#fff" : "var(--text2)",
                    border: `2px solid ${ativo ? "var(--navy)" : "var(--border)"}`,
                    opacity: locked ? 0.55 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="form-label">Nome completo *</label>
            <input className="form-input" value={formPart.nome || ""} onChange={e => setFormPart(f => ({ ...f, nome: e.target.value }))} />
          </div>
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="form-label">Nome para Crachá e Divulgação</label>
            <input className="form-input" placeholder="Como a pessoa quer ser chamada no crachá" value={formPart.nome_publico || ""}
              onChange={e => setFormPart(f => ({ ...f, nome_publico: e.target.value }))} />
          </div>
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="form-label">Instituição</label>
            <InstSelect value={formPart.instituicao || ""} onChange={v => setFormPart(f => ({ ...f, instituicao: v }))}
              instituicoes={instituicoes || []} onCriada={i => setInstituicoes?.(prev => [...prev, i])} />
          </div>
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="form-label">Cargo</label>
            <input className="form-input" value={formPart.cargo || ""}
              onChange={e => setFormPart(f => ({ ...f, cargo: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">CPF</label>
            <input className="form-input" style={{ fontFamily: "monospace" }} placeholder="000.000.000-00"
              value={formPart.cpf || ""} onChange={e => setFormPart(f => ({ ...f, cpf: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail {modalPart === "new" && <span style={{ color: "var(--gold-on-dark)" }}>*</span>}</label>
            <input className="form-input" type="email" value={formPart.email || ""}
              onChange={e => setFormPart(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">
              Senha{modalPart === "new" && <span style={{ fontWeight: 400, color: "var(--text3)", marginLeft: 4 }}>(opcional)</span>}
            </label>
            <input className="form-input" type="password" placeholder="Mín. 6 caracteres"
              value={formPart.senha || ""} onChange={e => setFormPart(f => ({ ...f, senha: e.target.value }))}
              disabled={modalPart !== "new"} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
          <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
            <FontAwesomeIcon icon={faFloppyDisk} style={{ marginRight: 6 }} />{salvando ? "Criando..." : "Salvar"}
          </button>
          <button className="btn btn-outline" onClick={() => setModalPart(null)} disabled={salvando}>Cancelar</button>
        </div>
      </Modal>

      <Modal show={modalAtualizacao} onClose={() => setModalAtualizacao(false)} title="Pedir atualização de cadastro">
        <p style={{ fontSize: "0.9rem", color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
          Envia o modelo <strong>"Atualização de Cadastro"</strong> (editável em Participantes → Modelos) para os{" "}
          <strong>{incompletos.length}</strong> inscrito{incompletos.length !== 1 ? "s" : ""} sem CPF, sem instituição, sem nome para crachá, ou que preencheram só um nome.
        </p>
        <div style={{ maxHeight: 220, overflowY: "auto", background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: "0.5rem 0.85rem", marginBottom: "1.25rem", fontSize: "0.85rem" }}>
          {incompletos.map(p => (
            <div key={p.id} style={{ padding: "0.3rem 0", borderBottom: "1px solid var(--border)" }}>{p.nome} <span style={{ color: "var(--text3)" }}>· {p.email}</span></div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <input className="form-input" placeholder="seu@email.com" value={emailTeste}
            onChange={e => setEmailTeste(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-outline" onClick={enviarTesteAtualizacao} disabled={enviandoTeste || !emailTeste.trim()}>
            {enviandoTeste ? "Enviando…" : "Enviar teste"}
          </button>
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--text3)", margin: "0 0 1.25rem" }}>
          Envia só para esse e-mail, sem afetar a lista de {incompletos.length} pendente{incompletos.length !== 1 ? "s" : ""} abaixo. Use pra conferir o modelo antes de disparar pra todo mundo.
        </p>

        <button className="btn btn-primary btn-block" onClick={solicitarAtualizacaoCadastro} disabled={enviandoAtualizacao || incompletos.length === 0}>
          {enviandoAtualizacao ? "Enviando…" : `Enviar para ${incompletos.length} pessoa${incompletos.length !== 1 ? "s" : ""}`}
        </button>
      </Modal>
    </div>
  );
}
