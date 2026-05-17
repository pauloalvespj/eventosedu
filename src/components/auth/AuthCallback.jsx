import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function AuthCallback() {
  const navigate = useNavigate();
  const [erro, setErro] = useState(false);

  useEffect(() => {
    async function handle() {
      // PKCE flow: troca o code por sessão
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) { setErro(true); return; }
        navigate("/painel", { replace: true });
        return;
      }

      // Implicit flow: Supabase lê o hash automaticamente — sessão já está disponível
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/painel", { replace: true });
        return;
      }

      // Fallback: aguarda onAuthStateChange (tokens ainda sendo processados)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session) {
          subscription.unsubscribe();
          navigate("/painel", { replace: true });
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
