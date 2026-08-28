import { useState } from "react";
import { useRoutes, Navigate, NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar, faGear, faCalendarDays, faUsers, faIdBadge,
  faCircleCheck, faTrophy, faChartLine, faStar, faComments, faMedal, faLock,
  faBuilding, faKey,
} from "@fortawesome/free-solid-svg-icons";
import { ROLE_LABEL } from "../../utils/helpers";
import { AdminContext, useAdmin } from "./sections/AdminContext";
import { AvatarUpload, Sidebar, AlterarSenha } from "../base/index";
import { atualizarProfile } from "../../lib/db";
import { toggleHighContrast, isHighContrast } from "../../lib/a11y";

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
import { Administracao }  from "./sections/Administracao";
import { Instituicoes }   from "./sections/Instituicoes";

const MENU = [
  { path: "",               icon: faChartBar,    label: "Dashboard",       roles: ["admin"] },
  { path: "evento",         icon: faGear,         label: "Dados do Evento", roles: ["admin"] },
  { path: "programacao",    icon: faCalendarDays, label: "Programação",     roles: ["admin"] },
  { path: "participantes",  icon: faUsers,        label: "Participantes",   roles: ["admin"] },
  { path: "credenciamento", icon: faIdBadge,      label: "Credenciamento",  roles: ["admin"] },
  { path: "presencas",      icon: faCircleCheck,  label: "Presenças",       roles: ["admin"] },
  { path: "certificados",   icon: faTrophy,       label: "Certificados",    roles: ["admin"] },
  { path: "relatorios",     icon: faChartLine,    label: "Relatórios",      roles: ["admin"] },
  { path: "forum",          icon: faComments,     label: "Fórum",           roles: ["admin"] },
  { path: "gamificacao",    icon: faMedal,        label: "Gamificação",     roles: ["admin"] },
  { path: "instituicoes",   icon: faBuilding,     label: "Instituições",    roles: ["admin"] },
  { path: "avaliacoes",     icon: faStar,         label: "Avaliações",      roles: ["admin"] },
  { path: "administracao",  icon: faLock,         label: "Administração",   roles: ["admin"] },
];

