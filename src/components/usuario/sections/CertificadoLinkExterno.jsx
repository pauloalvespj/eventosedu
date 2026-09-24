import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare, faFileCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { useUsuario } from "../UsuarioContext";

// Tela do modo "certificado por link externo" (event.certificado_modo === "link"):
// o certificado é emitido por um sistema de fora (ex.: PREX/UFC) — aqui só
// mostramos a mensagem e o link cadastrados pelo admin em Certificados.jsx,
// iguais para todos os participantes.
export function CertificadoLinkExterno() {
  const { event } = useUsuario();

  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", color: "var(--navy)", marginBottom: "1.5rem" }}>
        🏆 Meus Certificados
      </h2>

      <div style={{
        textAlign: "center", padding: "2.5rem 2rem", background: "var(--success-bg)",
        borderRadius: "var(--radius)", border: "1px solid var(--success)",
      }}>
        <FontAwesomeIcon icon={faFileCircleCheck} style={{ fontSize: "2.5rem", color: "var(--success)", marginBottom: "1rem" }} />
        {event.certificado_link_mensagem && (
          <p style={{ whiteSpace: "pre-line", lineHeight: 1.8, color: "var(--text2)", textAlign: "left", marginBottom: "1.5rem" }}>
            {event.certificado_link_mensagem}
          </p>
        )}
        {event.certificado_link_url && (
          <>
            <a
              href={event.certificado_link_url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-gold"
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              Acessar certificado
            </a>
            <div style={{ marginTop: "1rem" }}>
              <a
                href={event.certificado_link_url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: "0.85rem", color: "var(--success)", wordBreak: "break-all" }}
              >
                {event.certificado_link_url}
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
