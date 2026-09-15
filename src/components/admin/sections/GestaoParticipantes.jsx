import { useState } from "react";
import { useAdmin } from "./AdminContext";
import { Modal } from "../../base/index";
import { AbaGeral }          from "./participantes/AbaGeral";
import { AbaInscritos }     from "./participantes/AbaInscritos";
import { AbaPalestrantes }  from "./participantes/AbaPalestrantes";
import { AbaPreConvidados } from "./participantes/AbaPreConvidados";
import { AbaConfigEmail } from "./participantes/AbaConfigEmail";

const ABAS = [
  { key: "geral",         label: "Geral"                },
  { key: "inscritos",     label: "Participantes"        },
  { key: "palestrantes",  label: "Palestrantes"         },
  { key: "pre-convidados", label: "Leads" },
];

export function GestaoParticipantes() {
  const { participantes, palestrantes, convidados } = useAdmin();
  const [aba, setAba] = useState("geral");
  const [modalModelos, setModalModelos] = useState(false);

  const contagens = {
    geral:          participantes.length,
    inscritos:      participantes.filter(p => !p.is_palestrante).length,
    palestrantes:   palestrantes.length,
    "pre-convidados": (convidados || []).filter(c => c.status !== "inscrito").length,
  };

  return (
    <div>
      {/* Topbar com título e contagens */}
      <div className="admin-topbar">
        <div>
          <h1>Participantes</h1>
          <p>
            {participantes.length} inscrito{participantes.length !== 1 ? "s" : ""} ·{" "}
            {palestrantes.length} palestrante{palestrantes.length !== 1 ? "s" : ""} ·{" "}
            {(convidados || []).length} lead{(convidados || []).length !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => setModalModelos(true)}>📧 Modelos de E-mail</button>
      </div>

      {/* Abas */}
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
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            {a.label}
            {contagens[a.key] !== undefined && (
              <span style={{
                background: aba === a.key ? "var(--navy)" : "var(--surface2)",
                color: aba === a.key ? "#fff" : "var(--text3)",
                borderRadius: 99,
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "1px 7px",
                minWidth: 20,
                textAlign: "center",
              }}>
                {contagens[a.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba ativa */}
      {aba === "geral"          && <AbaGeral />}
      {aba === "inscritos"      && <AbaInscritos />}
      {aba === "palestrantes"   && <AbaPalestrantes />}
      {aba === "pre-convidados" && <AbaPreConvidados />}

      <Modal show={modalModelos} onClose={() => setModalModelos(false)} title="Modelos de E-mail" wide>
        <AbaConfigEmail />
      </Modal>
    </div>
  );
}