function MeusDados() {
  const { user: ctxUser, participantes, setParticipantes, instituicoes, showToast } = useAdmin();
  const isPalestrante = ctxUser?.is_palestrante;
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nome: ctxUser?.nome || "", nome_publico: ctxUser?.nome_publico || "", cpf: ctxUser?.cpf || "", cargo: ctxUser?.cargo || "", instituicao: ctxUser?.instituicao || "", mini_bio: ctxUser?.mini_bio || "" });
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!form.nome.trim()) { showToast("Nome obrigatório", "error"); return; }
    if (!form.nome_publico.trim()) { showToast("Nome para crachá e divulgação obrigatório", "error"); return; }
    if (!form.cpf.trim()) { showToast("CPF obrigatório", "error"); return; }
    if (!form.cargo.trim()) { showToast("Cargo obrigatório", "error"); return; }
    if (!form.instituicao.trim()) { showToast("Instituição obrigatória", "error"); return; }
    setSalvando(true);
    const updates = {
      nome: form.nome.trim(), nome_publico: form.nome_publico.trim(), cpf: form.cpf, cargo: form.cargo.trim(), instituicao: form.instituicao,
      ...(isPalestrante && { mini_bio: form.mini_bio }),
    };
    const { error } = await atualizarProfile(ctxUser.id, updates);
    setSalvando(false);
    if (error) {
      showToast("Erro ao salvar dados: " + error.message, "error");
      return;
    }
    setParticipantes(participantes.map(p => p.id === ctxUser.id ? { ...p, ...updates } : p));
    setEditando(false);
    showToast("Dados atualizados!", "success");
  }

  const instList = (instituicoes || []).filter(i => i.ativo);
  const instSelectVal = instList.some(i => i.sigla === form.instituicao) ? form.instituicao : (form.instituicao ? "__outro__" : "");

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Meus Dados</h1><p>Informações do seu perfil no evento</p></div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <NavLink to="/painel/senha" className="btn btn-sm" style={{ textDecoration: "none", background: "#ffd452", borderColor: "#ffd452", color: "#3a2e00" }}>
            <FontAwesomeIcon icon={faKey} style={{ marginRight: 6 }} />Alterar senha
          </NavLink>
          {!editando && (
            <button className="btn btn-outline btn-sm"
              onClick={() => { setForm({ nome: ctxUser?.nome || "", nome_publico: ctxUser?.nome_publico || "", cpf: ctxUser?.cpf || "", cargo: ctxUser?.cargo || "", instituicao: ctxUser?.instituicao || "", mini_bio: ctxUser?.mini_bio || "" }); setEditando(true); }}>
              ✏️ Alterar dados
            </button>
          )}
        </div>
      </div>
      <div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem" }}>
          {/* Cabeçalho */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1.75rem", paddingBottom: "1.25rem", borderBottom: "1px solid var(--border)" }}>
            <AvatarUpload
              userId={ctxUser?.id}
              fotoUrl={ctxUser?.foto_url}
              iniciais={ctxUser?.nome?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || ctxUser?.foto_iniciais}
              size={72}
              onUploaded={url => setParticipantes(participantes.map(p => p.id === ctxUser.id ? { ...p, foto_url: url } : p))}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.15rem" }}>{ctxUser?.nome}</div>
              <div style={{ fontSize: "0.82rem", color: "var(--text3)" }}>{ctxUser?.email}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text3)", marginTop: 2 }}>{ctxUser?.instituicao || "—"}</div>
            </div>
          </div>

          {editando ? (
            <div>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Nome completo *</label>
                  <input className="form-input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Nome para Crachá e Divulgação *</label>
                  <input className="form-input" placeholder="Como você quer ser chamado(a) no crachá" value={form.nome_publico} onChange={e => setForm(f => ({ ...f, nome_publico: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">CPF *</label>
                  <input className="form-input" style={{ fontFamily: "monospace" }} placeholder="000.000.000-00"
                    value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} maxLength={14} />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input className="form-input" value={ctxUser?.email} disabled style={{ background: "var(--surface2)", color: "var(--text3)" }} />
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Cargo / Título *</label>
                  <input className="form-input" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} />
                </div>
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Instituição *</label>
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
                {isPalestrante && (
                  <div className="form-group" style={{ gridColumn: "1/-1" }}>
                    <label className="form-label">Mini Biografia</label>
                    <textarea className="form-input" rows={6} value={form.mini_bio} onChange={e => setForm(f => ({ ...f, mini_bio: e.target.value }))} />
                  </div>
                )}
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
                ["Nome para Crachá e Divulgação", ctxUser?.nome_publico, "1/-1"],
                ["CPF",         ctxUser?.cpf,         null],
                ["E-mail",      ctxUser?.email,       null],
                ["Cargo",       ctxUser?.cargo,       "1/-1"],
                ["Instituição", ctxUser?.instituicao, "1/-1"],
                ...(isPalestrante ? [
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

function CredenciamentoTab() {
  const { participantes, setParticipantes, showToast } = useAdmin();
  return <Credenciamento participantes={participantes} setParticipantes={setParticipantes} showToast={showToast} />;
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
    { path: "credenciamento",    element: <CredenciamentoTab /> },
    { path: "presencas",         element: <Presencas /> },
    { path: "certificados",      element: <Certificados /> },
    { path: "modelo-cert",       element: <ModeloCertificado /> },
    { path: "relatorios",        element: <Relatorios /> },
    { path: "avaliacoes",        element: <Avaliacoes /> },
    { path: "forum",             element: <ForumAdmin /> },
    { path: "gamificacao",       element: <Gamificacao /> },
    { path: "instituicoes",      element: <Instituicoes /> },
    { path: "administracao",     element: <Administracao /> },
    { path: "usuarios",          element: <Navigate to="/painel/administracao" replace /> },
    { path: "logs",              element: <Navigate to="/painel/administracao" replace /> },
    { path: "meus-dados",        element: <MeusDados /> },
    { path: "senha",             element: <AlterarSenhaTab /> },
    { path: "*",                 element: <Navigate to="/painel" replace /> },
  ]);
}

function AlterarSenhaTab() {
  const { showToast } = useAdmin();
  return <AlterarSenha showToast={showToast} voltarPath="/painel/meus-dados" />;
}

export function PainelAdmin(props) {
  const { user, event, onLogout, onSwitchRole } = props;
  const menu = MENU.filter(m => m.roles.includes(user?.role || "admin"));
  const [navAberta, setNavAberta] = useState(false);
  const [altoContraste, setAltoContraste] = useState(isHighContrast);

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
            {user?.nome?.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase() || user?.foto_iniciais || "?"}
          </div>
        </div>

        {/* OVERLAY */}
        {navAberta && <div className="sidebar-overlay" onClick={() => setNavAberta(false)} />}

        {/* SIDEBAR */}
        <Sidebar
          wrapClassName="admin-sidebar"
          open={navAberta}
          user={user}
          eventSigla={event.nome}
          roleLabel={user?.instituicao || ROLE_LABEL[user?.role] || user?.role}
          meusDadosPath="/painel/meus-dados"
          onSwitchRole={onSwitchRole}
          navWrapClassName="admin-nav"
          navItems={menu.map(m => ({
            key: m.path || "dashboard",
            to: m.path ? `/painel/${m.path}` : "/painel",
            end: !m.path,
            icon: m.icon,
            label: m.label,
            itemClassName: "admin-nav-item",
            onClick: () => setNavAberta(false),
          }))}
          altoContraste={altoContraste}
          onToggleAltoContraste={() => setAltoContraste(toggleHighContrast())}
          onLogout={onLogout}
        />

        {/* CONTEÚDO — roteado por AdminRoutes */}
        <div className="admin-content">
          <AdminRoutes />
        </div>
      </div>
    </AdminContext.Provider>
  );
}
