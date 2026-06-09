import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faPenToSquare, faTrash, faFloppyDisk, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "../AdminContext";
import { Modal, AvatarUpload, RoleBadge } from "../../../base/index";
import { InstSelect } from "../InstSelect";
import { atualizarProfile, deletarParticipante, adminCriarUsuario, reativarInscricao, atualizarEmailAuth } from "../../../../lib/db";

const ROLE_OPTS = [
  { value: "participante", label: "Participante" },

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
    const roleMatch = filtroRole === "todos"
      || (filtroRole === "participante" && p.role === "participante")
      || (filtroRole === "admin" && p.role === "admin")
      || (filtroRole === "credenciador" && p.is_credenciador)
      || (filtroRole === "palestrante" && p.is_palestrante);
    return ok && roleMatch && (mostrarCancelados ? cancelado : !cancelado);
  });

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
      setParticipantes(participantes.map(x => x.id === formPart.id ? { ...x, ...formPart, role, is_palestrante, is_credenciador } : x));
      atualizarProfile(formPart.id, { nome: formPart.nome, cpf: formPart.cpf, instituicao: formPart.instituicao, cargo: formPart.cargo, role, is_palestrante, is_credenciador });
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

  const totP = participantes.filter(p => p.ativo !== false).length;
  const totCancelados = participantes.filter(p => p.ativo === false).length;

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Inscrições</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text3)" }}>
            {totP} inscrito{totP !== 1 ? "s" : ""}
            {totCancelados > 0 && <span style={{ color: "var(--danger, #c0392b)", marginLeft: 6 }}>· {totCancelados} cancelado{totCancelados !== 1 ? "s" : ""}</span>}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setFormPart({ nome: "", cpf: "", email: "", instituicao: "", cargo: "", _palestrante: false, _admin: false, _credenciador: false });
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
              <th>E-mail</th><th style={{ width: 88 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(p => {
              const cancelado = p.ativo === false;
              return (
                <tr key={p.id} style={{ ...(cancelado ? { opacity: 0.55 } : {}), ...(p.role === "admin" ? { background: "#eff6ff" } : {}) }}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {p.foto_url
                        ? <img src={p.foto_url} alt={p.nome} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: `2px solid ${p.role === "admin" ? "var(--gold, #c9a84c)" : p.is_credenciador ? "#22c55e" : "transparent"}`, flexShrink: 0 }} />
                        : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0, outline: p.role === "admin" ? "2px solid var(--gold, #c9a84c)" : p.is_credenciador ? "2px solid #22c55e" : "none", outlineOffset: 1 }}>{p.nome?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || p.foto_iniciais || "?"}</div>
                      }
                      <div style={{ display: "flex", flexDirection: "column", gap: 0, lineHeight: 1.2 }}>
                        <span style={{ fontWeight: 500 }}>{p.nome}</span>
                        {p.is_palestrante && (
                          <span style={{ fontSize: "0.7rem", color: "var(--text3, #aaa)", fontWeight: 500 }}>Palestrante</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: "0.82rem", whiteSpace: "nowrap" }}>{p.cpf}</td>
                  <td><div>{p.instituicao}</div><div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>{p.cargo}</div></td>
                  <td style={{ fontSize: "0.82rem", color: "var(--text2)" }}>{p.email}</td>
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
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--navy)", outline: "2px solid var(--gold, #c9a84c)", outlineOffset: 1, display: "inline-block" }} />
            Administrador
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--navy)", outline: "2px solid #22c55e", outlineOffset: 1, display: "inline-block" }} />
            Credenciador
          </span>
        </div>
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
                    setFormPart(f => {
                      const next = { ...f, [key]: !f[key] };
                      if (key === "_admin"        && next._admin)        next._credenciador = false;
                      if (key === "_credenciador" && next._credenciador) next._admin = false;
                      return next;
                    });
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
            <label className="form-label">Instituição</label>
            <InstSelect value={formPart.instituicao || ""} onChange={v => setFormPart(f => ({ ...f, instituicao: v }))} instituicoes={instituicoes || []} />
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
    </div>
  );
}
