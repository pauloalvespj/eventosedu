import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faEnvelope, faCalendarDays } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../../lib/supabase";
import { formatCPF, pareceCpfEmDigitacao, identificadorValido } from "../../utils/helpers";

function traduzirErroAuth(msg) {
  const m = msg.toLowerCase();
  if (m.includes("not found") || m.includes("not registered") || m.includes("user not found"))
    return "E-mail não encontrado no sistema.";
  if (m.includes("signups not allowed"))
    return "E-mail não encontrado. Verifique o endereço ou faça sua inscrição.";
  if (m.includes("email not confirmed") || m.includes("not confirmed"))
    return "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.";
  if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("wrong password"))
    return "E-mail ou senha incorretos.";
  if ((m.includes("token") || m.includes("otp")) && (m.includes("expired") || m.includes("invalid")))
    return "Código inválido ou expirado. Solicite um novo código.";
  if (m.includes("too many") || m.includes("rate limit") || m.includes("after") || m.includes("limit exceeded") || m.includes("429"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (m.includes("disabled") || m.includes("not allowed"))
    return "Não identificamos o seu cadastro. Verifique o e-mail ou faça sua inscrição.";
  if (m.includes("network") || m.includes("fetch") || m.includes("failed to fetch"))
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  return "Ocorreu um erro inesperado. Tente novamente.";
}

// Loga o erro completo do Supabase no console (mensagem/status/code) antes de
// traduzir pra uma mensagem amigável — sem isso, o erro real fica invisível.
function logAuthError(contexto, error) {
  console.error(`[auth:${contexto}]`, {
    message: error?.message,
    status: error?.status,
    code: error?.code,
    name: error?.name,
    raw: error,
  });
}

function maskEmail(email) {
  const at = email.indexOf("@");
  if (at < 0) return email;
  const local = email.slice(0, at);
  const shown = local.slice(0, Math.min(5, local.length));
  return `${shown}***${email.slice(at)}`;
}

const IconSquare = ({ icon }) => (
  <div style={{
    width: 48, height: 48, borderRadius: 12, margin: "0 auto",
    background: "rgba(var(--color-primary-rgb), 0.12)",
    display: "flex", alignItems: "center", justifyContent: "center",
  }}>
    <FontAwesomeIcon icon={icon} style={{ color: "var(--color-primary)", fontSize: "1.3rem" }} />
  </div>
);

export function FormLogin({ onLogin, event, eventLoaded, onInscricaoClick }) {
  const [etapa, setEtapa] = useState("login"); // "login" | "codigo"
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [emailResolvido, setEmailResolvido] = useState("");
  const [erro, setErro] = useState("");
  const [erroCodigo, setErroCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false);
  const [reenvioOk, setReenvioOk] = useState(false);
  const [codigo, setCodigo] = useState(["", "", "", "", "", ""]);
  const digitRefs = useRef([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handleIdentificadorChange(v) {
    setIdentificador(pareceCpfEmDigitacao(v) ? formatCPF(v.replace(/\D/g, "")) : v);
    setErro("");
  }

  // Resolve CPF → e-mail via a mesma RPC usada na inscrição (verificar_cadastro).
  // Se já for e-mail, retorna direto. Sempre normalizado (trim + lowercase) —
  // signInWithOtp e verifyOtp precisam receber exatamente o mesmo e-mail.
  async function resolverEmailOuCpf(valor) {
    const v = valor.trim();
    if (!v) return { email: null, error: "Informe seu e-mail ou CPF" };
    if (v.includes("@")) return { email: v.toLowerCase(), error: null };
    const cpfDigits = v.replace(/\D/g, "");
    if (cpfDigits.length !== 11) return { email: null, error: "CPF inválido" };
    const { data, error } = await supabase.rpc("verificar_cadastro", { p_email: "", p_cpf: formatCPF(cpfDigits) });
    if (error) logAuthError("verificar_cadastro", error);
    if (error || !data?.email) return { email: null, error: "CPF não encontrado no sistema." };
    return { email: data.email.trim().toLowerCase(), error: null };
  }

  async function handleLoginSenha() {
    setErro("");
    setEmailNaoConfirmado(false);
    setEnviando(true);
    const { email: emailResolv, error: erroResolucao } = await resolverEmailOuCpf(identificador);
    if (erroResolucao) { setEnviando(false); setErro(erroResolucao); return; }
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailResolv, password: senha });
    setEnviando(false);
    if (error) {
      logAuthError("signInWithPassword", error);
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        setEmailResolvido(emailResolv);
        setEmailNaoConfirmado(true);
      } else {
        setErro(traduzirErroAuth(error.message));
      }
      return;
    }
    onLogin(data.user);
  }

  async function reenviarConfirmacao() {
    setEnviando(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: emailResolvido });
    setEnviando(false);
    if (error) logAuthError("resend-signup", error);
    if (!error) setReenvioOk(true);
  }

  async function enviarCodigo(emailAlvo) {
    const { error } = await supabase.auth.signInWithOtp({
      email: emailAlvo,
      options: { shouldCreateUser: false },
    });
    if (error) logAuthError("signInWithOtp", error);
    return error;
  }

  async function handleReceberCodigo() {
    setErro("");
    setEnviandoCodigo(true);
    const { email: emailResolv, error: erroResolucao } = await resolverEmailOuCpf(identificador);
    if (erroResolucao) { setEnviandoCodigo(false); setErro(erroResolucao); return; }
    const error = await enviarCodigo(emailResolv);
    setEnviandoCodigo(false);
    if (error) { setErro(traduzirErroAuth(error.message)); return; }
    setEmailResolvido(emailResolv);
    setCodigo(["", "", "", "", "", ""]);
    setErroCodigo("");
    setEtapa("codigo");
    setCountdown(60);
    setTimeout(() => digitRefs.current[0]?.focus(), 0);
  }

  async function handleReenviarCodigo() {
    if (countdown > 0 || enviandoCodigo) return;
    setErroCodigo("");
    setEnviandoCodigo(true);
    const error = await enviarCodigo(emailResolvido);
    setEnviandoCodigo(false);
    if (error) { setErroCodigo(traduzirErroAuth(error.message)); return; }
    setCodigo(["", "", "", "", "", ""]);
    setCountdown(60);
    digitRefs.current[0]?.focus();
  }

  function voltarParaLogin() {
    setEtapa("login");
    setErroCodigo("");
    setCodigo(["", "", "", "", "", ""]);
  }

  function handleDigitChange(i, valor) {
    const v = valor.replace(/\D/g, "");
    setErroCodigo("");
    if (!v) {
      setCodigo(c => { const n = [...c]; n[i] = ""; return n; });
      return;
    }
    // Cola/typing rápido pode trazer mais de 1 char — usa o último dígito
    const digito = v.slice(-1);
    setCodigo(c => {
      const n = [...c];
      n[i] = digito;
      return n;
    });
    if (i < 5) digitRefs.current[i + 1]?.focus();
  }

  function handleDigitKeyDown(i, e) {
    if (e.key === "Backspace" && !codigo[i] && i > 0) {
      digitRefs.current[i - 1]?.focus();
    }
  }

  function handleDigitPaste(e) {
    const texto = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!texto) return;
    e.preventDefault();
    setCodigo(c => {
      const n = [...c];
      for (let i = 0; i < 6; i++) n[i] = texto[i] || n[i];
      return n;
    });
    const proximo = Math.min(texto.length, 5);
    digitRefs.current[proximo]?.focus();
  }

  async function handleConfirmarCodigo() {
    const token = codigo.join("").trim();
    if (token.length !== 6) { setErroCodigo("Digite os 6 dígitos do código."); return; }
    setErroCodigo("");
    setConfirmando(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: emailResolvido.trim().toLowerCase(), token, type: "email" });
    setConfirmando(false);
    if (error) {
      logAuthError("verifyOtp", error);
      setErroCodigo(traduzirErroAuth(error.message));
      return;
    }
    onLogin(data.user);
  }

  const logoUrl = eventLoaded ? event?.logo_url : null;
  const minutos = Math.floor(countdown / 60);
  const segundos = String(countdown % 60).padStart(2, "0");

  return (
    <div>
      {/* ── ETAPA LOGIN (senha + código) ── */}
      {etapa === "login" && (
        <div>
          {/* Cabeçalho — a logo do evento (quando existe) já aparece fora do card, em PainelLogin */}
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            {!logoUrl && (
              <>
                <div style={{ marginBottom: "0.85rem" }}><IconSquare icon={faCalendarDays} /></div>
                <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", fontWeight: 700, color: "var(--text)", letterSpacing: "0.01em", marginBottom: "0.25rem" }}>
                  {event?.nome || "Bem-vindo(a)"}
                </h1>
              </>
            )}
            <p style={{ color: "var(--text3)", fontSize: "0.85rem" }}>Acesse sua área do evento</p>
          </div>

          <div className="form-group">
            <label className="form-label">E-mail ou CPF</label>
            <input className="form-input" type="text" autoComplete="username" placeholder="seu@email.com ou CPF" value={identificador}
              onChange={e => handleIdentificadorChange(e.target.value)} autoFocus
              onKeyDown={e => e.key === "Enter" && !enviando && handleLoginSenha()} />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <div style={{ position: "relative" }}>
              <input className="form-input" type={mostrarSenha ? "text" : "password"} autoComplete="current-password" placeholder="Sua senha" value={senha}
                style={{ paddingRight: "2.5rem" }}
                onChange={e => { setSenha(e.target.value); setErro(""); }}
                onKeyDown={e => e.key === "Enter" && !enviando && handleLoginSenha()} />
              <button type="button" onClick={() => setMostrarSenha(v => !v)}
                title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", padding: 0, display: "flex" }}>
                <FontAwesomeIcon icon={mostrarSenha ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>

          {erro && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.65rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>{erro}</div>}

          {emailNaoConfirmado && (
            <div style={{ background: "#fffbeb", border: "1.5px solid #f59e0b", borderRadius: "var(--radius-sm)", padding: "1rem 1.1rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
              <div style={{ fontWeight: 700, color: "#b45309", marginBottom: "0.4rem", fontSize: "0.92rem" }}>
                📧 Confirme seu e-mail para continuar
              </div>
              <div style={{ color: "var(--text2)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
                Enviamos um link de confirmação para <strong>{emailResolvido}</strong>.<br />
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

          <button className="btn btn-primary btn-block" onClick={handleLoginSenha} disabled={enviando || !identificadorValido(identificador)}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>

          {/* Divisor "ou" */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.25rem 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: "0.78rem", color: "var(--text3)" }}>ou</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <button className="btn btn-outline btn-block" onClick={handleReceberCodigo} disabled={enviandoCodigo || !identificadorValido(identificador)}>
            <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: 8 }} />
            {enviandoCodigo ? "Enviando…" : "Receber código por e-mail"}
          </button>

          {onInscricaoClick && (
            <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "var(--text3)" }}>
              Ainda não tem inscrição?{" "}
              <button type="button" onClick={onInscricaoClick}
                style={{ background: "none", border: "none", padding: 0, color: "var(--color-primary)", fontWeight: 600, cursor: "pointer", fontSize: "inherit" }}>
                Inscreva-se
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ETAPA CÓDIGO ── */}
      {etapa === "codigo" && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ marginBottom: "0.85rem" }}><IconSquare icon={faEnvelope} /></div>
            <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", fontWeight: 700, color: "var(--text)", marginBottom: "0.35rem" }}>
              Confira seu e-mail
            </h1>
            <p style={{ color: "var(--text3)", fontSize: "0.85rem" }}>
              Enviamos um código de 6 dígitos para<br />
              <strong style={{ color: "var(--text2)", fontWeight: 600 }}>{maskEmail(emailResolvido)}</strong>
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "1.25rem" }} onPaste={handleDigitPaste}>
            {codigo.map((d, i) => (
              <input
                key={i}
                ref={el => { digitRefs.current[i] = el; }}
                className="form-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={d}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleDigitKeyDown(i, e)}
                autoFocus={i === 0}
                style={{ width: 42, height: 48, padding: 0, textAlign: "center", fontSize: "1.3rem", fontWeight: 700, borderRadius: 8 }}
              />
            ))}
          </div>

          {erroCodigo && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.65rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>{erroCodigo}</div>}

          <div style={{ textAlign: "center", marginBottom: "1.25rem", fontSize: "0.82rem", color: "var(--text3)" }}>
            {countdown > 0 ? (
              <>Reenviar código em <strong style={{ color: "var(--text2)" }}>{minutos}:{segundos}</strong></>
            ) : (
              <button type="button" onClick={handleReenviarCodigo} disabled={enviandoCodigo}
                style={{ background: "none", border: "none", padding: 0, color: "var(--color-primary)", fontWeight: 600, cursor: "pointer", fontSize: "inherit" }}>
                {enviandoCodigo ? "Reenviando…" : "Reenviar código"}
              </button>
            )}
          </div>

          <button className="btn btn-primary btn-block" onClick={handleConfirmarCodigo} disabled={confirmando}>
            {confirmando ? "Confirmando…" : "Confirmar código"}
          </button>

          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <button type="button" onClick={voltarParaLogin}
              style={{ background: "transparent", color: "var(--text3)", fontSize: "0.82rem", border: "none", cursor: "pointer" }}>
              ← Voltar para o login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
