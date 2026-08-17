import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faTrash, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "../AdminContext";
import { Modal, AvatarUpload, RoleBadge } from "../../../base/index";
import { InstSelect } from "../InstSelect";
import { atualizarProfile, adminCriarUsuario, atualizarEvento, uploadAvatar, atualizarEmailAuth } from "../../../../lib/db";

export function AbaPalestrantes() {
  const { event, setEvent, palestrantes, setPalestrantes, instituicoes, showToast } = useAdmin();

  const visivel = event?.palestrantes_visivel !== false;
  function toggleVisibilidade() {
    const novo = !visivel;
    setEvent(ev => ({ ...ev, palestrantes_visivel: novo }));
    atualizarEvento(event.id, { palestrantes_visivel: novo });
    showToast(novo ? "Palestrantes visíveis no site!" : "Palestrantes ocultados (Em breve)", novo ? "success" : "warn");
  }
  const [subtitulo, setSubtitulo] = useState(event?.palestrantes_subtitulo || "");
  function salvarSubtitulo() {
    if (subtitulo === (event?.palestrantes_subtitulo || "")) return;
    setEvent(ev => ({ ...ev, palestrantes_subtitulo: subtitulo }));
    atualizarEvento(event.id, { palestrantes_subtitulo: subtitulo });
    showToast("Mensagem salva!", "success");
  }
  const [busca, setBusca]       = useState("");
  const [modalPal, setModalPal] = useState(false);
  const [formPal, setFormPal]   = useState({});
  const [fotoFile, setFotoFile] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [palBio, setPalBio]     = useState(null);

  function toggleDestaque(p) {
    const novo = { ...p, destaque: !p.destaque };
    setPalestrantes(palestrantes.map(x => x.id === p.id ? novo : x));
    if (p.id && !String(p.id).startsWith("local-")) atualizarProfile(p.id, { destaque: novo.destaque });
  }

  async function salvar() {
    if (!formPal.nome) { showToast("Nome obrigatório", "error"); return; }
    if (formPal.id) {
      setSalvando(true);
      let foto_url = formPal.foto_url;
      if (fotoFile) {
        try {
          foto_url = await uploadAvatar(formPal.id, fotoFile);
        } catch (err) {
          setSalvando(false);
          showToast("Erro ao enviar foto: " + (err?.message || String(err)), "error");
          return;
        }
      }
      const original = palestrantes.find(p => p.id === formPal.id);
      const emailNovo = formPal.email?.trim().toLowerCase();
      const emailOriginal = original?.email?.trim().toLowerCase();
      if (emailNovo && emailNovo !== emailOriginal) {
        const { error: emailErr } = await atualizarEmailAuth(formPal.id, emailNovo);
        if (emailErr) {
          setSalvando(false);
          showToast("Erro ao atualizar e-mail: " + (emailErr.message || JSON.stringify(emailErr)), "error");
          return;
        }
        await atualizarProfile(formPal.id, { email: emailNovo });
      }
      const atualizado = { ...formPal, foto_url };
      setPalestrantes(palestrantes.map(p => p.id === formPal.id ? atualizado : p));
      const { error: saveErr } = await atualizarProfile(formPal.id, {
        nome: atualizado.nome, cargo: atualizado.cargo,
        area: atualizado.area, mini_bio: atualizado.mini_bio, instituicao: atualizado.instituicao,
        destaque: atualizado.destaque ?? false, foto_url: atualizado.foto_url ?? null,
      });
      if (saveErr) {
        setSalvando(false);
        showToast("Erro ao salvar perfil: " + saveErr.message, "error");
        return;
      }
      setSalvando(false);
      setModalPal(false);
      showToast("Palestrante salvo!", "success");
    } else {
      if (!formPal.email) { showToast("E-mail obrigatório para criar acesso", "error"); return; }
      setSalvando(true);
      const { data, error } = await adminCriarUsuario({
        nome: formPal.nome,
        email: formPal.email,
        cargo: formPal.cargo,
        area: formPal.area,
        mini_bio: formPal.mini_bio,
        instituicao: formPal.instituicao,
        destaque: formPal.destaque ?? false,
        role: "participante",
        is_palestrante: true,
        senha: formPal.senha,
      });
      setSalvando(false);
      if (error) {
        showToast("Erro ao criar palestrante: " + (error.message || JSON.stringify(error)), "error");
        return;
      }
      // Salva campos extras que a Edge Function pode não ter processado
      const extras = {};
      if (formPal.cargo)    extras.cargo   = formPal.cargo;
      if (formPal.area)      extras.area     = formPal.area;
      if (formPal.mini_bio)  extras.mini_bio = formPal.mini_bio;
      extras.destaque = formPal.destaque ?? false;
      if (Object.keys(extras).length) atualizarProfile(data.user.id, extras);
      setPalestrantes([...palestrantes, { ...data.user, ...extras }]);
      setModalPal(false);
      showToast("Palestrante criado com acesso ao sistema!", "success");
    }
  }

  const filtrados = palestrantes.filter(p => {
    const q = busca.toLowerCase();
    return !q || p.nome?.toLowerCase().includes(q) || p.area?.toLowerCase().includes(q) || p.instituicao?.toLowerCase().includes(q);
  });

  const [ordenacao, setOrdenacao] = useState({ campo: null, dir: "asc" });
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

  return (
    <div>
      {palBio && (
        <div onClick={() => setPalBio(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"var(--surface)", borderRadius:"var(--radius-lg)", padding:"1.75rem", maxWidth:480, width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,0.22)", position:"relative" }}>
            <button onClick={() => setPalBio(null)} style={{ position:"absolute", top:"0.75rem", right:"0.75rem", background:"none", border:"none", fontSize:"1.2rem", cursor:"pointer", color:"var(--text3)", lineHeight:1 }}>✕</button>
            <div style={{ fontWeight:700, fontSize:"1.05rem", color:"var(--navy)", marginBottom:"0.25rem" }}>{palBio.nome}</div>
            {(palBio.instituicao || palBio.cargo) && (
              <div style={{ fontSize:"0.8rem", color:"var(--text2)", marginBottom:"1rem" }}>
                {[palBio.instituicao, palBio.cargo].filter(Boolean).join(" · ")}
              </div>
            )}
            <p style={{ fontSize:"0.9rem", color:"var(--text1)", lineHeight:1.7, margin:0, whiteSpace:"pre-wrap" }}>{palBio.mini_bio}</p>
          </div>
        </div>
      )}
      <div className="admin-topbar">
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Palestrantes</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text3)" }}>{palestrantes.length} cadastrado{palestrantes.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display:"flex", gap:"0.5rem" }}>
          <button
            className={`btn btn-sm ${visivel ? "btn-outline" : "btn-danger"}`}
            onClick={toggleVisibilidade}
            title={visivel ? "Clique para ocultar no site" : "Clique para exibir no site"}
            style={{ display:"flex", alignItems:"center", gap:6 }}
          >
            <FontAwesomeIcon icon={visivel ? faEye : faEyeSlash} />
            {visivel ? "Visível no site" : "Em breve no site"}
          </button>
          <button className="btn btn-primary" onClick={() => { setFormPal({}); setFotoFile(null); setModalPal(true); }}>
            + Novo Palestrante
          </button>
        </div>
      </div>

      {!visivel && (
        <div className="form-group" style={{ marginBottom: "1.25rem" }}>
          <label className="form-label">Mensagem exibida no lugar dos palestrantes ("Em breve")</label>
          <input className="form-input" placeholder="Ex: Especialistas em auditoria, governança e controle público"
            value={subtitulo} onChange={e => setSubtitulo(e.target.value)} onBlur={salvarSubtitulo} />
        </div>
      )}

      <div className="table-wrap">
        <div className="table-header">
          <span className="table-title">Palestrantes ({filtrados.length})</span>
          <input className="search-input" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => alternarOrdenacao("nome")}>Nome{setaOrdenacao("nome")}</th>
              <th>CPF</th>
              <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => alternarOrdenacao("instituicao")}>Instituição / Cargo{setaOrdenacao("instituicao")}</th>
              <th>E-mail</th><th style={{ width: 100 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map(p => (
              <tr key={p.id} style={{ ...(p.role === "admin" ? { background: "#eff6ff" } : {}) }}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {p.foto_url
                      ? <img src={p.foto_url} alt={p.nome} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--gold)", flexShrink: 0 }} />
                      : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 700, flexShrink: 0 }}>{p.nome?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || p.foto_iniciais || "?"}</div>
                    }
                    <div>
                      {p.mini_bio ? (
                        <button onClick={() => setPalBio(p)} title="Ver mini biografia" style={{ background:"none", border:"none", padding:0, cursor:"pointer", color:"inherit", font:"inherit", fontWeight:500, textDecoration:"underline dotted", textUnderlineOffset:2, textAlign:"left" }}>
                          {p.nome}
                        </button>
                      ) : (
                        <span style={{ fontWeight: 500 }}>{p.nome}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ fontFamily: "monospace", fontSize: "0.82rem", whiteSpace: "nowrap" }}>{p.cpf || "–"}</td>
                <td><div>{p.instituicao}</div><div style={{ fontSize: "0.78rem", color: "var(--text3)" }}>{p.cargo}</div></td>
                <td style={{ fontSize: "0.82rem", color: "var(--text2)" }}>{p.email || "–"}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button
                      onClick={() => toggleDestaque(p)}
                      title={p.destaque ? "Remover destaque" : "Marcar como destaque"}
                      className="btn btn-sm"
                      style={{ border: `1px solid ${p.destaque ? "var(--success)" : "var(--border2)"}`, color: p.destaque ? "var(--success)" : "var(--text3)", background: p.destaque ? "var(--success-bg)" : "transparent" }}
                    >★</button>
                    <button className="btn btn-sm btn-outline" onClick={() => { setFormPal({ ...p }); setFotoFile(null); setModalPal(true); }}>
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => {
                      setPalestrantes(palestrantes.filter(x => x.id !== p.id));
                      if (p.is_palestrante) {
                        atualizarProfile(p.id, { is_palestrante: false });
                      }
                      showToast("Palestrante removido", "info");
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

      <Modal show={modalPal} onClose={() => setModalPal(false)} title={formPal.id ? "Editar Palestrante" : "Novo Palestrante"} wide>
        {formPal.id && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
            <AvatarUpload
              userId={formPal.id}
              fotoUrl={formPal.foto_url}
              iniciais={formPal.nome?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || formPal.foto_iniciais}
              size={72}
              onFileSelected={(file) => setFotoFile(file)}
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => setFormPal(f => ({ ...f, destaque: !f.destaque }))}
          style={{
            display:"flex", alignItems:"center", gap:"0.6rem", width:"100%",
            padding:"0.7rem 1rem", borderRadius:"var(--radius-sm)", border:"1.5px solid",
            fontSize:"0.88rem", fontWeight:600, cursor:"pointer", transition:"all 0.15s",
            marginBottom:"1.25rem",
            background: formPal.destaque ? "var(--gold-tint)" : "var(--surface2)",
            borderColor: formPal.destaque ? "var(--gold-on-dark)" : "var(--border)",
            color: formPal.destaque ? "var(--navy)" : "var(--text3)",
          }}
        >
          <span style={{ fontSize:"1.3rem", lineHeight:1, color: formPal.destaque ? "#e4a11b" : "#cbd5e1" }}>★</span>
          {formPal.destaque ? "Destaque ativo — aparece na landing page" : "Marcar como destaque (landing page)"}
        </button>

        <div className="form-group">
          <label className="form-label">Nome *</label>
          <input className="form-input" value={formPal.nome || ""} onChange={e => setFormPal(f => ({ ...f, nome: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Instituição</label>
          <InstSelect value={formPal.instituicao || ""} onChange={v => setFormPal(f => ({ ...f, instituicao: v }))} instituicoes={instituicoes || []} />
        </div>
        <div className="form-group">
          <label className="form-label">Cargo</label>
          <input className="form-input" value={formPal.cargo || ""} onChange={e => setFormPal(f => ({ ...f, cargo: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Mini Biografia</label>
          <textarea className="form-input" rows={2} value={formPal.mini_bio || ""} onChange={e => setFormPal(f => ({ ...f, mini_bio: e.target.value }))} />
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "0.5rem", marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>Credenciais de Acesso</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" value={formPal.email || ""} onChange={e => setFormPal(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" placeholder="Mín. 6 caracteres" value={formPal.senha || ""} onChange={e => setFormPal(f => ({ ...f, senha: e.target.value }))} />
            </div>
          </div>
        </div>
        {!formPal.id && <p style={{ fontSize: "0.78rem", color: "var(--text3)", marginBottom: "0.75rem" }}>💡 A foto pode ser adicionada após salvar o palestrante.</p>}
        <button className="btn btn-primary btn-block" onClick={salvar} disabled={salvando}>
          {salvando ? "Criando..." : "Salvar"}
        </button>
      </Modal>
    </div>
  );
}
