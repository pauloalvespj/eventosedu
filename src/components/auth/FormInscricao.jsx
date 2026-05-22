import { useState } from "react";
import { formatCPF, validateCPF } from "../../utils/helpers";
import { supabase } from "../../lib/supabase";
import { inserirEnrollment } from "../../lib/db";

export function FormInscricao({ onClose, showToast, instituicoes = [] }) {
  const [form, setForm] = useState({ cpf: "", nome: "", instituicao: "", instituicaoOutra: "", cargo: "", email: "", senha: "", confirmSenha: "" });
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false); // "confirmacao" | "logado" | false

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function validar() {
    const e = {};
    if (!validateCPF(form.cpf)) e.cpf = "CPF inválido";
    if (!form.nome.trim()) e.nome = "Nome obrigatório";
    const instValor = form.instituicao === "Outra" ? form.instituicaoOutra.trim() : form.instituicao;
    if (!instValor) e.instituicao = "Instituição obrigatória";
    if (form.instituicao === "Outra" && !form.instituicaoOutra.trim()) e.instituicao = "Informe o nome da instituição";
    if (!form.cargo.trim()) e.cargo = "Cargo obrigatório";
    if (!form.email.includes("@")) e.email = "E-mail inválido";
    if (form.senha.length < 6) e.senha = "Senha mínima de 6 caracteres";
    if (form.senha !== form.confirmSenha) e.confirmSenha = "Senhas não conferem";
    return e;
  }

  async function handleSubmit() {
    const e = validar();
    if (Object.keys(e).length) { setErros(e); return; }
    setEnviando(true);

    const cpfFormatado = formatCPF(form.cpf.replace(/\D/g, ""));
    const emailNorm    = form.email.trim().toLowerCase();

    // Verifica duplicidade no banco antes de tentar o signUp
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, email, cpf")
      .or(`email.eq.${emailNorm},cpf.eq.${cpfFormatado}`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      setEnviando(false);
      if (existing.email?.toLowerCase() === emailNorm) {
        setErros({ email: "E-mail já cadastrado. Faça login ou recupere sua senha." });
      } else {
        setErros({ cpf: "CPF já cadastrado neste evento." });
      }
      return;
    }

    const instituicaoFinal = form.instituicao === "Outra" ? form.instituicaoOutra.trim() : form.instituicao;
    const profileData = {
      nome:        form.nome.trim(),
      cpf:         cpfFormatado,
      instituicao: instituicaoFinal,
      cargo:       form.cargo.trim(),
    };

    // 1. Criar usuário — salva dados do perfil em user_metadata como fallback
    //    para quando a confirmação de e-mail está ativada (session vem null).
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: emailNorm,
      password: form.senha,
      options: { data: profileData },
    });

    if (signUpError) {
      setEnviando(false);
      if (signUpError.message.includes("already registered")) {
        setErros({ email: "E-mail já cadastrado." });
      } else {
        setErros({ email: signUpError.message });
      }
      return;
    }

    // 2. Tenta inserir profile imediatamente.
    //    Funciona quando confirmação de e-mail está DESATIVADA (session existe).
    //    Quando está ATIVADA, o RLS bloqueia — o App.jsx cria o profile
    //    a partir do user_metadata após o usuário confirmar e logar.
    if (data.session) {
      await supabase.from("profiles").insert({
        id:          data.user.id,
        role:        "participante",
        email:       emailNorm,
        credenciado: false,
        ativo:       true,
        ...profileData,
      });
      await inserirEnrollment(data.user.id, "participante");
    }

    setEnviando(false);

    if (data.session) {
      showToast(`Bem-vindo(a), ${profileData.nome.split(" ")[0]}!`, "success");
      onClose();
    } else {
      setSucesso("confirmacao");
    }
  }

  if (sucesso === "confirmacao") return (
    <div style={{ textAlign: "center", padding: "1rem 0" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
      <h3 style={{ fontFamily: "'Playfair Display',serif", color: "var(--navy)", marginBottom: "0.5rem" }}>Confirme seu e-mail</h3>
      <p style={{ color: "var(--text2)", marginBottom: "0.75rem" }}>
        Enviamos um link de confirmação para <strong>{form.email}</strong>.
      </p>
      <p style={{ color: "var(--text3)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        Clique no link recebido e depois faça login com seu e-mail e senha.
      </p>
      <button className="btn btn-primary btn-block" onClick={onClose}>Fechar</button>
    </div>
  );

  return (
    <div>
      <div className="form-grid">
        <div className="form-group" style={{ gridColumn: "1/-1" }}>
          <label className="form-label">Nome Completo *</label>
          <input className={`form-input${erros.nome ? " error" : ""}`} placeholder="Seu nome completo"
            value={form.nome} onChange={e => set("nome", e.target.value)} />
          {erros.nome && <div className="form-error">{erros.nome}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">CPF *</label>
          <input className={`form-input${erros.cpf ? " error" : ""}`} placeholder="000.000.000-00"
            value={form.cpf} onChange={e => set("cpf", formatCPF(e.target.value))} maxLength={14} />
          {erros.cpf && <div className="form-error">{erros.cpf}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">E-mail *</label>
          <input className={`form-input${erros.email ? " error" : ""}`} placeholder="seu@email.com" type="email"
            value={form.email} onChange={e => set("email", e.target.value)} />
          {erros.email && <div className="form-error">{erros.email}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Instituição *</label>
          <select className={`form-input${erros.instituicao ? " error" : ""}`} value={form.instituicao} onChange={e => set("instituicao", e.target.value)}>
            <option value="">Selecione a instituição</option>
            {instituicoes.filter(i => i.ativo).map(i => (
              <option key={i.id} value={i.sigla}>{i.sigla} – {i.nome}</option>
            ))}
            <option value="Outra">Outra</option>
          </select>
          {form.instituicao === "Outra" && (
            <input className="form-input" style={{ marginTop: "0.4rem" }} placeholder="Digite o nome da sua instituição"
              value={form.instituicaoOutra} onChange={e => set("instituicaoOutra", e.target.value)} />
          )}
          {erros.instituicao && <div className="form-error">{erros.instituicao}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Cargo / Função *</label>
          <input className={`form-input${erros.cargo ? " error" : ""}`} placeholder="Auditor(a), Analista..."
            value={form.cargo} onChange={e => set("cargo", e.target.value)} />
          {erros.cargo && <div className="form-error">{erros.cargo}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Senha *</label>
          <input className={`form-input${erros.senha ? " error" : ""}`} type="password" placeholder="Mín. 6 caracteres"
            value={form.senha} onChange={e => set("senha", e.target.value)} />
          {erros.senha && <div className="form-error">{erros.senha}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Confirmar Senha *</label>
          <input className={`form-input${erros.confirmSenha ? " error" : ""}`} type="password" placeholder="Repita a senha"
            value={form.confirmSenha} onChange={e => set("confirmSenha", e.target.value)} />
          {erros.confirmSenha && <div className="form-error">{erros.confirmSenha}</div>}
        </div>
      </div>
      <button className="btn btn-primary btn-block" style={{ marginTop: "0.5rem" }} onClick={handleSubmit} disabled={enviando}>
        {enviando ? "Enviando…" : "Concluir Inscrição"}
      </button>
    </div>
  );
}
