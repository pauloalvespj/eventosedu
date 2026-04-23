import { useState } from "react";
import { formatCPF, validateCPF } from "../../utils/helpers";
import { supabase } from "../../lib/supabase";

export function FormInscricao({ onClose, showToast, instituicoes = [] }) {
  const [form, setForm] = useState({ cpf: "", nome: "", instituicao: "", instituicaoOutra: "", cargo: "", email: "", senha: "", confirmSenha: "" });
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

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

    // 1. Criar usuário no Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
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

    // 2. Inserir profile
    const instituicaoFinal = form.instituicao === "Outra" ? form.instituicaoOutra.trim() : form.instituicao;
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      role: "participante",
      nome: form.nome,
      email: form.email,
      cpf: formatCPF(form.cpf.replace(/\D/g, "")),
      instituicao: instituicaoFinal,
      cargo: form.cargo,
      credenciado: false,
      ativo: true,
    });

    setEnviando(false);

    if (profileError) {
      // Auth user foi criado mas profile falhou — incomum, mas loga
      console.error("Erro ao salvar profile:", profileError.message);
    }

    setSucesso(true);
  }

  if (sucesso) return (
    <div style={{ textAlign: "center", padding: "1rem 0" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
      <h3 style={{ fontFamily: "'Playfair Display',serif", color: "var(--navy)", marginBottom: "0.5rem" }}>Inscrição realizada!</h3>
      <p style={{ color: "var(--text2)", marginBottom: "0.75rem" }}>
        Bem-vindo ao evento, <strong>{form.nome.split(" ")[0]}</strong>!
      </p>
      <p style={{ color: "var(--text3)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        Verifique seu e-mail para confirmar o cadastro, depois faça login.
      </p>
      <button className="btn btn-primary btn-block" onClick={onClose}>Fechar</button>
    </div>
  );

  return (
    <div>
      <div className="form-grid">
        <div className="form-group" style={{ gridColumn: "1/-1" }}>
          <label className="form-label">CPF *</label>
          <input className={`form-input${erros.cpf ? " error" : ""}`} placeholder="000.000.000-00"
            value={form.cpf} onChange={e => set("cpf", formatCPF(e.target.value))} maxLength={14} />
          {erros.cpf && <div className="form-error">{erros.cpf}</div>}
        </div>
        <div className="form-group" style={{ gridColumn: "1/-1" }}>
          <label className="form-label">Nome Completo *</label>
          <input className={`form-input${erros.nome ? " error" : ""}`} placeholder="Seu nome completo"
            value={form.nome} onChange={e => set("nome", e.target.value)} />
          {erros.nome && <div className="form-error">{erros.nome}</div>}
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
        <div className="form-group" style={{ gridColumn: "1/-1" }}>
          <label className="form-label">E-mail *</label>
          <input className={`form-input${erros.email ? " error" : ""}`} placeholder="seu@email.com" type="email"
            value={form.email} onChange={e => set("email", e.target.value)} />
          {erros.email && <div className="form-error">{erros.email}</div>}
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
