import { NavLink, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleHalfStroke, faArrowRightFromBracket, faCircleUser, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { AvatarUpload } from "./AvatarUpload";
import { nomeExibicao } from "../../utils/helpers";

// Sidebar (desktop) compartilhada entre admin e área do participante — só o
// que vai no meio (itens de navegação) muda; topo (identidade + trocar
// perfil) e rodapé (Meus Dados + alto contraste + sair) são sempre iguais.
export function Sidebar({
  wrapClassName, background, open,
  user, roleLabel, meusDadosPath, onSwitchRole,
  eventSigla,
  extraTop,
  navWrapClassName, navItems,
  altoContraste, onToggleAltoContraste,
  onLogout,
}) {
  return (
    <div className={`${wrapClassName}${open ? " open" : ""}`} style={background ? { background } : undefined}>
      {eventSigla && (
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.18)", color: "var(--white-hi)", textDecoration: "none", fontWeight: 700, fontSize: "0.85rem" }}>
          <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: "0.75rem", color: "var(--white-low)" }} />
          {eventSigla}
        </Link>
      )}
      <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <AvatarUpload
            userId={user?.id}
            fotoUrl={user?.foto_url}
            iniciais={user?.nome ? user.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() : (user?.foto_iniciais || "?")}
            size={36}
            readonly
          />
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: "0.78rem", color: "var(--white-hi)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nomeExibicao(user)}</div>
            <div style={{ fontSize: "0.68rem", color: "var(--white-low)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{roleLabel}</div>
          </div>
        </div>
        {onSwitchRole && (
          <button className="btn btn-sm btn-outline" style={{ color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.2)", width: "100%", marginTop: "0.75rem" }} onClick={onSwitchRole}>
            ⇄ Trocar perfil
          </button>
        )}
      </div>

      {extraTop}

      <nav className={navWrapClassName}>
        {navItems.map(item => (
          <NavLink key={item.key} to={item.to} end={item.end}
            className={({ isActive }) => `${item.itemClassName}${isActive ? " active" : ""}`}
            onClick={item.onClick}>
            <span className="admin-nav-icon"><FontAwesomeIcon icon={item.icon} fixedWidth /></span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <NavLink to={meusDadosPath} className="btn btn-sm btn-outline"
          style={{ color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.2)", width: "100%", marginBottom: "0.4rem", textDecoration: "none" }}>
          <FontAwesomeIcon icon={faCircleUser} style={{ marginRight: 6 }} />Meus Dados
        </NavLink>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button className="btn btn-sm btn-outline" title="Alto contraste" aria-label="Alto contraste"
            style={{ color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.2)", flexShrink: 0, padding: "0.4rem 0.6rem" }}
            onClick={onToggleAltoContraste} aria-pressed={altoContraste}>
            <FontAwesomeIcon icon={faCircleHalfStroke} />
          </button>
          <button className="btn btn-sm btn-outline" style={{ color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.2)", flex: 1 }} onClick={onLogout}>
            <FontAwesomeIcon icon={faArrowRightFromBracket} style={{ marginRight: 6 }} />Sair
          </button>
        </div>
      </div>
    </div>
  );
}
