import { FormLogin } from "./auth/FormLogin";
import { FormInscricao } from "./auth/FormInscricao";
import { Modal } from "./base/index";
import { useState } from "react";

export function PainelLogin({ onLogin, instituicoes = [], showToast, event, eventLoaded }) {
  const [showInscricao, setShowInscricao] = useState(false);
  const logoUrl = eventLoaded ? event?.logo_url : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {logoUrl && (
          <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
            <img src={logoUrl} alt={event?.nome} style={{ maxHeight: 56, maxWidth: 200, objectFit: "contain" }} />
          </div>
        )}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px" }}>
          <FormLogin
            onLogin={onLogin}
            event={event}
            eventLoaded={eventLoaded}
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
