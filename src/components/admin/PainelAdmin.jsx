import { useRoutes, NavLink, Navigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar, faGear, faCalendarDays, faUsers, faIdBadge,
  faCircleCheck, faTrophy, faChartLine, faStar, faComments, faMedal, faLock,
  faArrowRightFromBracket, faBuilding,
} from "@fortawesome/free-solid-svg-icons";
import { ROLE_LABEL } from "../../utils/helpers";
import { AdminContext } from "./sections/AdminContext";

import { Dashboard }            from "./sections/Dashboard";
import { Evento }               from "./sections/Evento";
import { Programacao }          from "./sections/Programacao";
import { GestaoParticipantes }  from "./sections/GestaoParticipantes";
import { Credenciamento }       from "./sections/Credenciamento";
import { Presencas }      from "./sections/Presencas";
import { Certificados }   from "./sections/Certificados";
import { Relatorios }     from "./sections/Relatorios";
import { Avaliacoes }     from "./sections/Avaliacoes";
import { ForumAdmin }     from "./sections/ForumAdmin";
import { Gamificacao }    from "./sections/Gamificacao";
import { Usuarios }       from "./sections/Usuarios";
import { Instituicoes }   from "./sections/Instituicoes";

const MENU = [
  { path: "",               icon: faChartBar,    label: "Dashboard",       roles: ["super_admin","admin","credenciador"] },
  { path: "evento",         icon: faGear,         label: "Dados do Evento", roles: ["super_admin","admin"] },
  { path: "programacao",    icon: faCalendarDays, label: "Programação",     roles: ["super_admin","admin"] },
  { path: "participantes",  icon: faUsers,        label: "Participantes",   roles: ["super_admin","admin"] },
  { path: "credenciamento", icon: faIdBadge,      label: "Credenciamento",  roles: ["super_admin","admin","credenciador"] },
  { path: "presencas",      icon: faCircleCheck,  label: "Presenças",       roles: ["super_admin","admin"] },
  { path: "certificados",   icon: faTrophy,       label: "Certificados",    roles: ["super_admin","admin"] },
  { path: "relatorios",     icon: faChartLine,    label: "Relatórios",      roles: ["super_admin","admin"] },
  { path: "avaliacoes",     icon: faStar,         label: "Avaliações",      roles: ["super_admin","admin"] },
  { path: "forum",          icon: faComments,     label: "Fórum",           roles: ["super_admin","admin"] },
  { path: "gamificacao",    icon: faMedal,        label: "Gamificação",     roles: ["super_admin","admin"] },
  { path: "usuarios",       icon: faLock,         label: "Usuários",        roles: ["super_admin"] },
  { path: "instituicoes",   icon: faBuilding,     label: "Instituições",    roles: ["super_admin","admin"] },
];

function AdminRoutes() {
  return useRoutes([
    { index: true,               element: <Dashboard /> },
    { path: "dashboard",         element: <Navigate to="/admin" replace /> },
    { path: "evento",            element: <Evento /> },
    { path: "programacao",       element: <Programacao /> },
    { path: "participantes",     element: <GestaoParticipantes /> },
    { path: "inscricoes",        element: <Navigate to="/admin/participantes" replace /> },
    { path: "palestrantes",      element: <Navigate to="/admin/participantes" replace /> },
    { path: "credenciamento",    element: <Credenciamento /> },
    { path: "presencas",         element: <Presencas /> },
    { path: "certificados",      element: <Certificados /> },
    { path: "relatorios",        element: <Relatorios /> },
    { path: "avaliacoes",        element: <Avaliacoes /> },
    { path: "forum",             element: <ForumAdmin /> },
    { path: "gamificacao",       element: <Gamificacao /> },
    { path: "usuarios",          element: <Usuarios /> },
    { path: "instituicoes",      element: <Instituicoes /> },
    { path: "*",                 element: <Navigate to="/admin" replace /> },
  ]);
}

export function PainelAdmin(props) {
  const { user, event, participantes, onLogout } = props;
  const menu = MENU.filter(m => m.roles.includes(user?.role || "admin"));

  return (
    <AdminContext.Provider value={props}>
      <div className="admin-layout">
        {/* SIDEBAR */}
        <div className="admin-sidebar">
          <div className="admin-sidebar-logo">
            <h2>{event.nome}</h2>
            <p style={{ fontSize: "0.68rem", opacity: 0.5, marginTop: "0.1rem" }}>Painel Administrativo</p>
          </div>
          <nav className="admin-nav">
            {menu.map(m => (
              <NavLink
                key={m.path || "dashboard"}
                to={m.path ? `/admin/${m.path}` : "/admin"}
                end={!m.path}
                className={({ isActive }) => `admin-nav-item${isActive ? " active" : ""}`}
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
