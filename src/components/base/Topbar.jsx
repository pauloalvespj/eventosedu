import { useState, useRef, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleHalfStroke, faArrowRightFromBracket, faCircleUser, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { AvatarUpload } from "./AvatarUpload";
import { nomeExibicao } from "../../utils/helpers";

// Barra superior (mobile + desktop) compartilhada entre admin e área do
// participante — título do evento, alto contraste e o menu do usuário
// (nome, Meus Dados, Trocar perfil, Sair) num dropdown pelo avatar.
export function Topbar({
  background, title,
  showHamburger, onHamburgerClick,
  user, roleLabel, meusDadosPath, onSwitchRole,
  altoContraste, onToggleAltoContraste,
  onLogout,
}) {
  const [aberto, setAberto] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    function onClickFora(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", onClickFora);
    return () => document.removeEventListener("mousedown", onClickFora);
  }, [aberto]);

  return (
    <div className="topbar" style={background ? { background } : undefined}>
      {showHamburger && (
        <button className="hamburger" onClick={onHamburgerClick} aria-label="Menu">
          <span/><span/><span/>
        </button>
      )}
      <Link to="/" className="topbar-title">{title}</Link>

      <div className="topbar-user" ref={wrapRef}>
        <button className="topbar-avatar-btn" onClick={() => setAberto(v => !v)} aria-expanded={aberto}>
          <AvatarUpload
            userId={user?.id}
            fotoUrl={user?.foto_url}
            iniciais={user?.nome ? user.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() : (user?.foto_iniciais || "?")}
            size={34}
            readonly
          />
          <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: "0.6rem", opacity: 0.7 }} />
        </button>

        {aberto && (
          <div className="topbar-dropdown">
            <div className="topbar-dropdown-header">
              <div className="topbar-dropdown-nome">{nomeExibicao(user)}</div>
              <div className="topbar-dropdown-role">{roleLabel}</div>
            </div>
            <NavLink to={meusDadosPath} className="topbar-dropdown-item" onClick={() => setAberto(false)}>
              <FontAwesomeIcon icon={faCircleUser} fixedWidth />Meus Dados
            </NavLink>
            {onSwitchRole && (
              <button type="button" className="topbar-dropdown-item" onClick={() => { setAberto(false); onSwitchRole(); }}>
                ⇄ Trocar perfil
              </button>
            )}
            <button type="button" className="topbar-dropdown-item" onClick={onToggleAltoContraste} aria-pressed={altoContraste}>
              <FontAwesomeIcon icon={faCircleHalfStroke} fixedWidth />Alto contraste
            </button>
            <button type="button" className="topbar-dropdown-item danger" onClick={onLogout}>
              <FontAwesomeIcon icon={faArrowRightFromBracket} fixedWidth />Sair
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
