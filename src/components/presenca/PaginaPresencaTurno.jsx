import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatCPF, formatData } from "../../utils/helpers";
import { registrarPresencaTurnoQR } from "../../lib/db";

export function PaginaPresencaTurno({ turnoId, turnos, presencasTurno, setPresencasTurno, user, onVoltar, onLoginClick }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t");

  const turno = turnos.find(t => t.id === Number(turnoId));
  const [cpf, setCpf] = useState("");
  const [status, setStatus] = useState(null); // null | "sucesso" | "duplicado" | "nao_encontrado" | "token_invalido" | "erro"
  const [nomeSucesso, setNomeSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);

  const jaConfirmadoLogado = user && user.role === "participante" &&
    presencasTurno.find(p => p.participante_id === user.id && p.turno_id === Number(turnoId));

  // O servidor valida o token do QR, resolve o participante (logado ou CPF)
  // e registra presença + pontos. Nada é decidido no cliente.
  async function confirmar(cpfInformado = null) {
    setSalvando(true);
    const { data, error } = await registrarPresencaTurnoQR(turnoId, token, cpfInformado);
    setSalvando(false);

    if (error || !data?.status) {
      console.error("Erro ao registrar presença:", error?.message);
      setStatus("erro");
      return;
    }
    if (data.status === "sucesso") {
      setPresencasTurno(prev => [...prev, {
        id: Date.now(),
        participante_id: data.participante_id,
        turno_id: Number(turnoId),
        data_hora: new Date().toISOString(),
      }]);
    }
    setNomeSucesso(data.nome || "");
    setStatus(data.status);
  }

  function confirmarViaCPF() {
    return confirmar(cpf);
  }

  if (!turno) return (
    <div className="qr-page">
      <div className="qr-card">
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
        <h2 style={{ color: "var(--danger)" }}>Turno não encontrado</h2>
        <p style={{ color: "var(--text2)", margin: "0.75rem 0 1.5rem" }}>Este QR Code não corresponde a nenhum turno cadastrado.</p>
        <button className="btn btn-primary btn-block" onClick={onVoltar}>Voltar ao site</button>
      </div>
    </div>
  );

  if (status === "token_invalido") return (
    <div className="qr-page">
      <div className="qr-card">
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🚫</div>
        <h2 style={{ color: "var(--danger)" }}>Link inválido</h2>
        <p style={{ color: "var(--text2)", margin: "0.75rem 0 1.5rem" }}>
          Este link não é válido. Utilize o QR Code oficial exibido durante o evento.
        </p>
        <button className="btn btn-primary btn-block" onClick={onVoltar}>Voltar ao site</button>
      </div>
    </div>
  );

  if (status === "sucesso") return (
    <div className="qr-page">
      <div className="qr-card">
        <div style={{ fontSize: "4rem", marginBottom: "0.5rem", animation: "pulse 0.6s ease" }}>✅</div>
        <h2 style={{ color: "var(--success)", fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", marginBottom: "0.5rem" }}>Presença confirmada!</h2>
        <p style={{ color: "var(--text2)", marginBottom: "0.25rem" }}><strong>{nomeSucesso}</strong></p>
        <p style={{ color: "var(--text3)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{turno.nome}</p>
        <div style={{ background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1rem", fontSize: "0.85rem", color: "var(--success)", marginBottom: "1.5rem" }}>
          ✓ Registrado em {new Date().toLocaleString("pt-BR")}
        </div>
        <button className="btn btn-primary btn-block" onClick={onVoltar}>Voltar ao site</button>
        {!user && (
          <button className="btn btn-outline btn-block" style={{ marginTop: "0.5rem" }}
            onClick={() => { setStatus(null); setCpf(""); }}>
            Confirmar outra presença
          </button>
        )}
      </div>
    </div>
  );

  if (status === "duplicado") return (
    <div className="qr-page">
      <div className="qr-card">
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>ℹ️</div>
        <h2 style={{ fontFamily: "'Playfair Display',serif", color: "var(--warn)", fontSize: "1.3rem", marginBottom: "0.5rem" }}>Presença já registrada</h2>
        <p style={{ color: "var(--text2)", marginBottom: "0.25rem" }}><strong>{nomeSucesso}</strong></p>
        <p style={{ color: "var(--text3)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{turno.nome}</p>
        <button className="btn btn-primary btn-block" onClick={onVoltar}>Voltar ao site</button>
      </div>
    </div>
  );

  return (
    <div className="qr-page">
      <div className="qr-card" style={{ maxWidth: 460 }}>
        <div style={{ background: "linear-gradient(135deg,var(--hero-dark),var(--hero))", borderRadius: "var(--radius)", padding: "1.25rem", marginBottom: "1.5rem", color: "#fff" }}>
          <div style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: "0.35rem" }}>
            Turno · Confirmação de Presença
          </div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.05rem", marginBottom: "0.5rem", lineHeight: 1.4 }}>{turno.nome}</div>
          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
            📅 {formatData(turno.dia)}{turno.horario_inicio ? ` · ⏱ ${turno.horario_inicio}${turno.horario_fim ? `–${turno.horario_fim}` : ""}` : ""}
          </div>
        </div>

        {status === "erro" && (
          <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            ⚠️ Não foi possível registrar. Verifique sua conexão e tente novamente.
          </div>
        )}

        {/* Usuário logado: 1 clique */}
        {user && user.role === "participante" && (
          <div>
            {jaConfirmadoLogado ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>✅</div>
                <p style={{ fontWeight: 700, color: "var(--success)", marginBottom: "0.25rem" }}>Você já confirmou presença</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text3)", marginBottom: "1.5rem" }}>{user.nome}</p>
                <button className="btn btn-primary btn-block" onClick={onVoltar}>Voltar ao site</button>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", fontWeight: 700, margin: "0 auto 1rem" }}>
                  {user.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                </div>
                <p style={{ fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>{user.nome}</p>
                <p style={{ fontSize: "0.82rem", color: "var(--text3)", marginBottom: "1.5rem" }}>{user.instituicao} · {user.cargo}</p>
                <button className="btn btn-primary btn-block btn-lg"
                  style={{ background: "var(--success)", borderColor: "var(--success)", fontSize: "1rem" }}
                  onClick={() => confirmar()} disabled={salvando}>
                  {salvando ? "Registrando…" : "✓ Confirmar minha presença"}
                </button>
                <p style={{ fontSize: "0.75rem", color: "var(--text3)", marginTop: "0.75rem" }}>1 clique — sem digitar nada</p>
                <button className="btn btn-outline btn-block btn-sm" style={{ marginTop: "1rem" }} onClick={onVoltar}>Cancelar</button>
              </div>
            )}
          </div>
        )}

        {/* Não logado: login ou CPF */}
        {(!user || user.role !== "participante") && (
          <div>
            <div style={{ background: "var(--gold-pale)", border: "1px solid rgba(201,168,76,0.4)", borderRadius: "var(--radius-sm)", padding: "1rem", marginBottom: "1.25rem", textAlign: "center" }}>
              <p style={{ fontSize: "0.88rem", color: "var(--warn)", fontWeight: 600, marginBottom: "0.5rem" }}>
                ⚡ Faça login para confirmar com 1 clique
              </p>
              <button className="btn btn-primary btn-sm" onClick={onLoginClick}>
                Entrar na minha conta
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1rem 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: "0.78rem", color: "var(--text3)", fontWeight: 600 }}>ou confirme pelo CPF</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            <div className="form-group">
              <label className="form-label">Seu CPF</label>
              <input
                className="form-input"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={e => { setCpf(formatCPF(e.target.value)); setStatus(null); }}
                maxLength={14}
                style={{ textAlign: "center", fontSize: "1.15rem", letterSpacing: "0.06em", fontFamily: "monospace" }}
              />
            </div>

            {status === "nao_encontrado" && (
              <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                ⚠️ CPF não encontrado. Verifique se você está inscrito no evento.
              </div>
            )}

            <button className="btn btn-primary btn-block" onClick={confirmarViaCPF}
              disabled={cpf.replace(/\D/g, "").length < 11 || salvando}>
              {salvando ? "Registrando…" : "Confirmar Presença"}
            </button>
            <button className="btn btn-outline btn-block" style={{ marginTop: "0.5rem" }} onClick={onVoltar}>Voltar ao site</button>
          </div>
        )}
      </div>
    </div>
  );
}
