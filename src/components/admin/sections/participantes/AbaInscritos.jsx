import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faPenToSquare, faTrash, faFloppyDisk } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "../AdminContext";
import { Modal, AvatarUpload, RoleBadge } from "../../../base/index";
import { InstSelect } from "../InstSelect";
import { atualizarProfile, deletarParticipante } from "../../../../lib/db";

const ROLE_OPTS = [
  { value: "participante", label: "Participante" },
  { value: "palestrante",  label: "Palestrante" },
  { value: "credenciador", label: "Credenciador" },
  { value: "admin",        label: "Administrador" },
  { value: "super_admin",  label: "Super Admin" },
];

export function AbaInscritos() {
  const { participantes, setParticipantes, instituicoes, showToast } = useAdmin();
  const [busca, setBusca]           = useState("");
  const [filtroRole, setFiltroRole] = useState("todos");
  const [modalPart, setModalPart]   = useState(null);
  const [formPart, setFormPart]     = useState({});

  const filtrados = participantes.filter(p => {
    const q = busca.toLowerCase();
    const ok = !q || p.nome?.toLowerCase().includes(q) || p.cpf?.includes(q)
      || p.instituicao?.toLowerCase().includes(q) || p.cargo?.toLowerCase().includes(q)
      || p.email?.toLowerCase().includes(q);
    return ok && (filtroRole === "todos" || p.role === filtroRole);
  });

  function salvar() {
    if (!formPart.nome) { showToast("Nome obrigatório", "error"); return; }
    const role = formPart.role || "participante";
    if (modalPart === "new") {
      const novo = {
        ...formPart, role, id: `local-${Date.now()}`, credenciado: false,
        foto_iniciais: formPart.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase(),
      };
      setParticipantes([...participantes, novo]);
      showToast("Inscrito adicionado!", "success");
    } else {
      setParticipantes(participantes.map(x => x.id === formPart.id ? { ...x, ...formPart, role } : x));
      atualizarProfile(formPart.id, { nome: formPart.nome, cpf: formPart.cpf, instituicao: formPart.instituicao, cargo: formPart.cargo, role });
      showToast("Inscrito atualizado!", "success");
    }
    setModalPart(null);
  }

  const totP = participantes.filter(p => p.role === "participante").length;
  const totPal = participantes.filter(p => p.role === "palestrante").length;

  return (
    <div>
      <div className="admin-topbar">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Inscrições</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text3)" }}>
            {totP} participante{totP !== 1 ? "s" : ""} · {totPal} palestrante{totPal !== 1 ? "s" : ""}
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
            <select className="search-input" style={{ width: "auto", borderRadius: "var(--radius-sm)" }}
              value={filtroRole} onChange={e => setFiltroRole(e.target.value)}>
              <option value="todos">Todos</option>
              {ROLE_OPTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
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
            {filtrados.map(p => (
              <tr key={p.id}>
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
                <td><RoleBadge role={p.role} /></td>
                <td><span className={`badge badge-${p.credenciado ? "success" : "warn"}`}>{p.credenciado ? "Credenciado" : "Inscrito"}</span></td>
                <td>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button className="btn btn-sm btn-outline" title="Editar"
                      onClick={() => { setFormPart({ ...p }); setModalPart(p.id); }}>
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <button className="btn btn-sm btn-danger" title="Remover" onClick={async () => {
                      if (!confirm(`Remover "${p.nome}" permanentemente? Isso apaga o acesso ao sistema.`)) return;
                      setParticipantes(participantes.filter(x => x.id !== p.id));
                      const { error } = await deletarParticipante(p.id);
                      if (error) {
                        setParticipantes(participantes); // reverte
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
            ))}
          </tbody>
        </table>
      </div>

      <Modal show={!!modalPart} onClose={() => setModalPart(null)}
        title={modalPart === "new" ? "Novo Inscrito" : "Editar Inscrito"}>
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
            <label className="form-label">E-mail</label>
            <input className="form-input" type="email" value={formPart.email || ""}
              onChange={e => setFormPart(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group" style={{ gridColumn: "1/-1" }}>
            <label className="form-label">Instituição</label>
            <InstSelect value={formPart.instituicao || ""} onChange={v => setFormPart(f => ({ ...f, instituicao: v }))} instituicoes={instituicoes || []} />
          </div>
          <div className="form-group">
            <label className="form-label">Cargo / Título</label>
            <input className="form-input" value={formPart.cargo || ""}
              onChange={e => setFormPart(f => ({ ...f, cargo: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo / Categoria</label>
            <select className="form-input" value={formPart.role || "participante"}
              onChange={e => setFormPart(f => ({ ...f, role: e.target.value }))}>
              {ROLE_OPTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>
        {formPart.role === "palestrante" && (
          <div style={{ padding: "0.6rem 0.85rem", background: "var(--surface2)", borderRadius: "var(--radius-sm)", fontSize: "0.82rem", color: "var(--text2)", marginTop: "0.5rem" }}>
            💡 Palestrantes também aparecem na lista de certificados e podem ter presenças registradas.
          </div>
        )}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
          <button className="btn btn-primary" onClick={salvar}>
            <FontAwesomeIcon icon={faFloppyDisk} style={{ marginRight: 6 }} />Salvar
          </button>
          <button className="btn btn-outline" onClick={() => setModalPart(null)}>Cancelar</button>
        </div>
      </Modal>
    </div>
  );
}
