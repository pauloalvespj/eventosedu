import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleInfo, faTriangleExclamation, faBan, faSpinner, faIdBadge } from "@fortawesome/free-solid-svg-icons";
import { formatCPF, formatData, pareceCpfEmDigitacao, identificadorValido } from "../../utils/helpers";
import { registrarPresencaTurnoQR } from "../../lib/db";

function BotaoVoltar({ onVoltar, onLogout, claro }) {
  const cor = claro ? "rgba(255,255,255,0.8)" : "var(--text3)";
  return (
    <>
      <button onClick={onVoltar} title="Voltar ao site" aria-label="Voltar ao site"
        style={{ position: "absolute", top: "1rem", left: "1rem", background: "none", border: "none", cursor: "pointer", color: cor, fontSize: "1.1rem", padding: "0.25rem", lineHeight: 1, zIndex: 1 }}>
        ←
      </button>
      {onLogout && (
        <button onClick={onLogout} title="Sair"
          style={{ position: "absolute", top: "1.1rem", right: "1.1rem", background: "none", border: "none", cursor: "pointer", color: cor, fontSize: "0.72rem", padding: "0.25rem", lineHeight: 1, zIndex: 1 }}>
          Sair
        </button>
      )}
    </>
  );
}

export function PaginaPresencaTurno({ turnoId, turnos, presencasTurno, setPresencasTurno, user, onVoltar, onLoginClick, onLogout }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t");

  const turno = turnos.find(t => t.id === Number(turnoId));
  const [cpf, setCpf] = useState("");
  const [status, setStatus] = useState(null); // null | "sucesso" | "duplicado" | "nao_encontrado" | "token_invalido" | "erro"
  const [nomeSucesso, setNomeSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Confirmação é sempre no papel de participante — mesmo se a pessoa está
  // navegando o site como admin/credenciador, se o perfil dela também tem
  // o papel de participante, usamos o fluxo de 1 clique.
  const logadoComoParticipante = user && (user.role === "participante" || user.roles?.includes("participante"));

  const jaConfirmadoLogado = logadoComoParticipante &&
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

  function confirmarViaIdentificador() {
    return confirmar(cpf);
  }

  function handleIdentificadorChange(v) {
    setCpf(pareceCpfEmDigitacao(v) ? formatCPF(v.replace(/\D/g, "")) : v);
    setStatus(null);
  }

  // Turnos ainda não carregaram (dado de fase 2) — evita piscar "não encontrado" à toa
  if (!turno && turnos.length === 0) return (
    <div className="qr-page">
      <div className="qr-card" style={{ position: "relative" }}>
        <BotaoVoltar onVoltar={onVoltar} onLogout={user ? onLogout : null} />
        <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: "1.75rem", color: "var(--text3)", marginBottom: "1rem" }} />
        <p style={{ color: "var(--text2)" }}>Carregando…</p>
      </div>
    </div>
  );

  if (!turno) return (
    <div className="qr-page">
      <div className="qr-card" style={{ position: "relative" }}>
        <BotaoVoltar onVoltar={onVoltar} onLogout={user ? onLogout : null} />
        <FontAwesomeIcon icon={faTriangleExclamation} style={{ fontSize: "2.25rem", color: "var(--danger)", marginBottom: "1rem" }} />
        <h2 style={{ color: "var(--danger)" }}>Turno não encontrado</h2>
        <p style={{ color: "var(--text2)", margin: "0.75rem 0 0" }}>Este QR Code não corresponde a nenhum turno cadastrado.</p>
      </div>
    </div>
  );

  if (status === "token_invalido") return (
    <div className="qr-page">
      <div className="qr-card" style={{ position: "relative" }}>
        <BotaoVoltar onVoltar={onVoltar} onLogout={user ? onLogout : null} />
        <FontAwesomeIcon icon={faBan} style={{ fontSize: "2.25rem", color: "var(--danger)", marginBottom: "1rem" }} />
        <h2 style={{ color: "var(--danger)" }}>Link inválido</h2>
        <p style={{ color: "var(--text2)", margin: "0.75rem 0 0" }}>
          Este link não é válido. Utilize o QR Code oficial exibido durante o evento.
        </p>
      </div>
    </div>
  );

  if (status === "sucesso") return (
    <div className="qr-page">
      <div className="qr-card" style={{ position: "relative" }}>
        <BotaoVoltar onVoltar={onVoltar} onLogout={user ? onLogout : null} />
        <FontAwesomeIcon icon={faCircleCheck} style={{ fontSize: "3.5rem", color: "var(--success)", marginBottom: "0.75rem" }} />
        <h2 style={{ color: "var(--success)", fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", marginBottom: "0.5rem" }}>Presença confirmada!</h2>
        <p style={{ color: "var(--text2)", marginBottom: "0.25rem" }}><strong>{nomeSucesso}</strong></p>
        <p style={{ color: "var(--text3)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{turno.nome}</p>
        <div style={{ background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: "var(--radius-sm)", padding: "0.75rem 1rem", fontSize: "0.85rem", color: "var(--success)" }}>
          ✓ Registrado em {new Date().toLocaleString("pt-BR")}
        </div>
        <button onClick={onVoltar}
          style={{ background: "transparent", border: "none", color: "var(--text3)", fontSize: "0.82rem", cursor: "pointer", textDecoration: "underline", padding: 0, marginTop: "1.25rem" }}>
          ← Voltar ao site
        </button>
      </div>
    </div>
  );

  if (status === "duplicado") return (
    <div className="qr-page">
      <div className="qr-card" style={{ position: "relative" }}>
        <BotaoVoltar onVoltar={onVoltar} onLogout={user ? onLogout : null} />
        <FontAwesomeIcon icon={faCircleInfo} style={{ fontSize: "2.75rem", color: "var(--warn)", marginBottom: "0.75rem" }} />
        <h2 style={{ fontFamily: "'Playfair Display',serif", color: "var(--warn)", fontSize: "1.3rem", marginBottom: "0.5rem" }}>Presença já registrada</h2>
        <p style={{ color: "var(--text2)", marginBottom: "0.25rem" }}><strong>{nomeSucesso}</strong></p>
        <p style={{ color: "var(--text3)", fontSize: "0.85rem" }}>{turno.nome}</p>
      </div>
    </div>
  );

  return (
    <div className="qr-page">
      <div className="qr-card" style={{ maxWidth: 460, position: "relative", padding: 0, overflow: "hidden" }}>
        <BotaoVoltar onVoltar={onVoltar} onLogout={user ? onLogout : null} claro />
        <div style={{ background: "linear-gradient(135deg,var(--navy) 0%,var(--teal) 100%)", padding: "2.25rem 2rem 1.25rem", color: "#fff" }}>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.5rem", lineHeight: 1.3 }}>Confirmação de Presença</div>
          <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", marginTop: "0.35rem" }}>{turno.nome}</div>
        </div>

        <div style={{ padding: "1.5rem 2rem 2rem" }}>
        {status === "erro" && (
          <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            ⚠️ Não foi possível registrar. Verifique sua conexão e tente novamente.
          </div>
        )}

        {status === "nao_credenciado" && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", background: "var(--danger-bg)", color: "var(--danger)", padding: "0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            <FontAwesomeIcon icon={faIdBadge} style={{ marginTop: "0.15rem", flexShrink: 0 }} />
            <span><strong>Credenciamento pendente.</strong> Procure a organização do evento para fazer seu credenciamento antes de confirmar presença.</span>
          </div>
        )}

        {/* Usuário logado: 1 clique */}
        {logadoComoParticipante && (
          <div>
            {jaConfirmadoLogado ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>✅</div>
                <p style={{ fontWeight: 700, color: "var(--success)", marginBottom: "0.25rem" }}>Você já confirmou presença</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text3)" }}>{user.nome}</p>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontWeight: 700, color: "var(--text)", marginBottom: "0.2rem" }}>{user.nome}</p>
                <p style={{ fontSize: "0.82rem", color: "var(--text3)", marginBottom: "1.5rem" }}>{user.instituicao} · {user.cargo}</p>
                <button className="btn btn-primary btn-block btn-lg"
                  style={{ background: "var(--success)", borderColor: "var(--success)", fontSize: "1rem" }}
                  onClick={() => confirmar()} disabled={salvando}>
                  {salvando ? "Registrando…" : "✓ Confirmar minha presença"}
                </button>
                <p style={{ fontSize: "0.75rem", color: "var(--text3)", marginTop: "0.75rem" }}>1 clique — sem digitar nada</p>
              </div>
            )}
          </div>
        )}

        {/* Não logado: CPF primeiro, login como atalho depois */}
        {!logadoComoParticipante && (
          <div>
            <div className="form-group" style={{ textAlign: "left" }}>
              <label className="form-label">Seu CPF ou e-mail</label>
              <input
                className="form-input"
                value={cpf}
                onChange={e => handleIdentificadorChange(e.target.value)}
                maxLength={40}
                style={{ textAlign: "center", fontSize: "1.05rem", letterSpacing: "0.03em", fontFamily: "monospace" }}
              />
            </div>

            {status === "nao_encontrado" && (
              <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                ⚠️ CPF/e-mail não encontrado. Verifique se você está inscrito no evento.
              </div>
            )}

            <button className="btn btn-primary btn-block" onClick={confirmarViaIdentificador}
              disabled={!identificadorValido(cpf) || salvando}>
              {salvando ? "Registrando…" : "Confirmar Presença"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.25rem 0 1rem" }}>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              <span style={{ fontSize: "0.78rem", color: "var(--text3)", fontWeight: 600 }}>ou</span>
              <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>

            <div style={{ background: "var(--gold-pale)", border: "1px solid rgba(201,168,76,0.4)", borderRadius: "var(--radius-sm)", padding: "1rem", textAlign: "center" }}>
              <p style={{ fontSize: "0.88rem", color: "var(--warn)", fontWeight: 600, marginBottom: "0.5rem" }}>
                ⚡ Faça login para confirmar com 1 clique da próxima vez
              </p>
              <button className="btn btn-primary btn-sm" onClick={onLoginClick}>
                Entrar na minha conta
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
