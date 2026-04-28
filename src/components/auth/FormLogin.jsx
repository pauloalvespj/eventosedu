import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export function FormLogin({ onLogin, onClose, onInscricaoClick }) {
  const [modo, setModo] = useState("senha"); // "senha" | "codigo"
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [etapa, setEtapa] = useState("email"); // "email" | "codigo_digitado"
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function reset() {
    setEmail(""); setSenha(""); setCodigo("");
    setEtapa("email"); setErro("");
  }

  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false);
  const [reenvioOk, setReenvioOk] = useState(false);

  async function handleLoginSenha() {
    setErro("");
    setEmailNaoConfirmado(false);
    setEnviando(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setEnviando(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        setEmailNaoConfirmado(true);
      } else if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
        setErro("E-mail ou senha incorretos.");
      } else if (msg.includes("too many requests")) {
        setErro("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else {
        setErro("Erro ao entrar. Tente novamente.");
      }
      return;
    }
    onLogin(data.user);
  }

  async function reenviarConfirmacao() {
    setEnviando(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setEnviando(false);
    if (!error) setReenvioOk(true);
  }

  async function handleEnviarCodigo() {
    setErro("");
    setEnviando(true);
    // signInWithOtp envia magic link / OTP por e-mail via Supabase
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }, // só permite e-mails já cadastrados
    });
    setEnviando(false);
    if (error) {
      setErro(error.message.includes("not found") || error.message.includes("registered")
        ? "E-mail não encontrado no sistema."
        : error.message);
      return;
    }
    setEtapa("codigo_digitado");
    setCountdown(60);
  }

  async function handleValidarCodigo() {
    setErro("");
    setEnviando(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: codigo,
      type: "email",
    });
    setEnviando(false);
    if (error) {
      setErro(error.message.includes("expired")
        ? "Código expirado. Solicite um novo."
        : "Código inválido.");
      return;
    }
    onLogin(data.user);
  }

  return (
    <div>
      {/* Seletor de modo */}
      <div style={{ display: "flex", background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: 3, marginBottom: "1.5rem", gap: 3 }}>
        {[["senha","🔑 Senha"],["codigo","📧 Código por e-mail"]].map(([m, l]) => (
          <button key={m} onClick={() => { setModo(m); reset(); }}
            style={{ flex: 1, padding: "0.5rem", borderRadius: 6, border: "none", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", transition: "all 0.2s",
              background: modo === m ? "var(--navy)" : "transparent",
              color: modo === m ? "#fff" : "var(--text2)" }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── MODO SENHA ── */}
      {modo === "senha" && (
        <div>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="form-input" type="email" placeholder="seu@email.com" value={email}
              onChange={e => { setEmail(e.target.value); setErro(""); }} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input className="form-input" type="password" placeholder="Sua senha" value={senha}
              onChange={e => { setSenha(e.target.value); setErro(""); }}
              onKeyDown={e => e.key === "Enter" && !enviando && handleLoginSenha()} />
          </div>
          {erro && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.65rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>{erro}</div>}
          {emailNaoConfirmado && (
            <div style={{ background: "#fffbeb", border: "1.5px solid #f59e0b", borderRadius: "var(--radius-sm)", padding: "1rem 1.1rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
              <div style={{ fontWeight: 700, color: "#b45309", marginBottom: "0.4rem", fontSize: "0.92rem" }}>
                📧 Confirme seu e-mail para continuar
              </div>
              <div style={{ color: "var(--text2)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
                Enviamos um link de confirmação para <strong>{email}</strong>.<br />
                Verifique sua caixa de entrada e a pasta de spam.
              </div>
              {reenvioOk ? (
                <div style={{ color: "var(--success)", fontWeight: 600, fontSize: "0.85rem" }}>
                  ✅ Novo e-mail enviado! Verifique sua caixa de entrada.
                </div>
              ) : (
                <button className="btn btn-sm btn-outline" onClick={reenviarConfirmacao} disabled={enviando}
                  style={{ borderColor: "#f59e0b", color: "#b45309" }}>
                  {enviando ? "Enviando…" : "↩ Reenviar e-mail de confirmação"}
                </button>
              )}
            </div>
          )}
          <button className="btn btn-primary btn-block" onClick={handleLoginSenha} disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </div>
      )}

      {/* ── MODO CÓDIGO POR E-MAIL ── */}
      {modo === "codigo" && (
        <div>
          {etapa === "email" && (
            <div>
              <div className="form-group">
                <label className="form-label">Seu e-mail cadastrado</label>
                <input className="form-input" type="email" placeholder="seu@email.com" value={email}
                  onChange={e => { setEmail(e.target.value); setErro(""); }} autoFocus />
              </div>
              {erro && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.65rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>{erro}</div>}
              <button className="btn btn-primary btn-block" onClick={handleEnviarCodigo} disabled={enviando || !email.includes("@")}>
                {enviando ? "Enviando…" : "📧 Enviar código de acesso"}
              </button>
              <p style={{ fontSize: "0.78rem", color: "var(--text3)", textAlign: "center", marginTop: "0.75rem" }}>
                Um código de 6 dígitos será enviado para o seu e-mail. Válido por 10 minutos.
              </p>
            </div>
          )}

          {etapa === "codigo_digitado" && (
            <div>
              <div style={{ background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: "var(--radius-sm)", padding: "0.85rem 1rem", marginBottom: "1.25rem", fontSize: "0.88rem" }}>
                <div style={{ fontWeight: 700, color: "var(--success)", marginBottom: "0.25rem" }}>✅ Código enviado para:</div>
                <div style={{ color: "var(--text)", fontFamily: "monospace" }}>{email}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Código de 6 dígitos</label>
                <input className="form-input" placeholder="000000" value={codigo} maxLength={6}
                  onChange={e => { setCodigo(e.target.value.replace(/\D/g, "")); setErro(""); }}
                  onKeyDown={e => e.key === "Enter" && codigo.length === 6 && !enviando && handleValidarCodigo()}
                  style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.3em", fontFamily: "monospace", fontWeight: 700 }} autoFocus />
              </div>

              {erro && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.65rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>{erro}</div>}

              <button className="btn btn-primary btn-block" onClick={handleValidarCodigo} disabled={codigo.length !== 6 || enviando}>
                {enviando ? "Verificando…" : "Verificar e entrar"}
              </button>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                <button style={{ background: "transparent", color: "var(--text2)", fontSize: "0.82rem", border: "none", cursor: "pointer" }}
                  onClick={() => { setEtapa("email"); setCodigo(""); setErro(""); }}>
                  ← Trocar e-mail
                </button>
                <button style={{ background: "transparent", color: countdown > 0 ? "var(--text3)" : "var(--navy)", fontSize: "0.82rem", border: "none", cursor: countdown > 0 ? "default" : "pointer", fontWeight: 600 }}
                  disabled={countdown > 0 || enviando} onClick={() => { setCodigo(""); setErro(""); handleEnviarCodigo(); }}>
                  {countdown > 0 ? `Reenviar em ${countdown}s` : "Reenviar código"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rodapé */}
      <div style={{ borderTop: "1px solid var(--border)", marginTop: "1.25rem", paddingTop: "1rem" }}>
        <div style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text2)", marginBottom: "0.75rem" }}>
          Não tem conta?{" "}
          <button style={{ background: "transparent", color: "var(--navy)", fontWeight: 700, border: "none", cursor: "pointer" }}
            onClick={() => { onClose(); onInscricaoClick(); }}>
            Inscreva-se gratuitamente
          </button>
        </div>
      </div>
    </div>
  );
}
