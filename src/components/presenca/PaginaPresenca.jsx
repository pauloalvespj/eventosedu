import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatCPF, formatData, TIPO_LABEL, pareceCpfEmDigitacao, identificadorValido } from "../../utils/helpers";
import { registrarPresencaQR } from "../../lib/db";

export function PaginaPresenca({ atividadeId, atividades, presencas, setPresencas, user, onVoltar }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t");

  const atividade = atividades.find(a => a.id === Number(atividadeId));
  const [cpf, setCpf] = useState("");
  const [status, setStatus] = useState(null); // null | "sucesso" | "duplicado" | "nao_encontrado" | "token_invalido" | "erro"
  const [nomeSucesso, setNomeSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Confirmação é sempre no papel de participante — mesmo se a pessoa está
  // navegando o site como admin/credenciador, se o perfil dela também tem
  // o papel de participante, usamos o fluxo de 1 clique.
  const logadoComoParticipante = user && (user.role === "participante" || user.roles?.includes("participante"));

  const jaConfirmadoLogado = logadoComoParticipante &&
    presencas.find(p => p.participante_id === user.id && p.atividade_id === Number(atividadeId));

  // O servidor valida o token do QR, resolve o participante (logado ou CPF)
  // e registra presença + pontos. Nada é decidido no cliente.
  async function confirmar(cpfInformado = null) {
    setSalvando(true);
    const { data, error } = await registrarPresencaQR(atividadeId, token, cpfInformado);
    setSalvando(false);

    if (error || !data?.status) {
      console.error("Erro ao registrar presença:", error?.message);
      setStatus("erro");
      return;
    }
    if (data.status === "sucesso") {
      setPresencas(prev => [...prev, {
        id: Date.now(),
        participante_id: data.participante_id,
        atividade_id: Number(atividadeId),
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

  if (!atividade) return (
    <div className="qr-page">
      <div className="qr-card">
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
        <h2 style={{ color: "var(--danger)" }}>Atividade não encontrada</h2>
        <p style={{ color: "var(--text2)", margin: "0.75rem 0 1.5rem" }}>Este QR Code não corresponde a nenhuma atividade cadastrada.</p>
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
        <p style={{ color: "var(--text3)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{atividade.titulo}</p>
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
        <p style={{ color: "var(--text3)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>{atividade.titulo}</p>
        <button className="btn btn-primary btn-block" onClick={onVoltar}>Voltar ao site</button>
      </div>
    </div>
  );

  return (
    <div className="qr-page">
      <div className="qr-card" style={{ maxWidth: 460 }}>
        <div style={{ background: "linear-gradient(135deg,var(--hero-dark),var(--hero))", borderRadius: "var(--radius)", padding: "1.25rem", marginBottom: "1.5rem", color: "#fff" }}>
          <div style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: "0.35rem" }}>
            {TIPO_LABEL[atividade.tipo] || "Atividade"} · Confirmação de Presença
          </div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.05rem", marginBottom: "0.5rem", lineHeight: 1.4 }}>{atividade.titulo}</div>
          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
            📅 {formatData(atividade.dia)} · ⏱ {atividade.horario}{atividade.horario_fim ? `–${atividade.horario_fim}` : ""} · 📍 {atividade.local}
          </div>
        </div>

        {status === "erro" && (
          <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            ⚠️ Não foi possível registrar. Verifique sua conexão e tente novamente.
          </div>
        )}

        {status === "nao_credenciado" && (
          <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            🪪 <strong>Credenciamento pendente.</strong> Procure a organização do evento para fazer seu credenciamento antes de confirmar presença.
          </div>
        )}

        {/* Usuário logado: 1 clique */}
        {logadoComoParticipante && (
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

        {/* Não logado: confirma pelo CPF/e-mail — sem opção de login aqui (evita muita gente logando ao mesmo tempo) */}
        {!logadoComoParticipante && (
          <div>
            <div className="form-group">
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
            <button className="btn btn-outline btn-block" style={{ marginTop: "0.5rem" }} onClick={onVoltar}>Voltar ao site</button>
          </div>
        )}
      </div>
    </div>
  );
}
