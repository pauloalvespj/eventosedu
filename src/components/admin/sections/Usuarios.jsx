import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faLock, faUnlock } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal } from "../../base/index";
import { InstSelect } from "./InstSelect";
import { RoleBadge } from "../../base/index";
import { atualizarProfile, atualizarEmailAuth } from "../../../lib/db";
import { ROLE_LABEL } from "../../../utils/helpers";

const ROLES = ["super_admin", "admin", "credenciador", "palestrante", "participante"];

const ROLE_PERMS = {
  super_admin:  "Acesso total: gerencia usuários, configurações, todas as seções.",
  admin:        "Gerencia evento, programação, inscrições, fórum e relatórios.",
  credenciador: "Acessa apenas a tela de credenciamento.",
  palestrante:  "Acesso ao painel do palestrante (palestras, presença).",
  participante: "Acessa o portal do participante (sem acesso admin).",
};

export function Usuarios() {
  const { admins, setAdmins, instituicoes, user, showToast } = useAdmin();
  const userRole = user?.role;
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const filtrados = admins.filter(u => {
    const q = busca.toLowerCase();
    return !q || u.nome?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
  });

  function abrirNovo() { setForm({ role: "admin", ativo: true }); setModal(true); }
  function abrirEditar(u) { setForm({ ...u }); setModal(true); }

  async function salvar() {
    if (!form.nome) { showToast("Nome obrigatório", "error"); return; }
    if (form.id) {
      const original = admins.find(u => u.id === form.id);
      const emailMudou = form.email && form.email.toLowerCase().trim() !== original?.email?.toLowerCase().trim();

      setAdmins(admins.map(u => u.id === form.id ? { ...u, ...form } : u));
      await atualizarProfile(form.id, { nome: form.nome, email: form.email, role: form.role, instituicao: form.instituicao, ativo: form.ativo });

      if (emailMudou) {
        const { error: authError } = await atualizarEmailAuth(form.id, form.email);
        if (authError) {
          showToast(`Perfil salvo, mas erro ao atualizar e-mail de login: ${authError.message}`, "error");
          setModal(false);
          return;
        }
      }

      showToast("Usuário atualizado!", "success");
    } else {
      const iniciais = form.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
      setAdmins([...admins, { ...form, id: `local-${Date.now()}`, foto_iniciais: iniciais }]);
      showToast("Usuário criado localmente — use setup-users.js para persistir no Supabase.", "info");
    }
    setModal(false);
  }

  function toggleAtivo(u) {
    setAdmins(admins.map(x => x.id === u.id ? { ...x, ativo: !x.ativo } : x));
    atualizarProfile(u.id, { ativo: !u.ativo });
    showToast(u.ativo ? "Usuário desativado" : "Usuário ativado", "info");
  }

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Usuários</h1><p>Equipe administrativa e credenciadores</p></div>
        {userRole === "super_admin" && (
          <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Usuário</button>
        )}
      </div>

      {/* Legenda de permissões */}
      <div className="table-wrap" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
          <FontAwesomeIcon icon={faLock} style={{ marginRight: 6 }} />Perfis de Acesso
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "0.5rem" }}>
          {ROLES.map(r => (
            <div key={r} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "0.5rem 0.75rem", background: "var(--surface2)", borderRadius: "var(--radius-sm)" }}>
              <RoleBadge role={r} />
              <span style={{ fontSize: "0.78rem", color: "var(--text2)", lineHeight: 1.5 }}>{ROLE_PERMS[r]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Usuários ({filtrados.length})</span>
          <input className="search-input" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Role</th><th>Instituição</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {filtrados.map(u => (
              <tr key={u.id} style={{ opacity: u.ativo === false ? 0.5 : 1 }}>
                <td style={{ fontWeight: 500 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>
                      {u.foto_iniciais || u.nome?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    {u.nome}
                  </div>
                </td>
                <td style={{ fontSize: "0.82rem", color: "var(--text2)" }}>{u.email || "–"}</td>
                <td><RoleBadge role={u.role} /></td>
                <td style={{ fontSize: "0.82rem" }}>{u.instituicao || "–"}</td>
                <td>
                  <span className={`badge badge-${u.ativo !== false ? "success" : "danger"}`}>
                    {u.ativo !== false ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    {userRole === "super_admin" && (
                      <>
                        <button className="btn btn-sm btn-outline" title="Editar" onClick={() => abrirEditar(u)}>
                          <FontAwesomeIcon icon={faPenToSquare} />
                        </button>
                        <button className={`btn btn-sm ${u.ativo !== false ? "btn-danger" : "btn-success"}`} title={u.ativo !== false ? "Desativar" : "Ativar"} onClick={() => toggleAtivo(u)}>
                          <FontAwesomeIcon icon={u.ativo !== false ? faLock : faUnlock} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal show={modal} onClose={() => setModal(false)} title={form.id ? "Editar Usuário" : "Novo Usuário"}>
        <div className="form-grid">
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="form-label">Nome *</label>
            <input className="form-input" value={form.nome || ""} onChange={e => set("nome", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="form-input" type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-input" value={form.role || "admin"} onChange={e => set("role", e.target.value)}>
              {ROLES.filter(r => r !== "participante").map(r => (
                <option key={r} value={r}>{ROLE_LABEL[r] || r}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Instituição</label>
            <InstSelect value={form.instituicao || ""} onChange={v => set("instituicao", v)} instituicoes={instituicoes || []} />
          </div>
          {!form.id && (
            <div className="form-group">
              <label className="form-label">Senha inicial</label>
              <input className="form-input" type="password" placeholder="Mín. 6 caracteres" value={form.senha || ""} onChange={e => set("senha", e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-input" value={form.ativo !== false ? "true" : "false"} onChange={e => set("ativo", e.target.value === "true")}>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary btn-block" style={{ marginTop: "0.5rem" }} onClick={salvar}>Salvar</button>
      </Modal>
    </div>
  );
}
