import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faHourglassHalf, faFileCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { useUsuario } from "../UsuarioContext";

// Tela do modo "certificado externo" (event.certificado_externo === true):
// aqui o certificado não é gerado pela plataforma — é um arquivo que o admin
// sobe manualmente (um a um ou em massa, ver Certificados.jsx no painel
// admin) e fica em user.certificado_url. Enquanto não subiu, mostramos
// "em breve"; assim que sobe, o link já aparece pra download.
export function MeusCertificados() {
  const { user } = useUsuario();
  const disponivel = !!user.certificado_url;

  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", color: "var(--navy)", marginBottom: "1.5rem" }}>
        🏆 Meus Certificados
      </h2>

      {disponivel ? (
        <div style={{
          textAlign: "center", padding: "2.5rem 2rem", background: "var(--success-bg)",
          borderRadius: "var(--radius)", border: "1px solid var(--success)",
        }}>
          <FontAwesomeIcon icon={faFileCircleCheck} style={{ fontSize: "2.5rem", color: "var(--success)", marginBottom: "1rem" }} />
          <p style={{ fontWeight: 700, color: "var(--success)", marginBottom: "0.35rem" }}>Seu certificado está disponível!</p>
          <p style={{ fontSize: "0.85rem", color: "var(--text2)", marginBottom: "1.5rem" }}>{user.nome}</p>
          <a
            href={user.certificado_url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-gold"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <FontAwesomeIcon icon={faDownload} />
            Baixar certificado
          </a>
        </div>
      ) : (
        <div style={{
          textAlign: "center", padding: "3rem", background: "var(--surface)",
          borderRadius: "var(--radius)", border: "1px dashed var(--border2)",
        }}>
          <FontAwesomeIcon icon={faHourglassHalf} style={{ fontSize: "2.5rem", color: "var(--text3)", marginBottom: "1rem" }} />
          <p style={{ fontWeight: 700, color: "var(--text2)", marginBottom: "0.35rem" }}>Em breve</p>
          <p style={{ fontSize: "0.85rem", color: "var(--text3)" }}>
            Seu certificado ainda não foi disponibilizado. Assim que estiver pronto, aparecerá aqui para download.
          </p>
        </div>
      )}
    </div>
  );
}
