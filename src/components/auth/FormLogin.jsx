import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../../lib/supabase";
import { formatCPF, pareceCpfEmDigitacao, identificadorValido } from "../../utils/helpers";

function traduzirErroAuth(msg) {
  const m = msg.toLowerCase();
  if (m.includes("not found") || m.includes("not registered") || m.includes("user not found"))
    return "E-mail não encontrado no sistema.";
  if (m.includes("email not confirmed") || m.includes("not confirmed"))
    return "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.";
  if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("wrong password"))
    return "E-mail ou senha incorretos.";
  if (m.includes("too many") || m.includes("rate limit") || m.includes("after") || m.includes("limit exceeded"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (m.includes("disabled") || m.includes("not allowed"))
    return "Não identificamos o seu cadastro. Verifique o e-mail ou faça sua inscrição.";
  if (m.includes("network") || m.includes("fetch"))
    return "Erro de conexão. Verifique sua internet e tente novamente.";
  return "Ocorreu um erro inesperado. Tente novamente.";
}

export function FormLogin({ onLogin }) {
  const [modo, setModo] = useState("link"); // "link" | "senha"
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [etapa, setEtapa] = useState("email"); // "email" | "aguardando"
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function reset() {
    setEmail(""); setSenha("");
    setEtapa("email"); setErro("");
  }

  function handleIdentificadorChange(v) {
    setEmail(pareceCpfEmDigitacao(v) ? formatCPF(v.replace(/\D/g, "")) : v);
    setErro("");
  }
  // Resolve CPF → e-mail via a mesma RPC usada na inscrição (verificar_cadastro).
  // Se já for e-mail, retorna direto.
  async function resolverEmailOuCpf(valor) {
    const v = valor.trim();
    if (!v) return { email: null, error: "Informe seu e-mail ou CPF" };
    if (v.includes("@")) return { email: v, error: null };
    const cpfDigits = v.replace(/\D/g, "");
    if (cpfDigits.length !== 11) return { email: null, error: "CPF inválido" };
    const { data, error } = await supabase.rpc("verificar_cadastro", { p_email: "", p_cpf: formatCPF(cpfDigits) });
    if (error || !data?.email) return { email: null, error: "CPF não encontrado no sistema." };
    return { email: data.email, error: null };
  }

  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false);
  const [reenvioOk, setReenvioOk] = useState(false);

  async function handleLoginSenha() {
    setErro("");
    setEmailNaoConfirmado(false);
    setEnviando(true);
    const { email: emailResolvido, error: erroResolucao } = await resolverEmailOuCpf(email);
    if (erroResolucao) { setEnviando(false); setErro(erroResolucao); return; }
    setEmail(emailResolvido);
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailResolvido, password: senha });
    setEnviando(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
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
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setEnviando(false);
    if (!error) setReenvioOk(true);
  }

  async function handleRecuperarSenha() {
    setErro("");
    setEnviando(true);
    const { email: emailResolvido, error: erroResolucao } = await resolverEmailOuCpf(email);
    if (erroResolucao) { setEnviando(false); setErro(erroResolucao); return; }
    setEmail(emailResolvido);
    const { error } = await supabase.auth.resetPasswordForEmail(emailResolvido, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setEnviando(false);
    if (error) {
      setErro(traduzirErroAuth(error.message));
      return;
    }
    setEtapa("aguardando");
    setCountdown(60);
  }

  async function handleEnviarLink() {
    setErro("");
    setEnviando(true);
    const { email: emailResolvido, error: erroResolucao } = await resolverEmailOuCpf(email);
    if (erroResolucao) { setEnviando(false); setErro(erroResolucao); return; }
    setEmail(emailResolvido);
    const { error } = await supabase.auth.signInWithOtp({
      email: emailResolvido,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setEnviando(false);
    if (error) {
      setErro(traduzirErroAuth(error.message));
      return;
    }
    setEtapa("aguardando");
    setCountdown(60);
  }

  return (
    <div>
      {/* Seletor de modo */}
      <div style={{ display: "flex", background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: 3, marginBottom: "1.5rem", gap: 3 }}>
        {[["link","📧 Link por e-mail"],["senha","🔑 Senha"]].map(([m, l]) => (
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
            <label className="form-label">E-mail ou CPF</label>
            <input className="form-input" type="text" placeholder="seu@email.com ou CPF" value={email}
              onChange={e => handleIdentificadorChange(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <div style={{ position: "relative" }}>
              <input className="form-input" type={mostrarSenha ? "text" : "password"} placeholder="Sua senha" value={senha}
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
          <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
            <button
              style={{ background: "transparent", color: "var(--text2)", fontSize: "0.82rem", border: "none", cursor: "pointer", textDecoration: "underline" }}
              onClick={() => { setModo("recuperar"); setErro(""); setEtapa("email"); }}>
              Esqueci minha senha
            </button>
          </div>
        </div>
      )}

      {/* ── MODO RECUPERAR SENHA ── */}
      {modo === "recuperar" && (
        <div>
          {etapa === "email" && (
            <div>
              <p style={{ fontSize: "0.88rem", color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
                Informe seu e-mail cadastrado e enviaremos um link para você <strong>criar uma nova senha</strong>.
              </p>
              <div className="form-group">
                <label className="form-label">Seu e-mail ou CPF cadastrado</label>
                <input className="form-input" type="text" placeholder="seu@email.com ou CPF" value={email}
                  onChange={e => handleIdentificadorChange(e.target.value)} autoFocus
                  onKeyDown={e => e.key === "Enter" && !enviando && identificadorValido(email) && handleRecuperarSenha()} />
              </div>
              {erro && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.65rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>{erro}</div>}
              <button className="btn btn-primary btn-block" onClick={handleRecuperarSenha} disabled={enviando || !identificadorValido(email)}>
                {enviando ? "Enviando…" : "Enviar link de recuperação"}
              </button>
              <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
                <button style={{ background: "transparent", color: "var(--text2)", fontSize: "0.82rem", border: "none", cursor: "pointer" }}
                  onClick={() => { setModo("senha"); setErro(""); }}>
                  ← Voltar ao login
                </button>
              </div>
            </div>
          )}

          {etapa === "aguardando" && (
            <div>
              <div style={{ background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: "var(--radius-sm)", padding: "1.1rem 1.2rem", marginBottom: "1.25rem", fontSize: "0.88rem", textAlign: "center" }}>
                <div style={{ fontWeight: 700, color: "var(--success)", marginBottom: "0.5rem", fontSize: "1rem" }}>📧 Link enviado!</div>
                <div style={{ color: "var(--text2)", lineHeight: 1.6 }}>
                  Enviamos um link de recuperação para <strong>{email}</strong>.<br />
                  Clique no link para definir uma nova senha. Verifique também a pasta de spam.
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                <button style={{ background: "transparent", color: "var(--text2)", fontSize: "0.82rem", border: "none", cursor: "pointer" }}
                  onClick={() => { setEtapa("email"); setErro(""); }}>
                  ← Trocar e-mail
                </button>
                <button style={{ background: "transparent", color: countdown > 0 ? "var(--text3)" : "var(--navy)", fontSize: "0.82rem", border: "none", cursor: countdown > 0 ? "default" : "pointer", fontWeight: 600 }}
                  disabled={countdown > 0 || enviando} onClick={handleRecuperarSenha}>
                  {countdown > 0 ? `Reenviar em ${countdown}s` : "Reenviar link"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODO LINK POR E-MAIL ── */}
      {modo === "link" && (
        <div>
          {etapa === "email" && (
            <div>
              <div className="form-group">
                <label className="form-label">Seu e-mail ou CPF cadastrado</label>
                <input className="form-input" type="text" placeholder="seu@email.com ou CPF" value={email}
                  onChange={e => handleIdentificadorChange(e.target.value)} autoFocus />
              </div>
              {erro && <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.65rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>{erro}</div>}
              <button className="btn btn-primary btn-block" onClick={handleEnviarLink} disabled={enviando || !identificadorValido(email)}>
                {enviando ? "Enviando…" : "📧 Enviar link de acesso"}
              </button>
            </div>
          )}

          {etapa === "aguardando" && (
            <div>
              <div style={{ background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: "var(--radius-sm)", padding: "1.1rem 1.2rem", marginBottom: "1.25rem", fontSize: "0.88rem", textAlign: "center" }}>
                <div style={{ fontWeight: 700, color: "var(--success)", marginBottom: "0.5rem", fontSize: "1rem" }}>📧 Link enviado!</div>
                <div style={{ color: "var(--text2)", lineHeight: 1.6 }}>
                  Enviamos um link de acesso para <strong>{email}</strong>.<br />
                  Clique no link para entrar. Verifique também a pasta de spam.
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                <button style={{ background: "transparent", color: "var(--text2)", fontSize: "0.82rem", border: "none", cursor: "pointer" }}
                  onClick={() => { setEtapa("email"); setErro(""); }}>
                  ← Trocar e-mail
                </button>
                <button style={{ background: "transparent", color: countdown > 0 ? "var(--text3)" : "var(--navy)", fontSize: "0.82rem", border: "none", cursor: countdown > 0 ? "default" : "pointer", fontWeight: 600 }}
                  disabled={countdown > 0 || enviando} onClick={handleEnviarLink}>
                  {countdown > 0 ? `Reenviar em ${countdown}s` : "Reenviar link"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
