import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { formatCPF, validarSenha } from "../../../utils/helpers";
import { AvatarUpload, IconEdit } from "../../base/index";
import { InstSelect } from "../../admin/sections/InstSelect";
import { atualizarProfile, cancelarInscricao } from "../../../lib/db";
import { supabase } from "../../../lib/supabase";
import { useUsuario } from "../UsuarioContext";

export function MeusDados() {
  const { user, setUser, isPalestrante, instituicoes, setInstituicoes, perfilIncompleto, showToast } = useUsuario();
  const location = useLocation();
  const navigate = useNavigate();
  const editando = location.pathname.endsWith("/editar");

  const [formEdit, setFormEdit] = useState({ nome: user.nome || "", nome_publico: user.nome_publico || "", cpf: user.cpf || "", instituicao: user.instituicao || "", cargo: user.cargo || "", titulo: user.titulo || "", area: user.area || "", mini_bio: user.mini_bio || "" });
  const [cancelando, setCancelando] = useState(false);
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [erroMotivoCancelamento, setErroMotivoCancelamento] = useState(false);
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
    showToast("Senha alterada com sucesso!", "success");
  }

  function abrirEdicao() {
    setFormEdit({ nome: user.nome || "", nome_publico: user.nome_publico || "", cpf: user.cpf || "", instituicao: user.instituicao || "", cargo: user.cargo || "", titulo: user.titulo || "", area: user.area || "", mini_bio: user.mini_bio || "" });
    navigate("/painel/dados/editar");
  }

  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  async function salvarEdicao() {
    const updates = {
      nome: formEdit.nome.trim() || user.nome,
      nome_publico: formEdit.nome_publico.trim(),
      cpf: formEdit.cpf,
      instituicao: formEdit.instituicao,
      cargo: formEdit.cargo,
      ...(isPalestrante && { mini_bio: formEdit.mini_bio }),
    };
    setSalvandoEdicao(true);
    const { error } = await atualizarProfile(user.id, updates);
    setSalvandoEdicao(false);
    if (error) {
      showToast("Erro ao salvar dados: " + error.message, "error");
      return;
    }
    if (setUser) setUser(prev => ({ ...prev, ...updates }));
    showToast("Dados atualizados!", "success");
    navigate("/painel/dados");
  }

  async function handleCancelarInscricao() {
    if (!motivoCancelamento.trim()) { setErroMotivoCancelamento(true); return; }
    setCancelando(true);
    await cancelarInscricao(user.id, motivoCancelamento.trim());
    setUser(u => ({ ...u, ativo: false }));
    setCancelando(false);
    setConfirmandoCancelamento(false);
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.4rem", color:"var(--navy)", marginBottom:"0.25rem" }}>Meus Dados</h2>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text3)" }}>Informações do seu perfil no evento</p>
      </div>

      {perfilIncompleto && (
        <div style={{ background: "#fde2ea", border: "1px solid #f3a8c0", borderRadius: "var(--radius-sm)", padding: "0.9rem 1.1rem", marginBottom: "1.25rem", fontSize: "0.85rem", color: "#8b0f2f", fontWeight: 600 }}>
          ⚠️ Seu cadastro está incompleto — falta preencher {[!user.cpf && "CPF", !user.email && "e-mail", !user.nome_publico && "nome para crachá e divulgação", !user.instituicao && "instituição", !user.cargo && "cargo", isPalestrante && !user.mini_bio && "mini biografia"].filter(Boolean).join(", ")}. Isso é importante para o credenciamento e o crachá do evento.
        </div>
      )}

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem", position:"relative" }}>
        {/* Botão editar — canto superior direito */}
        {!editando && (
          <button className="btn btn-outline btn-sm" style={{ position:"absolute", top:"1.25rem", right:"1.25rem" }}
            onClick={abrirEdicao}
            title="Editar dados"><IconEdit /></button>
        )}

        {/* Avatar + nome centralizado */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", marginBottom:"1.75rem", paddingBottom:"1.25rem", borderBottom:"1px solid var(--border)" }}>
          <AvatarUpload
            userId={user.id}
            fotoUrl={user.foto_url}
            iniciais={user.nome ? user.nome.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase() : (user.foto_iniciais||"?")}
            size={80}
            onUploaded={url => setUser(prev => ({ ...prev, foto_url: url }))}
          />
          <div style={{ fontWeight:700, fontSize:"1.15rem", color:"var(--navy)", marginTop:"0.75rem" }}>{user.nome}</div>
          <div style={{ fontSize:"0.8rem", color:"var(--text3)", marginTop:"0.2rem" }}>{isPalestrante ? "Palestrante" : "Participante"}</div>
        </div>

        {editando ? (
          <div>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Nome completo *</label>
                <input className="form-input" value={formEdit.nome} onChange={e => setFormEdit(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="form-group" style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Nome para Crachá e Divulgação *</label>
                <input className="form-input" placeholder="Como você quer ser chamado(a) no crachá" value={formEdit.nome_publico} onChange={e => setFormEdit(f => ({ ...f, nome_publico: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">CPF *</label>
                <input className="form-input" style={{ fontFamily: "monospace" }} placeholder="000.000.000-00"
                  value={formEdit.cpf} onChange={e => setFormEdit(f => ({ ...f, cpf: formatCPF(e.target.value) }))} maxLength={14} />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-input" value={user.email} disabled style={{ background: "var(--surface2)", color: "var(--text3)" }} />
              </div>
              <div className="form-group" style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Cargo / Função *</label>
                <input className="form-input" value={formEdit.cargo} onChange={e => setFormEdit(f => ({ ...f, cargo: e.target.value }))} />
              </div>
              <div className="form-group" style={{ gridColumn: "1/-1" }}>
                <label className="form-label">Instituição *</label>
                <InstSelect value={formEdit.instituicao} onChange={v => setFormEdit(f => ({ ...f, instituicao: v }))}
                  instituicoes={instituicoes} onCriada={i => setInstituicoes?.(prev => [...prev, i])} />
              </div>
              {isPalestrante && (
                <div className="form-group" style={{ gridColumn: "1/-1" }}>
                  <label className="form-label">Mini Biografia *</label>
                  <textarea className="form-input" rows={6} value={formEdit.mini_bio} onChange={e => setFormEdit(f => ({ ...f, mini_bio: e.target.value }))} />
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
              <button className="btn btn-outline btn-sm" onClick={() => navigate("/painel/dados")} disabled={salvandoEdicao}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={salvarEdicao} disabled={salvandoEdicao}>{salvandoEdicao ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem 2rem" }}>
            {[
              ["Nome para Crachá e Divulgação", user.nome_publico, "1/-1"],
              ["CPF",         user.cpf,         null],
              ["E-mail",      user.email,       null],
              ["Cargo",       user.cargo,       "1/-1"],
              ["Instituição", user.instituicao, "1/-1"],
              ...(isPalestrante ? [
                ["Mini Bio",     user.mini_bio, "1/-1"],
              ] : []),
            ].map(([label, val, span]) => (
              <div key={label} style={span ? { gridColumn: span } : {}}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>{label}</div>
                <div style={{ fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.5 }}>{val || <span style={{ color: "var(--text3)" }}>—</span>}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.75rem", marginTop: "1.25rem" }}>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--navy)", marginBottom: "0.25rem" }}>Alterar senha</div>
        <p style={{ fontSize: "0.82rem", color: "var(--text3)", marginBottom: "1rem" }}>Defina uma nova senha de acesso para sua conta.</p>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Nova senha</label>
            <div style={{ position: "relative" }}>
              <input className="form-input" type={mostrarSenha ? "text" : "password"} placeholder="Mín. 6 caracteres" value={novaSenha}
                style={{ paddingRight: "2.5rem" }}
                onChange={e => { setNovaSenha(e.target.value); setErroSenha(""); }} />
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

      {/* Zona de perigo — cancelamento de inscrição */}
      {!isPalestrante && (
        <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px dashed var(--border2)" }}>
          {!confirmandoCancelamento ? (
            <button style={{ background: "transparent", border: "none", color: "var(--text3)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}
              onClick={() => { setMotivoCancelamento(""); setErroMotivoCancelamento(false); setConfirmandoCancelamento(true); }}>
              Cancelar minha inscrição no evento
            </button>
          ) : (
            <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger)", borderRadius: "var(--radius)", padding: "1.25rem 1.5rem" }}>
              <div style={{ fontWeight: 700, color: "var(--danger)", marginBottom: "0.5rem" }}>Cancelar inscrição?</div>
              <p style={{ fontSize: "0.85rem", color: "var(--text2)", marginBottom: "1rem", lineHeight: 1.6 }}>
                Você perderá acesso ao evento. Sua conta continuará existindo, mas precisará entrar em contato com a organização para reativar.
              </p>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">Motivo do cancelamento *</label>
                <textarea className={`form-input${erroMotivoCancelamento ? " error" : ""}`} rows={3}
                  placeholder="Conte rapidamente por que está cancelando…"
                  value={motivoCancelamento}
                  onChange={e => { setMotivoCancelamento(e.target.value); setErroMotivoCancelamento(false); }} />
                {erroMotivoCancelamento && <div className="form-error">Informe o motivo do cancelamento</div>}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-sm btn-danger" onClick={handleCancelarInscricao} disabled={cancelando}>
                  {cancelando ? "Cancelando…" : "Confirmar cancelamento"}
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => setConfirmandoCancelamento(false)}>
                  Voltar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
