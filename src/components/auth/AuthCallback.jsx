import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

// Capturado no load do módulo, antes de o Supabase limpar o hash da URL.
// type=recovery indica link de redefinição de senha.
const HASH_TYPE = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type");

export function AuthCallback() {
  const navigate = useNavigate();
  const [erro, setErro] = useState(false);
  const [definindoSenha, setDefinindoSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  async function salvarNovaSenha() {
    setErroSenha("");
    if (novaSenha.length < 6) { setErroSenha("A senha deve ter no mínimo 6 caracteres."); return; }
    if (novaSenha !== confirmaSenha) { setErroSenha("As senhas não conferem."); return; }
    setSalvandoSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSalvandoSenha(false);
    if (error) {
      setErroSenha("Não foi possível salvar a senha. Tente novamente.");
      return;
    }
    navigate("/painel", { replace: true });
  }

  useEffect(() => {
    async function handle() {
      // Salva dados de perfil pendentes (CPF, instituição, cargo) coletados antes do login
      async function salvarPerfilPendente(session) {
        if (!session) return;
        try {
          const raw = localStorage.getItem("enaudin_perfil_pendente");
          if (!raw) return;
          const pendente = JSON.parse(raw);
          if (Object.keys(pendente).length > 0) {
            // Busca campos atuais para não sobrescrever dados já existentes
            const { data: prof } = await supabase
              .from("profiles")
              .select("cpf, instituicao, cargo")
              .eq("id", session.user.id)
              .maybeSingle();
            const atualizacao = {};
            if (pendente.cpf        && !prof?.cpf)        atualizacao.cpf = pendente.cpf;
            if (pendente.instituicao && !prof?.instituicao) atualizacao.instituicao = pendente.instituicao;
            if (pendente.cargo       && !prof?.cargo)       atualizacao.cargo = pendente.cargo;
            if (Object.keys(atualizacao).length > 0) {
              await supabase.from("profiles").update(atualizacao).eq("id", session.user.id);
            }
          }
        } catch {
          // Falha silenciosa — dado extra não é crítico para o acesso
        } finally {
          localStorage.removeItem("enaudin_perfil_pendente");
        }
      }

      // Link de recuperação de senha: sessão criada, mas o usuário
      // precisa definir a nova senha antes de seguir
      function concluir(session) {
        if (HASH_TYPE === "recovery") {
          setDefinindoSenha(true);
        } else {
          navigate("/painel", { replace: true });
        }
        return salvarPerfilPendente(session);
      }

      // PKCE flow: troca o code por sessão
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) { setErro(true); return; }
        await concluir(data.session);
        return;
      }

      // Implicit flow: Supabase lê o hash automaticamente — sessão já está disponível
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await concluir(session);
        return;
      }

      // Fallback: aguarda onAuthStateChange (tokens ainda sendo processados)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && session) {
          subscription.unsubscribe();
          await concluir(session);
        }
        if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
          subscription.unsubscribe();
          setErro(true);
        }
      });

      // Timeout de segurança
      setTimeout(() => { subscription.unsubscribe(); setErro(true); }, 10000);
    }

    handle();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (definindoSenha) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Poppins, sans-serif", background: "var(--bg)" }}>
        <div style={{ maxWidth: 400, width: "100%", padding: "2rem", background: "var(--surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", margin: "1rem" }}>
          <div style={{ textAlign: "center", fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔑</div>
          <h2 style={{ textAlign: "center", marginBottom: "0.5rem", color: "var(--navy)", fontFamily: "'Playfair Display',serif" }}>Crie uma nova senha</h2>
          <p style={{ textAlign: "center", color: "var(--text2)", fontSize: "0.88rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            Defina a nova senha da sua conta para continuar.
          </p>
          <div className="form-group">
            <label className="form-label">Nova senha</label>
            <input className="form-input" type="password" placeholder="Mín. 6 caracteres" value={novaSenha}
              onChange={e => { setNovaSenha(e.target.value); setErroSenha(""); }} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar nova senha</label>
            <input className="form-input" type="password" placeholder="Repita a senha" value={confirmaSenha}
              onChange={e => { setConfirmaSenha(e.target.value); setErroSenha(""); }}
              onKeyDown={e => e.key === "Enter" && !salvandoSenha && salvarNovaSenha()} />
          </div>
          {erroSenha && (
            <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.65rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              {erroSenha}
            </div>
          )}
          <button className="btn btn-primary btn-block" onClick={salvarNovaSenha} disabled={salvandoSenha}>
            {salvandoSenha ? "Salvando…" : "Salvar nova senha e entrar"}
          </button>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Poppins, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 380, padding: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔗</div>
          <h2 style={{ marginBottom: "0.5rem", color: "var(--text)" }}>Link inválido ou expirado</h2>
          <p style={{ color: "var(--text2)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            Este link de acesso já foi utilizado ou expirou. Solicite um novo link pelo formulário de login.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/", { replace: true })}>
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Poppins, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
        <p style={{ color: "var(--text2)" }}>Autenticando, aguarde…</p>
      </div>
    </div>
  );
}
