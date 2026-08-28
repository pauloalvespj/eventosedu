import { Link } from "react-router-dom";
import { FormLogin } from "./auth/FormLogin";

export function PainelLogin({ onLogin, event, eventLoaded }) {
  const logoUrl = eventLoaded ? event?.logo_url : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {logoUrl && (
          <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
            <Link to="/">
              <img src={logoUrl} alt={event?.nome} style={{ maxHeight: 56, maxWidth: 200, objectFit: "contain" }} />
            </Link>
          </div>
        )}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "28px" }}>
          <FormLogin
            onLogin={onLogin}
            event={event}
            eventLoaded={eventLoaded}
          />
        </div>
        <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
          <Link to="/" style={{ fontSize: "0.85rem", color: "var(--text3)", textDecoration: "none" }}>
            ← Voltar para o site
          </Link>
        </div>
      </div>
    </div>
  );
}
