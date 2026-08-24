import { useState } from "react";
import { formatCPF, validateCPF, validarSenha } from "../../utils/helpers";
import { supabase } from "../../lib/supabase";
import { inserirEnrollment } from "../../lib/db";
import { InstSelect } from "../admin/sections/InstSelect";

// Traduz mensagens de política de senha do Supabase Auth (em inglês) pra
// algo legível — o texto exato varia conforme a config de senha do projeto.
function traduzirErroSenha(msg) {
  const m = msg.toLowerCase();
  if (m.includes("at least one character of each") || m.includes("should contain")) {
    const partes = [];
    if (m.includes("lowercase")) partes.push("letra minúscula");
    if (m.includes("uppercase")) partes.push("letra maiúscula");
    if (m.includes("digit") || m.includes("number")) partes.push("número");
    if (m.includes("symbol") || m.includes("special")) partes.push("símbolo (ex: !@#$%)");
    return partes.length
      ? `A senha deve conter: ${partes.join(", ")}.`
      : "Senha não atende aos requisitos de segurança.";
  }
  const minLength = msg.match(/at least (\d+) character/i);
  if (minLength) return `Senha deve ter no mínimo ${minLength[1]} caracteres.`;
  return "Senha não atende aos requisitos de segurança.";
}

export function FormInscricao({ onClose, showToast, instituicoes = [] }) {
  const [form, setForm] = useState({ cpf: "", nome: "", nome_publico: "", instituicao: "", cargo: "", email: "", senha: "", confirmSenha: "" });
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // Verificação de e-mail em tempo real (onBlur)
  const [emailCheck, setEmailCheck] = useState({ status: "idle", profile: null });
  // status: "idle" | "checking" | "exists" | "free"

  // Verificação de CPF em tempo real (onBlur)
  const [cpfCheck, setCpfCheck] = useState({ status: "idle" });

  // Fluxo: e-mail já existe → "já tem cadastro"
  const [jaTemCadastro, setJaTemCadastro] = useState(null);
  const [extra, setExtra] = useState({ cpf: "", instituicao: "", cargo: "" });
  const [errosExtra, setErrosExtra] = useState({});
  const [aguardandoLink, setAguardandoLink] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setEx = (k, v) => setExtra(e => ({ ...e, [k]: v }));

  async function handleEmailBlur() {
    const emailNorm = form.email.trim().toLowerCase();
    if (!emailNorm.includes("@")) return;
    setEmailCheck({ status: "checking", profile: null });
    const { data } = await supabase.rpc("verificar_cadastro", { p_email: emailNorm });
    if (data?.match_type === "email") {
      setEmailCheck({ status: "exists", profile: data });
    } else {
      setEmailCheck({ status: "free", profile: null });
    }
  }

  async function handleCpfBlur() {
    const cpfDigits = form.cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11 || !validateCPF(form.cpf)) return;
    setCpfCheck({ status: "checking" });
    const { data } = await supabase.rpc("verificar_cadastro", {
      p_email: "",
      p_cpf: formatCPF(cpfDigits),
    });
    if (data?.match_type === "cpf") {
      setCpfCheck({ status: "exists" });
    } else {
      setCpfCheck({ status: "free" });
    }
  }

  function irParaJaTemCadastro(profile) {
    const emailNorm = form.email.trim().toLowerCase();
    const cpfPrefill = !profile.cpf ? formatCPF(form.cpf.replace(/\D/g, "")) : "";
    setExtra(ex => ({ ...ex, cpf: cpfPrefill }));
    setJaTemCadastro({ ...profile, email: emailNorm });
  }

  function validar() {
    const e = {};
    if (!validateCPF(form.cpf)) e.cpf = "CPF inválido";
    if (!form.nome.trim()) e.nome = "Nome obrigatório";
    if (!form.nome_publico.trim()) e.nome_publico = "Nome para crachá e divulgação obrigatório";
    if (!form.instituicao.trim()) e.instituicao = "Instituição obrigatória";
    if (!form.cargo.trim()) e.cargo = "Cargo obrigatório";
    if (!form.email.includes("@")) e.email = "E-mail inválido";
    const erroSenha = validarSenha(form.senha);
    if (erroSenha) e.senha = erroSenha;
    if (form.senha !== form.confirmSenha) e.confirmSenha = "Senhas não conferem";
    return e;
  }

  async function handleSubmit() {
    const e = validar();
    if (Object.keys(e).length) { setErros(e); return; }
    setEnviando(true);

    const cpfFormatado = formatCPF(form.cpf.replace(/\D/g, ""));
    const emailNorm    = form.email.trim().toLowerCase();

    // Usa resultado do onBlur se o e-mail não mudou desde a checagem
    if (emailCheck.status === "exists") {
      setEnviando(false);
      irParaJaTemCadastro(emailCheck.profile);
      return;
    }
    if (cpfCheck.status === "exists") {
      setEnviando(false);
      setErros({ cpf: "CPF já cadastrado neste evento." });
      return;
    }

    // Verifica duplicidade via função SECURITY DEFINER (bypassa RLS para anon)
    const { data: existing } = await supabase.rpc("verificar_cadastro", {
      p_email: emailNorm,
      p_cpf:   cpfFormatado,
    });

    if (existing) {
      setEnviando(false);
      if (existing.match_type === "email") {
        irParaJaTemCadastro(existing);
      } else {
        setErros({ cpf: "CPF já cadastrado neste evento." });
      }
      return;
    }

    const instituicaoFinal = form.instituicao.trim();
    const profileData = {
      nome:        form.nome.trim(),
      nome_publico: form.nome_publico.trim(),
      cpf:         cpfFormatado,
      instituicao: instituicaoFinal,
      cargo:       form.cargo.trim(),
    };

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: emailNorm,
      password: form.senha,
      options: { data: profileData },
    });

    if (signUpError) {
      setEnviando(false);
      const msg = signUpError.message.toLowerCase();
      if (msg.includes("already registered")) {
        setErros({ email: "E-mail já cadastrado." });
      } else if (msg.includes("password")) {
        setErros({ senha: traduzirErroSenha(signUpError.message) });
      } else {
        setErros({ email: signUpError.message });
      }
      return;
    }

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

  async function handleEnviarLinkJaTem() {
    setErrosExtra({});
    const e = {};
    const precisaCpf   = !jaTemCadastro.cpf;
    const precisaInst  = !jaTemCadastro.instituicao;
    const precisaCargo = !jaTemCadastro.cargo;

    if (precisaCpf && extra.cpf && !validateCPF(extra.cpf.replace(/\D/g, ""))) {
      e.cpf = "CPF inválido";
    }
    if (precisaInst && !extra.instituicao.trim()) {
      e.instituicao = "Instituição obrigatória";
    }
    if (Object.keys(e).length) { setErrosExtra(e); return; }

    const pendente = {};
    if (precisaCpf  && extra.cpf) pendente.cpf = formatCPF(extra.cpf.replace(/\D/g, ""));
    if (precisaInst && extra.instituicao.trim()) {
      pendente.instituicao = extra.instituicao.trim();
    }
    if (precisaCargo && extra.cargo.trim()) pendente.cargo = extra.cargo.trim();
    if (Object.keys(pendente).length > 0) {
      localStorage.setItem("enaudin_perfil_pendente", JSON.stringify(pendente));
    }

    setEnviando(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: jaTemCadastro.email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setEnviando(false);

    if (error) {
      setErrosExtra({ geral: "Erro ao enviar o link. Tente novamente." });
      return;
    }
    setAguardandoLink(true);
  }

  // ── Aguardando clique no link ────────────────────────────────
  if (aguardandoLink) return (
    <div style={{ textAlign: "center", padding: "1rem 0" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
      <h3 style={{ fontFamily: "'Playfair Display',serif", color: "var(--navy)", marginBottom: "0.5rem" }}>
        Verifique seu e-mail
      </h3>
      <p style={{ color: "var(--text2)", marginBottom: "0.5rem" }}>
        Enviamos um link de acesso para <strong>{jaTemCadastro.email}</strong>.
      </p>
      <p style={{ color: "var(--text3)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
        Clique no link para acessar a plataforma do evento. Ele expira em 1 hora.
      </p>
      <button className="btn btn-outline btn-block" onClick={onClose}>Fechar</button>
    </div>
  );

  // ── Já tem cadastro ──────────────────────────────────────────
  if (jaTemCadastro) {
    const precisaCpf   = !jaTemCadastro.cpf;
    const precisaInst  = !jaTemCadastro.instituicao;
    const precisaCargo = !jaTemCadastro.cargo;
    const temFaltando  = precisaCpf || precisaInst || precisaCargo;
    const isPalestrante = jaTemCadastro.is_palestrante;

    return (
      <div>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
            {isPalestrante ? "🎤" : "👋"}
          </div>
          <h3 style={{ fontFamily: "'Playfair Display',serif", color: "var(--navy)", marginBottom: "0.4rem" }}>
            Olá, {jaTemCadastro.nome.split(" ")[0]}!
          </h3>
          <p style={{ color: "var(--text2)", fontSize: "0.9rem", lineHeight: 1.5 }}>
            {isPalestrante
              ? <><strong>Você está registrado como palestrante</strong> neste evento.</>
              : "Você já tem cadastro na plataforma do evento."
            }
          </p>
          {temFaltando && (
            <p style={{ color: "var(--text3)", fontSize: "0.84rem", marginTop: "0.4rem" }}>
              Complete os dados abaixo para ter acesso completo à plataforma:
            </p>
          )}
        </div>

        {precisaCpf && (
          <div className="form-group">
            <label className="form-label">
              CPF{" "}
              <span style={{ color: "var(--text3)", fontWeight: 400, fontSize: "0.82rem" }}>
                (necessário para credenciamento)
              </span>
            </label>
            <input
              className={`form-input${errosExtra.cpf ? " error" : ""}`}
              placeholder="000.000.000-00"
              value={extra.cpf}
              onChange={e => setEx("cpf", formatCPF(e.target.value))}
              maxLength={14}
            />
            {errosExtra.cpf && <div className="form-error">{errosExtra.cpf}</div>}
          </div>
        )}

        {precisaInst && (
          <div className="form-group">
            <label className="form-label">Instituição *</label>
            <InstSelect value={extra.instituicao} onChange={v => setEx("instituicao", v)} instituicoes={instituicoes} />
            {errosExtra.instituicao && <div className="form-error">{errosExtra.instituicao}</div>}
          </div>
        )}

        {precisaCargo && (
          <div className="form-group">
            <label className="form-label">Cargo / Função</label>
            <input
              className="form-input"
              placeholder="Auditor(a), Analista..."
              value={extra.cargo}
              onChange={e => setEx("cargo", e.target.value)}
            />
          </div>
        )}

        {errosExtra.geral && (
          <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.65rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            {errosExtra.geral}
          </div>
        )}

        <button
          className="btn btn-primary btn-block"
          onClick={handleEnviarLinkJaTem}
          disabled={enviando}
          style={{ marginTop: temFaltando ? "0.25rem" : 0 }}
        >
          {enviando ? "Enviando…" : "Enviar link de acesso"}
        </button>

        <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--text3)", textAlign: "center" }}>
          O link será enviado para <strong>{jaTemCadastro.email}</strong>
        </p>

        <button
          type="button"
          onClick={() => setJaTemCadastro(null)}
          style={{ display: "block", margin: "0.75rem auto 0", background: "none", border: "none", color: "var(--text3)", fontSize: "0.82rem", cursor: "pointer", textDecoration: "underline" }}
        >
          Voltar
        </button>
      </div>
    );
  }

  // ── Confirmação de e-mail (inscrição normal) ─────────────────
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

  // ── Formulário de inscrição ──────────────────────────────────
  return (
    <div>
      <div className="form-grid">
        <div className="nome-split" style={{ gridColumn: "1/-1" }}>
          <div className="form-group">
            <label className="form-label">Nome Completo *</label>
            <input className={`form-input${erros.nome ? " error" : ""}`} placeholder="Seu nome completo"
              value={form.nome} onChange={e => set("nome", e.target.value)} />
            {erros.nome && <div className="form-error">{erros.nome}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Nome Crachá *</label>
            <input className={`form-input${erros.nome_publico ? " error" : ""}`} placeholder="Nome no crachá"
              value={form.nome_publico} onChange={e => set("nome_publico", e.target.value)} />
            {erros.nome_publico && <div className="form-error">{erros.nome_publico}</div>}
          </div>
        </div>
        <div className="form-group" style={{ gridColumn: "1/-1" }}>
          <label className="form-label">Instituição *</label>
          <InstSelect value={form.instituicao} onChange={v => set("instituicao", v)} instituicoes={instituicoes}
            className={`form-input${erros.instituicao ? " error" : ""}`} />
          {erros.instituicao && <div className="form-error">{erros.instituicao}</div>}
        </div>
        <div className="form-group" style={{ gridColumn: "1/-1" }}>
          <label className="form-label">Cargo / Função *</label>
          <input className={`form-input${erros.cargo ? " error" : ""}`} placeholder="Auditor(a), Analista..."
            value={form.cargo} onChange={e => set("cargo", e.target.value)} />
          {erros.cargo && <div className="form-error">{erros.cargo}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">CPF *</label>
          <input
            className={`form-input${erros.cpf || cpfCheck.status === "exists" ? " error" : ""}`}
            placeholder="000.000.000-00"
            value={form.cpf}
            onChange={e => { set("cpf", formatCPF(e.target.value)); setCpfCheck({ status: "idle" }); setErros(er => ({ ...er, cpf: undefined })); }}
            onBlur={handleCpfBlur}
            maxLength={14}
          />
          {cpfCheck.status === "checking" && (
            <div style={{ fontSize: "0.8rem", color: "var(--text3)", marginTop: "0.3rem" }}>
              Verificando…
            </div>
          )}
          {cpfCheck.status === "exists" && (
            <div style={{ marginTop: "0.3rem", background: "var(--danger-bg)", borderRadius: "var(--radius-sm)", padding: "0.5rem 0.75rem", fontSize: "0.82rem", color: "var(--danger)", fontWeight: 500 }}>
              CPF já cadastrado — você já tem um cadastro neste evento. Use seu e-mail para acessar.
            </div>
          )}
          {cpfCheck.status === "free" && (
            <div style={{ fontSize: "0.8rem", color: "var(--success)", marginTop: "0.3rem" }}>
              ✓ CPF disponível
            </div>
          )}
          {erros.cpf && <div className="form-error">{erros.cpf}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">E-mail *</label>
          <input
            className={`form-input${erros.email || emailCheck.status === "exists" ? " error" : ""}`}
            placeholder="seu@email.com"
            type="email"
            value={form.email}
            onChange={e => { set("email", e.target.value); setEmailCheck({ status: "idle", profile: null }); setErros(er => ({ ...er, email: undefined })); }}
            onBlur={handleEmailBlur}
          />
          {emailCheck.status === "checking" && (
            <div style={{ fontSize: "0.8rem", color: "var(--text3)", marginTop: "0.3rem" }}>
              Verificando…
            </div>
          )}
          {emailCheck.status === "exists" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.3rem", background: "var(--danger-bg)", borderRadius: "var(--radius-sm)", padding: "0.5rem 0.75rem" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--danger)", fontWeight: 500 }}>
                E-mail já cadastrado
              </span>
              <button
                type="button"
                onClick={() => irParaJaTemCadastro(emailCheck.profile)}
                style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--navy)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}
              >
                Acessar por link →
              </button>
            </div>
          )}
          {erros.email && <div className="form-error">{erros.email}</div>}
        </div>
        <div className="form-group">
          <label className="form-label">Senha *</label>
          <input className={`form-input${erros.senha ? " error" : ""}`} type="password" placeholder="Mín. 6 caracteres"
            value={form.senha} onChange={e => set("senha", e.target.value)} />
          {erros.senha && <div className="form-error">{erros.senha}</div>}
          <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: "0.3rem" }}>* Use letras e números.</div>
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
