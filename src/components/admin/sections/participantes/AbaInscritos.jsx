import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faPenToSquare, faTrash, faFloppyDisk, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "../AdminContext";
import { Modal, AvatarUpload, RoleBadge } from "../../../base/index";
import { InstSelect } from "../InstSelect";
import { atualizarProfile, deletarParticipante, adminCriarUsuario, reativarInscricao, adicionarComoParticipante, removerComoParticipante, atualizarEmailAuth } from "../../../../lib/db";

const ROLE_OPTS = [
  { value: "participante", label: "Participante" },
  { value: "palestrante",  label: "Palestrante" },
  { value: "credenciador", label: "Credenciador" },
  { value: "admin",        label: "Administrador" },
];

export function AbaInscritos() {
  const { participantes, setParticipantes, instituicoes, showToast } = useAdmin();
  const [busca, setBusca]               = useState("");
  const [filtroRole, setFiltroRole]     = useState("todos");
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [modalPart, setModalPart]       = useState(null);
  const [formPart, setFormPart]         = useState({});
  const [reativando, setReativando]     = useState(null);

  const filtrados = participantes.filter(p => {
    const q = busca.toLowerCase();
    const ok = !q || p.nome?.toLowerCase().includes(q) || p.cpf?.includes(q)
      || p.instituicao?.toLowerCase().includes(q) || p.cargo?.toLowerCase().includes(q)
      || p.email?.toLowerCase().includes(q);
    const cancelado = p.ativo === false;
    const roleMatch = filtroRole === "todos" || p.role === filtroRole
      || (filtroRole === "participante" && p.roles?.includes("participante"));
    return ok && roleMatch && (mostrarCancelados ? cancelado : !cancelado);
  });

  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!formPart.nome) { showToast("Nome obrigatório", "error"); return; }
    const role = formPart.role || "participante";
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
      });
      setSalvando(false);
      if (error) {
        showToast("Erro ao criar usuário: " + (error.message || JSON.stringify(error)), "error");
        return;
      }
      setParticipantes([...participantes, data.user]);
      showToast("Inscrito criado com acesso ao sistema!", "success");
    } else {
      const ADMIN_ROLES = ["admin", "credenciador"];
      const isAdminRole = ADMIN_ROLES.includes(role);
      const original = participantes.find(p => p.id === formPart.id);
      const eraParticipante = original?.roles?.includes("participante") ?? false;
      const agoraParticipante = isAdminRole ? (formPart.tambemParticipante ?? false) : false;

      let newRoles = formPart.roles ?? original?.roles ?? null;

      if (isAdminRole && eraParticipante !== agoraParticipante) {
        if (agoraParticipante) {
          const { roles, error } = await adicionarComoParticipante(formPart.id, role, original?.roles);
          if (error) { showToast("Erro ao adicionar participação: " + error.message, "error"); setEnviando && setSalvando(false); return; }
          newRoles = roles;
        } else {
          const { roles, error } = await removerComoParticipante(formPart.id, role, original?.roles);
          if (error) { showToast("Erro ao remover participação: " + error.message, "error"); setSalvando(false); return; }
          newRoles = roles;
        }
      }

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
      setParticipantes(participantes.map(x => x.id === formPart.id ? { ...x, ...formPart, role, roles: newRoles } : x));
      atualizarProfile(formPart.id, { nome: formPart.nome, cpf: formPart.cpf, instituicao: formPart.instituicao, cargo: formPart.cargo, role });
      setSalvando(false);
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

  const totP = participantes.filter(p => p.role === "participante" && p.ativo !== false).length;
  const totPal = participantes.filter(p => p.role === "palestrante" && p.ativo !== false).length;
  const totCancelados = participantes.filter(p => p.ativo === false).length;

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Inscrições</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text3)" }}>
            {totP} participante{totP !== 1 ? "s" : ""} · {totPal} palestrante{totPal !== 1 ? "s" : ""}
            {totCancelados > 0 && <span style={{ color: "var(--danger, #c0392b)", marginLeft: 6 }}>· {totCancelados} cancelado{totCancelados !== 1 ? "s" : ""}</span>}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setFormPart({ nome: "", cpf: "", email: "", instituicao: "", cargo: "", role: "participante" });
          setModalPart("new");
        }}>
          <FontAwesomeIcon icon={faUsers} style={{ marginRight: 6 }} />Novo Inscrito
        </button>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Inscritos ({filtrados.length})</span>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              className={`btn btn-sm ${mostrarCancelados ? "btn-danger" : "btn-outline"}`}
              onClick={() => setMostrarCancelados(v => !v)}
              title="Exibir inscrições canceladas"
              style={{ whiteSpace: "nowrap" }}
            >
              {mostrarCancelados ? "Ver ativos" : `Cancelados${totCancelados > 0 ? ` (${totCancelados})` : ""}`}
            </button>
            {!mostrarCancelados && (
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
              <th>Nome</th><th>CPF</th><th>Instituição / Cargo</th>
              <th>E-mail</th><th>Tipo</th><th>Status</th><th style={{ width: 88 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(p => {
              const cancelado = p.ativo === false;
              return (
                <tr key={p.id} style={cancelado ? { opacity: 0.55 } : undefined}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {p.foto_url
                        ? <img src={p.foto_url} alt={p.nome} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--gold)", flexShrink: 0 }} />
                        : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>{p.nome?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || p.foto_iniciais || "?"}</div>
                      }
                      <span style={{ fontWeight: 500 }}>{p.nome}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>{p.cpf}</td>
                  <td><div>{p.instituicao}</div><div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>{p.cargo}</div></td>
                  <td style={{ fontSize: "0.82rem", color: "var(--text2)" }}>{p.email}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem", alignItems: "center", flexWrap: "wrap" }}>
                      <RoleBadge role={p.roles?.includes("participante") && p.role !== "participante" ? "participante" : p.role} />
                      {p.roles?.includes("participante") && p.role !== "participante" && (
                        <span title={`Também ${p.role}`} style={{ fontSize: "0.68rem", fontWeight: 700, background: "var(--navy)", color: "#fff", borderRadius: "4px", padding: "1px 5px", letterSpacing: "0.03em" }}>A</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {cancelado
                      ? <span className="badge badge-danger">Cancelado</span>
                      : <span className={`badge badge-${p.credenciado ? "success" : "warn"}`}>{p.credenciado ? "Credenciado" : "Inscrito"}</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      {cancelado ? (
                        <button className="btn btn-sm btn-outline" title="Reativar inscrição"
                          disabled={reativando === p.id}
                          onClick={() => handleReativar(p)}>
                          <FontAwesomeIcon icon={faRotateLeft} />
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-outline" title="Editar"
                          onClick={() => { setFormPart({ ...p, tambemParticipante: p.roles?.includes("participante") ?? false }); setModalPart(p.id); }}>
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
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="form-label">Nome completo *</label>
            <input className="form-input" value={formPart.nome || ""} onChange={e => setFormPart(f => ({ ...f, nome: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">CPF</label>
            <input className="form-input" style={{ fontFamily: "monospace" }} placeholder="000.000.000-00"
              value={formPart.cpf || ""} onChange={e => setFormPart(f => ({ ...f, cpf: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo / Categoria</label>
            <select className="form-input" value={formPart.role || "participante"}
              onChange={e => setFormPart(f => ({ ...f, role: e.target.value }))}>
              {ROLE_OPTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {["admin", "credenciador"].includes(formPart.role) && (
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem", fontSize: "0.85rem", cursor: "pointer", color: "var(--text2)" }}>
                <input type="checkbox" checked={formPart.tambemParticipante ?? false}
                  onChange={e => setFormPart(f => ({ ...f, tambemParticipante: e.target.checked }))} />
                Também participa do evento (certificado, presença)
              </label>
            )}
          </div>
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="form-label">Instituição</label>
            <InstSelect value={formPart.instituicao || ""} onChange={v => setFormPart(f => ({ ...f, instituicao: v }))} instituicoes={instituicoes || []} />
          </div>
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="form-label">Cargo / Título</label>
            <input className="form-input" value={formPart.cargo || ""}
              onChange={e => setFormPart(f => ({ ...f, cargo: e.target.value }))} />
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
        {formPart.role === "palestrante" && (
          <div style={{ padding: "0.6rem 0.85rem", background: "var(--surface2)", borderRadius: "var(--radius-sm)", fontSize: "0.82rem", color: "var(--text2)", marginTop: "0.5rem" }}>
            💡 Palestrantes também aparecem na lista de certificados e podem ter presenças registradas.
          </div>
        )}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
          <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
            <FontAwesomeIcon icon={faFloppyDisk} style={{ marginRight: 6 }} />{salvando ? "Criando..." : "Salvar"}
          </button>
          <button className="btn btn-outline" onClick={() => setModalPart(null)} disabled={salvando}>Cancelar</button>
        </div>
      </Modal>
    </div>
  );
}
