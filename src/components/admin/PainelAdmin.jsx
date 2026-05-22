import { useState } from "react";
import { useRoutes, NavLink, Navigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar, faGear, faCalendarDays, faUsers, faIdBadge,
  faCircleCheck, faTrophy, faChartLine, faStar, faComments, faMedal, faLock,
  faArrowRightFromBracket, faBuilding, faCircleUser, faScroll,
} from "@fortawesome/free-solid-svg-icons";
import { ROLE_LABEL } from "../../utils/helpers";
import { AdminContext, useAdmin } from "./sections/AdminContext";
import { AvatarUpload } from "../base/index";
import { atualizarProfile } from "../../lib/db";

import { Dashboard }            from "./sections/Dashboard";
import { Evento }               from "./sections/Evento";
import { Programacao }          from "./sections/Programacao";
import { GestaoParticipantes }  from "./sections/GestaoParticipantes";
import { Credenciamento }       from "./sections/Credenciamento";
import { Presencas }      from "./sections/Presencas";
import { Certificados }         from "./sections/Certificados";
import { ModeloCertificado }    from "./sections/ModeloCertificado";
import { Relatorios }     from "./sections/Relatorios";
import { Avaliacoes }     from "./sections/Avaliacoes";
import { ForumAdmin }     from "./sections/ForumAdmin";
import { Gamificacao }    from "./sections/Gamificacao";
import { Usuarios }       from "./sections/Usuarios";
import { Instituicoes }   from "./sections/Instituicoes";

const MENU = [
  { path: "",               icon: faChartBar,    label: "Dashboard",       roles: ["admin","credenciador"] },
  { path: "evento",         icon: faGear,         label: "Dados do Evento", roles: ["admin"] },
  { path: "programacao",    icon: faCalendarDays, label: "Programação",     roles: ["admin"] },
  { path: "participantes",  icon: faUsers,        label: "Participantes",   roles: ["admin"] },
  { path: "credenciamento", icon: faIdBadge,      label: "Credenciamento",  roles: ["admin","credenciador"] },
  { path: "presencas",      icon: faCircleCheck,  label: "Presenças",       roles: ["admin"] },
  { path: "certificados",   icon: faTrophy,       label: "Certificados",    roles: ["admin"] },
  { path: "relatorios",     icon: faChartLine,    label: "Relatórios",      roles: ["admin"] },
  { path: "avaliacoes",     icon: faStar,         label: "Avaliações",      roles: ["admin"] },
  { path: "forum",          icon: faComments,     label: "Fórum",           roles: ["admin"] },
  { path: "gamificacao",    icon: faMedal,        label: "Gamificação",     roles: ["admin"] },
  { path: "usuarios",       icon: faLock,         label: "Usuários",        roles: ["admin"] },
  { path: "instituicoes",   icon: faBuilding,     label: "Instituições",    roles: ["admin"] },
  { path: "meus-dados",     icon: faCircleUser,   label: "Meus Dados",      roles: ["admin","credenciador"] },
];

