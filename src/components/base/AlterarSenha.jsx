import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { validarSenha } from "../../utils/helpers";
import { supabase } from "../../lib/supabase";

export function AlterarSenha({ showToast, voltarPath }) {
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [erroSenha, setErroSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function salvarNovaSenha() {
    setErroSenha("");
    const erroValidacao = validarSenha(novaSenha);
    if (erroValidacao) { setErroSenha(erroValidacao); return; }
    if (novaSenha !== confirmaSenha) { setErroSenha("As senhas não conferem."); return; }
    setSalvandoSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSalvandoSenha(false);
    if (error) { setErroSenha(error.message || "Não foi possível salvar a senha. Tente novamente."); return; }
    setNovaSenha(""); setConfirmaSenha("");
    showToast?.("Senha alterada com sucesso!", "success");
    if (voltarPath) navigate(voltarPath);
  }

  return (
    <div style={{ width: "40%", minWidth: 380, maxWidth: 560 }}>
      {voltarPath && (
        <button type="button" onClick={() => navigate(voltarPath)}
          style={{ background: "none", border: "none", padding: 0, marginBottom: "1rem", color: "var(--text3)", fontSize: "0.85rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar para Meus Dados
        </button>
      )}

      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", color: "var(--navy)", marginBottom: "0.25rem" }}>Alterar senha</h2>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text3)" }}>Defina uma nova senha de acesso para sua conta.</p>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="form-group">
            <label className="form-label">Nova senha</label>
            <div style={{ position: "relative" }}>
              <input className="form-input" type={mostrarSenha ? "text" : "password"} placeholder="Mín. 6 caracteres" value={novaSenha}
                style={{ paddingRight: "2.5rem" }}
                onChange={e => { setNovaSenha(e.target.value); setErroSenha(""); }} autoFocus />
              <button type="button" onClick={() => setMostrarSenha(v => !v)}
                title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", padding: 0, display: "flex" }}>
                <FontAwesomeIcon icon={mostrarSenha ? faEyeSlash : faEye} />
              </button>
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.3rem" }}>Use letras e números.</div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirmar nova senha</label>
            <div style={{ position: "relative" }}>
              <input className="form-input" type={mostrarSenha ? "text" : "password"} placeholder="Repita a senha" value={confirmaSenha}
                style={{ paddingRight: "2.5rem" }}
                onChange={e => { setConfirmaSenha(e.target.value); setErroSenha(""); }}
                onKeyDown={e => e.key === "Enter" && !salvandoSenha && salvarNovaSenha()} />
              <button type="button" onClick={() => setMostrarSenha(v => !v)}
                title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", padding: 0, display: "flex" }}>
                <FontAwesomeIcon icon={mostrarSenha ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>
        </div>
        {erroSenha && (
          <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.65rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
            {erroSenha}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="btn btn-primary btn-sm" onClick={salvarNovaSenha} disabled={salvandoSenha}>
            {salvandoSenha ? "Salvando…" : "Salvar nova senha"}
          </button>
        </div>
      </div>
    </div>
  );
}
