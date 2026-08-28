import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

// Sidebar (desktop) compartilhada entre admin e área do participante — só
// navegação; identidade do usuário (Meus Dados, Trocar perfil, Sair) mora
// no menu do avatar, e o link pro site mora no título, ambos na Topbar.
export function Sidebar({
  wrapClassName, background, open,
  extraTop,
  navWrapClassName, navItems,
}) {
  return (
    <div className={`${wrapClassName}${open ? " open" : ""}`} style={background ? { background } : undefined}>
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
    </div>
  );
}