function MeusDados() {
  const { user: ctxUser, participantes, setParticipantes, instituicoes, showToast } = useAdmin();
  const isPalestrante = ctxUser?.role === "palestrante";
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nome: ctxUser?.nome || "", cpf: ctxUser?.cpf || "", cargo: ctxUser?.cargo || "", instituicao: ctxUser?.instituicao || "", titulo: ctxUser?.titulo || "", area: ctxUser?.area || "", mini_bio: ctxUser?.mini_bio || "" });
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!form.nome.trim()) { showToast("Nome obrigatório", "error"); return; }
    setSalvando(true);
    const updates = {
      nome: form.nome.trim(), cpf: form.cpf, cargo: form.cargo.trim(), instituicao: form.instituicao,
      ...(isPalestrante && { titulo: form.titulo, area: form.area, mini_bio: form.mini_bio }),
    };
    await atualizarProfile(ctxUser.id, updates);
    setParticipantes(participantes.map(p => p.id === ctxUser.id ? { ...p, ...updates } : p));
    setSalvando(false);
    setEditando(false);
    showToast("Dados atualizados!", "success");
  }

  const instList = (instituicoes || []).filter(i => i.ativo);
  const instSelectVal = instList.some(i => i.sigla === form.instituicao) ? form.instituicao : (form.instituicao ? "__outro__" : "");

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Meus Dados</h1></div>
      </div>
      <div style={{ maxWidth: 760 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem" }}>
          {/* Cabeçalho */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1.75rem", paddingBottom: "1.25rem", borderBottom: "1px solid var(--border)" }}>
            <AvatarUpload
              userId={ctxUser?.id}
              fotoUrl={ctxUser?.foto_url}
              iniciais={ctxUser?.foto_iniciais || ctxUser?.nome?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
              size={72}
              onUploaded={url => setParticipantes(participantes.map(p => p.id === ctxUser.id ? { ...p, foto_url: url } : p))}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.15rem" }}>{ctxUser?.nome}</div>
              <div style={{ fontSize: "0.82rem", color: "var(--text3)" }}>{ctxUser?.email}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text3)", marginTop: 2 }}>{ROLE_LABEL[ctxUser?.role] || ctxUser?.role}</div>
            </div>
            {!editando && (
              <button className="btn btn-outline btn-sm" style={{ marginLeft: "auto" }}
                onClick={() => { setForm({ nome: ctxUser?.nome || "", cpf: ctxUser?.cpf || "", cargo: ctxUser?.cargo || "", instituicao: ctxUser?.instituicao || "", titulo: ctxUser?.titulo || "", area: ctxUser?.area || "", mini_bio: ctxUser?.mini_bio || "" }); setEditando(true); }}>
                ✏️ Editar
              </button>
            )}
          </div>

          {editando ? (
            <div>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Nome completo</label>
                  <input className="form-input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">CPF</label>
                  <input className="form-input" style={{ fontFamily: "monospace" }} placeholder="000.000.000-00"
                    value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} maxLength={14} />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input className="form-input" value={ctxUser?.email} disabled style={{ background: "var(--surface2)", color: "var(--text3)" }} />
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Cargo / Título</label>
                  <input className="form-input" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} />
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Instituição</label>
                  <select className="form-input" value={instSelectVal}
                    onChange={e => setForm(f => ({ ...f, instituicao: e.target.value === "__outro__" ? "" : e.target.value }))}>
                    <option value="">Selecione...</option>
                    {instList.map(i => <option key={i.id} value={i.sigla}>{i.sigla} — {i.nome}</option>)}
                    <option value="__outro__">Outra (digitar)</option>
                  </select>
                  {instSelectVal === "__outro__" && (
                    <input className="form-input" style={{ marginTop: "0.4rem" }} placeholder="Nome da instituição"
                      value={form.instituicao} onChange={e => setForm(f => ({ ...f, instituicao: e.target.value }))} autoFocus />
                  )}
                </div>
                {isPalestrante && (<>
                  <div className="form-group">
                    <label className="form-label">Título / Formação</label>
                    <input className="form-input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Área de Atuação</label>
                    <input className="form-input" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ gridColumn: "1/-1" }}>
                    <label className="form-label">Mini Biografia</label>
                    <textarea className="form-input" rows={3} value={form.mini_bio} onChange={e => setForm(f => ({ ...f, mini_bio: e.target.value }))} />
                  </div>
                </>)}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button className="btn btn-primary btn-sm" onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
                <button className="btn btn-outline btn-sm" onClick={() => setEditando(false)} disabled={salvando}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem 2rem" }}>
              {[
                ["Nome",        ctxUser?.nome,        "1/-1"],
                ["CPF",         ctxUser?.cpf,         null],
                ["E-mail",      ctxUser?.email,       null],
                ["Cargo",       ctxUser?.cargo,       "1/-1"],
                ["Instituição", ctxUser?.instituicao, "1/-1"],
                ...(isPalestrante ? [
                  ["Título",   ctxUser?.titulo,   null],
                  ["Área",     ctxUser?.area,     null],
                  ["Mini Bio", ctxUser?.mini_bio, "1/-1"],
                ] : []),
              ].map(([label, val, span]) => (
                <div key={label} style={span ? { gridColumn: span } : {}}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>{label}</div>
                  <div style={{ fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.5 }}>{val || <span style={{ color: "var(--text3)" }}>—</span>}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminRoutes() {
  return useRoutes([
    { index: true,               element: <Dashboard /> },
    { path: "dashboard",         element: <Navigate to="/painel" replace /> },
    { path: "evento",            element: <Evento /> },
    { path: "programacao",       element: <Programacao /> },
    { path: "participantes",     element: <GestaoParticipantes /> },
    { path: "inscricoes",        element: <Navigate to="/painel/participantes" replace /> },
    { path: "palestrantes",      element: <Navigate to="/painel/participantes" replace /> },
    { path: "credenciamento",    element: <Credenciamento /> },
    { path: "presencas",         element: <Presencas /> },
    { path: "certificados",      element: <Certificados /> },
    { path: "modelo-cert",       element: <ModeloCertificado /> },
    { path: "relatorios",        element: <Relatorios /> },
    { path: "avaliacoes",        element: <Avaliacoes /> },
    { path: "forum",             element: <ForumAdmin /> },
    { path: "gamificacao",       element: <Gamificacao /> },
    { path: "usuarios",          element: <Usuarios /> },
    { path: "instituicoes",      element: <Instituicoes /> },
    { path: "meus-dados",        element: <MeusDados /> },
    { path: "*",                 element: <Navigate to="/painel" replace /> },
  ]);
}

export function PainelAdmin(props) {
  const { user, event, participantes, onLogout, onSwitchRole } = props;
  const menu = MENU.filter(m => m.roles.includes(user?.role || "admin"));
  const [navAberta, setNavAberta] = useState(false);

  return (
    <AdminContext.Provider value={props}>
      <div className="admin-layout">
        {/* MOBILE HEADER */}
        <div className="mobile-header">
          <button className="hamburger" onClick={() => setNavAberta(v => !v)} aria-label="Menu">
            <span/><span/><span/>
          </button>
          <span className="mobile-header-title">{event.nome} — Admin</span>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(201,168,76,0.2)", border:"1.5px solid var(--gold)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.72rem", fontWeight:700, color:"var(--gold-light)", flexShrink:0 }}>
            {user?.foto_iniciais || user?.nome?.split(" ").map(n=>n[0]).slice(0,2).join("") || "?"}
          </div>
        </div>

        {/* OVERLAY */}
        {navAberta && <div className="sidebar-overlay" onClick={() => setNavAberta(false)} />}

        {/* SIDEBAR */}
        <div className={`admin-sidebar${navAberta ? " open" : ""}`}>
          <div className="admin-sidebar-logo">
            <h2>{event.nome}</h2>
            <p style={{ fontSize: "0.68rem", opacity: 0.5, marginTop: "0.1rem" }}>Painel Administrativo</p>
          </div>
          <nav className="admin-nav">
            {menu.map(m => (
              <NavLink
                key={m.path || "dashboard"}
                to={m.path ? `/painel/${m.path}` : "/painel"}
                end={!m.path}
                className={({ isActive }) => `admin-nav-item${isActive ? " active" : ""}`}
                onClick={() => setNavAberta(false)}
              >
                <span className="admin-nav-icon"><FontAwesomeIcon icon={m.icon} fixedWidth /></span>
                {m.label}
              </NavLink>
            ))}
          </nav>
          <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(201,168,76,0.2)", border: "1.5px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, color: "var(--gold-light)", flexShrink: 0 }}>
                {user?.foto_iniciais || user?.nome?.split(" ").map(n=>n[0]).slice(0,2).join("") || "?"}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.8)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.nome}</div>
                <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.4)" }}>{ROLE_LABEL[user?.role] || user?.role}</div>
              </div>
            </div>
            <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", marginBottom: "0.5rem" }}>
              {participantes.length} inscritos · {participantes.filter(p=>p.credenciado).length} credenciados
            </div>
            {onSwitchRole && (
              <button className="btn btn-sm btn-outline" style={{ color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.2)", width: "100%", marginBottom: "0.4rem" }} onClick={onSwitchRole}>
                ⇄ Trocar perfil
              </button>
            )}
            <button className="btn btn-sm btn-outline" style={{ color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.2)", width: "100%" }} onClick={onLogout}>
              <FontAwesomeIcon icon={faArrowRightFromBracket} style={{ marginRight: 6 }} />Sair
            </button>
          </div>
        </div>

        {/* CONTEÚDO — roteado por AdminRoutes */}
        <div className="admin-content">
          <AdminRoutes />
        </div>
      </div>
    </AdminContext.Provider>
  );
}
