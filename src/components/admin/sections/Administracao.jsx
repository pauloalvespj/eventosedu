import { useState } from "react";
import { Usuarios } from "./Usuarios";
import { Logs } from "./Logs";

const ABAS = [
  { key: "usuarios", label: "Usuários" },
  { key: "logs",      label: "Logs" },
];

export function Administracao() {
  const [aba, setAba] = useState("usuarios");

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Administração</h1><p>Equipe administrativa e auditoria do sistema</p></div>
      </div>

      <div className="admin-subtabs">
        {ABAS.map(a => (
          <button
            key={a.key}
            onClick={() => setAba(a.key)}
            style={{
              padding: "0.6rem 1.25rem",
              fontSize: "0.88rem",
              fontWeight: aba === a.key ? 700 : 500,
              color: aba === a.key ? "var(--navy)" : "var(--text2)",
              background: "none",
              border: "none",
              borderBottom: aba === a.key ? "2.5px solid var(--navy)" : "2.5px solid transparent",
              marginBottom: -2,
              cursor: "pointer",
              transition: "color 0.15s",
            }}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === "usuarios" && <Usuarios />}
      {aba === "logs"     && <Logs />}
    </div>
  );
}
