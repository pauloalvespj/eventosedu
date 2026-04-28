import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays } from "@fortawesome/free-solid-svg-icons";
import { FormLogin } from "./auth/FormLogin";
import { FormInscricao } from "./auth/FormInscricao";
import { Modal } from "./base/index";
import { useState } from "react";

export function PainelLogin({ onLogin, instituicoes = [], showToast }) {
  const [showInscricao, setShowInscricao] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "var(--hero-gradient)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: "50%", background: "rgba(201,168,76,0.15)", border: "2px solid var(--gold)", marginBottom: "1rem" }}>
            <FontAwesomeIcon icon={faCalendarDays} style={{ color: "var(--gold)", fontSize: "1.4rem" }} />
          </div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", color: "#fff", marginBottom: "0.25rem" }}>Enaudin</div>
          <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)" }}>Acesse sua área do evento</div>
        </div>

        {/* Card de login */}
        <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", padding: "2rem", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          <FormLogin
            onLogin={onLogin}
            onClose={() => {}}
            onInscricaoClick={() => setShowInscricao(true)}
          />
        </div>
      </div>

      <Modal show={showInscricao} onClose={() => setShowInscricao(false)} title="Inscrição no Evento">
        <FormInscricao showToast={showToast} onClose={() => setShowInscricao(false)} instituicoes={instituicoes} />
      </Modal>
    </div>
  );
}
