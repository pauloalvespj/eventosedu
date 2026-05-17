import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { validarHashCertificado, formatData } from "../utils/helpers";

export function ValidarCertificado() {
  const [params] = useSearchParams();
  const userId  = params.get("u");
  const eventId = params.get("e");
  const sig     = params.get("s");

  const [status, setStatus] = useState("loading"); // loading | valid | invalid | error
  const [dados,  setDados]  = useState(null);

  useEffect(() => {
    async function verificar() {
      // 1. Parâmetros presentes?
      if (!userId || !eventId || !sig) { setStatus("invalid"); return; }

      // 2. Hash confere?
      if (!validarHashCertificado(userId, eventId, sig)) { setStatus("invalid"); return; }

      // 3. Busca dados públicos no banco
      const [{ data: profile }, { data: event }] = await Promise.all([
        supabase.from("profiles").select("nome, cargo, instituicao, cpf, role").eq("id", userId).single(),
        supabase.from("events").select("nome, nome_completo, data_inicio, data_fim, local").eq("id", eventId).single(),
      ]);

      if (!profile || !event) { setStatus("error"); return; }

      setDados({ profile, event });
      setStatus("valid");
    }
    verificar();
  }, [userId, eventId, sig]);

  const hash = sig || "";

  return (
    <div style={{ minHeight: "100vh", background: "var(--hero-gradient)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "'Poppins', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: "#fff", marginBottom: "0.25rem" }}>
            Enaudin
          </div>
          <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)" }}>Validação de Certificado</div>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: "var(--radius-lg)", padding: "2rem", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>

          {status === "loading" && (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⏳</div>
              Verificando certificado…
            </div>
          )}

          {status === "invalid" && (
            <div style={{ textAlign: "center", padding: "1rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>❌</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", color: "var(--danger)", marginBottom: "0.5rem" }}>
                Certificado inválido
              </div>
              <p style={{ fontSize: "0.88rem", color: "var(--text2)", lineHeight: 1.6 }}>
                O código de autenticidade não corresponde a nenhum certificado emitido por esta plataforma. Verifique se o link está correto.
              </p>
            </div>
          )}

          {status === "error" && (
            <div style={{ textAlign: "center", padding: "1rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", color: "var(--warn)", marginBottom: "0.5rem" }}>
                Não foi possível verificar
              </div>
              <p style={{ fontSize: "0.88rem", color: "var(--text2)" }}>
                Erro ao consultar os dados. Tente novamente mais tarde.
              </p>
            </div>
          )}

          {status === "valid" && dados && (
            <div>
              {/* Selo */}
              <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: "50%", background: "var(--success-bg)", border: "3px solid var(--success)", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.75rem" }}>✅</span>
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", color: "var(--success)", fontWeight: 700 }}>
                  Certificado autêntico
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--text3)", marginTop: "0.25rem" }}>
                  Documento verificado e autenticado
                </div>
              </div>

              {/* Dados do certificado */}
              <div style={{ background: "var(--surface2)", borderRadius: "var(--radius)", padding: "1.25rem", marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
                  Dados do Certificado
                </div>
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {[
                    ["Participante",  dados.profile.nome],
                    ["Cargo",         dados.profile.cargo || "—"],
                    ["Instituição",   dados.profile.instituicao || "—"],
                    ["CPF",           dados.profile.cpf || "—"],
                    ["Evento",        dados.event.nome_completo || dados.event.nome],
                    ["Período",       `${formatData(dados.event.data_inicio)} a ${formatData(dados.event.data_fim)}`],
                    ["Local",         dados.event.local || "—"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: "0.75rem", alignItems: "baseline" }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.04em", minWidth: 90, flexShrink: 0 }}>{k}</div>
                      <div style={{ fontSize: "0.88rem", color: "var(--text)", fontWeight: k === "Participante" ? 700 : 400 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Código */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1rem" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.35rem" }}>
                  Código de autenticidade
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "0.9rem", color: "var(--navy)", letterSpacing: "0.08em", wordBreak: "break-all" }}>
                  {hash}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>
          Este sistema de validação é operado pela plataforma Enaudin.
        </div>
      </div>
    </div>
  );
}
