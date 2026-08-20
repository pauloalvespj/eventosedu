const ROLE_INFO = {
  admin:        { icon: "⚙️",  label: "Administrador",  desc: "Gerenciar evento, participantes e configurações" },
  credenciador: { icon: "🪪",  label: "Credenciador",   desc: "Credenciar participantes no evento" },
  participante: { icon: "👤",  label: "Participante",   desc: "Minha área, programação, presenças e fórum" },
};

export function RoleSelector({ user, roles, onSelect }) {
  // Card "Participante" mescla também a área de Palestrante quando o
  // profile tem os dois perfis — não existe mais role "palestrante" separado.
  const infoFor = role => {
    if (role === "participante" && user.is_palestrante) {
      return { icon: "👤🎤", label: "Participante e Palestrante", desc: "Minha área, programação, presenças, fórum e minhas palestras" };
    }
    return ROLE_INFO[role] || { icon: "👤", label: role, desc: "" };
  };
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "linear-gradient(135deg, #060f1e 0%, #0a1f3a 50%, #0f2a4e 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "2rem",
    }}>
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>👋</div>
        <h2 style={{ fontSize: "1.5rem", color: "#fff", fontWeight: 700, marginBottom: "0.5rem" }}>
          Olá, {user.nome.split(" ")[0]}!
        </h2>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.92rem" }}>
          Você tem múltiplos perfis. Com qual deseja entrar?
        </p>
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", maxWidth: 680, width: "100%" }}>
        {roles.map(role => {
          const info = infoFor(role);
          return (
            <button key={role} onClick={() => onSelect(role)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1.5px solid rgba(255,255,255,0.15)",
                borderRadius: "var(--radius-lg, 16px)",
                padding: "1.75rem 2rem",
                cursor: "pointer",
                textAlign: "center",
                color: "#fff",
                flex: "1 1 160px",
                maxWidth: 240,
                transition: "background 0.2s, border-color 0.2s, transform 0.15s, box-shadow 0.2s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(200,164,21,0.18)";
                e.currentTarget.style.borderColor = "rgba(200,164,21,0.7)";
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{info.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.4rem", color: "#fff" }}>{info.label}</div>
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{info.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
