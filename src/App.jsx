import { useState, useEffect, useCallback, useRef } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import "./styles/global.css";

// Captura o hash ANTES de qualquer código assíncrono (Supabase limpa o hash via replaceState)
const INITIAL_HASH = window.location.hash;

import { supabase } from "./lib/supabase";
import {
  fetchEvent, fetchAtividades, fetchProfiles, fetchPresencas,
  fetchAvaliacoes, fetchForumConfig, fetchTopicos, fetchPontuacoes,
  fetchInstituicoes, fetchGamificacaoConfig, fetchFollows, fetchConvidados,
  seguirUsuario, desseguirUsuario,
  inserirPontuacao,
} from "./lib/db";
import {
  INITIAL_EVENT, INITIAL_ATIVIDADES, INITIAL_PALESTRANTES, INITIAL_PARTICIPANTES,
  INITIAL_PRESENCAS, INITIAL_ADMINS, INITIAL_TOPICOS, INITIAL_PONTUACOES,
  INITIAL_FORUM_CONFIG, INITIAL_AVALIACOES, INITIAL_INSTITUICOES,
  INITIAL_GAMIFICACAO_CONFIG, INITIAL_FOLLOWS, INITIAL_CONVIDADOS,
} from "./data/initial";
import { PONTOS } from "./config/gamificacao";
import { TIPO_ICON } from "./utils/helpers";
import { applyTheme } from "./lib/themes";

import { Toast, Modal } from "./components/base/index";
import { FormInscricao } from "./components/auth/FormInscricao";
import { FormLogin } from "./components/auth/FormLogin";
import { LandingPage } from "./components/landing/LandingPage";
import { AreaUsuario } from "./components/usuario/AreaUsuario";
import { PainelAdmin } from "./components/admin/PainelAdmin";
import { PainelLogin } from "./components/PainelLogin";
import { PaginaPresenca } from "./components/presenca/PaginaPresenca";
import { ValidarCertificado } from "./components/ValidarCertificado";

// Converte dados mock para o formato profiles (array unificado)
const INITIAL_PROFILES = [
  ...INITIAL_PARTICIPANTES,
  ...INITIAL_PALESTRANTES.map(p => ({ ...p, role: "palestrante" })),
  ...INITIAL_ADMINS,
];

function PresencaRoute({ atividades, participantes, presencas, setPresencas, user, onLoginClick, registrarPresencaComPontos }) {
  const { atividadeId } = useParams();
  const navigate = useNavigate();

  function handleSetPresencas(newPresencas) {
    if (Array.isArray(newPresencas)) {
      const ultima = newPresencas[newPresencas.length - 1];
      if (ultima && !presencas.find(p => p.id === ultima.id)) {
        const uid = user?.id ?? ultima.participante_id;
        if (uid) registrarPresencaComPontos(uid);
      }
    }
    setPresencas(newPresencas);
  }

  return (
    <PaginaPresenca
      atividadeId={atividadeId}
      atividades={atividades}
      participantes={participantes}
      presencas={presencas}
      setPresencas={handleSetPresencas}
      user={user}
      onVoltar={() => navigate("/")}
      onLoginClick={onLoginClick}
    />
  );
}

function LinkExpiradoModal({ email, onClose, onLogin }) {
  const [enviando, setEnviando] = useState(false);
  const [reenvioOk, setReenvioOk] = useState(false);
  const [emailInput, setEmailInput] = useState(email || "");

  async function reenviar() {
    if (!emailInput.includes("@")) return;
    setEnviando(true);
    await supabase.auth.resend({ type: "signup", email: emailInput });
    setEnviando(false);
    setReenvioOk(true);
  }

  return (
    <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔗</div>
      <p style={{ color: "var(--text2)", marginBottom: "0.5rem", lineHeight: 1.6 }}>
        Este link de confirmação <strong>já foi utilizado ou expirou</strong>.
      </p>
      <p style={{ color: "var(--text3)", fontSize: "0.85rem", marginBottom: "1.25rem", lineHeight: 1.6 }}>
        Se você já confirmou seu e-mail anteriormente, basta fazer login normalmente.<br />
        Caso contrário, solicite um novo link abaixo.
      </p>
      {!reenvioOk ? (
        <>
          <div className="form-group" style={{ textAlign: "left" }}>
            <label className="form-label">Seu e-mail cadastrado</label>
            <input className="form-input" type="email" value={emailInput}
              onChange={e => setEmailInput(e.target.value)} placeholder="seu@email.com" />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={reenviar} disabled={enviando || !emailInput.includes("@")}>
              {enviando ? "Enviando…" : "↩ Reenviar link de confirmação"}
            </button>
            <button className="btn btn-outline" onClick={onClose}>Fechar</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: "var(--radius-sm)", padding: "0.85rem 1rem", marginBottom: "1.25rem", color: "var(--success)", fontWeight: 600 }}>
            ✅ Novo link enviado para <strong>{emailInput}</strong>!<br />
            <span style={{ fontSize: "0.82rem", fontWeight: 400 }}>Verifique também a pasta de spam.</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onLogin}>Ir para o login</button>
            <button className="btn btn-outline" onClick={onClose}>Fechar</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false); // sem tela de loading — mock é imediato

  // ── Estado — inicia com mock, substitui pelo Supabase quando disponível ──
  const [event, setEvent] = useState(INITIAL_EVENT);
  useEffect(() => {
    document.title = event.nome_completo
      ? `${event.nome} — ${event.nome_completo}`
      : event.nome;
  }, [event.nome, event.nome_completo]);
  useEffect(() => { applyTheme(event.tema); }, [event.tema]);
  const [atividades, setAtividades] = useState(INITIAL_ATIVIDADES);
  const [profiles, setProfiles] = useState(INITIAL_PROFILES);
  const [presencas, setPresencas] = useState(INITIAL_PRESENCAS);
  const [avaliacoes, setAvaliacoes] = useState(INITIAL_AVALIACOES);
  const [forumConfig, setForumConfig] = useState(INITIAL_FORUM_CONFIG);
  const [topicos, setTopicos] = useState(INITIAL_TOPICOS);
  const [pontuacoes, setPontuacoes] = useState(INITIAL_PONTUACOES);
  const [instituicoes, setInstituicoes] = useState(INITIAL_INSTITUICOES);
  const [pontosConfig, setPontosConfig] = useState(INITIAL_GAMIFICACAO_CONFIG);
  const [follows, setFollows] = useState(INITIAL_FOLLOWS);
  const [convidados, setConvidados] = useState(INITIAL_CONVIDADOS);

  // ── Auth ─────────────────────────────────────────────────────
  const [user, setUser] = useState(null);         // profile do usuário logado
  const [authUser, setAuthUser] = useState(null); // supabase auth.user
  const loginExplicito = useRef(false);

  // ── UI ───────────────────────────────────────────────────────
  const [view, setView] = useState("landing");
  const [presencaAtv, setPresencaAtv] = useState(null);
  const [showInscricao, setShowInscricao] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [linkExpirado, setLinkExpirado] = useState(null); // { email } quando link de confirmação expirou
  const [confirmandoEmail, setConfirmandoEmail] = useState(false); // true quando veio de link de confirmação válido
  const criandoProfile = useRef(false); // guarda contra criação duplicada de profile
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Detecta hash da URL ao carregar (usa INITIAL_HASH capturado antes do Supabase limpar) ─────
  useEffect(() => {
    if (!INITIAL_HASH) return;
    const params = new URLSearchParams(INITIAL_HASH.replace(/^#/, ""));

    if (params.get("error")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      const errorCode = params.get("error_code");
      const email     = params.get("email") || "";
      if (errorCode === "otp_expired" || params.get("error") === "access_denied") {
        setLinkExpirado({ email });
      }
    } else if (params.get("type") === "signup" && params.get("access_token")) {
      // Confirmação de e-mail bem-sucedida — mostra o modal de boas-vindas
      // Não limpa o hash aqui: o Supabase precisa ler os tokens para criar a sessão
      setConfirmandoEmail(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Carga inicial de dados ────────────────────────────────────
  async function loadData() {
    // Fase 1: dados críticos para mostrar o app (aguarda até 20s pelo cold start)
    const fase1 = await Promise.allSettled([
      fetchEvent(),       // 0
      fetchAtividades(),  // 1
      fetchProfiles(),    // 2
    ]);
    const get = r => r?.status === "fulfilled" ? r.value?.data : null;
    if (get(fase1[0])) setEvent(get(fase1[0]));
    if (get(fase1[1])) setAtividades(get(fase1[1]));
    if (get(fase1[2])) setProfiles(get(fase1[2]));

    // Fase 2: dados secundários em background (não bloqueia a tela)
    Promise.allSettled([
      fetchPresencas(),
      fetchAvaliacoes(),
      fetchForumConfig(),
      fetchTopicos(),
      fetchPontuacoes(),
      fetchInstituicoes(),
      fetchGamificacaoConfig(),
      fetchFollows(),
      fetchConvidados(),
    ]).then(([presRes, avalRes, fcRes, topRes, ponRes, instRes, gamRes, folRes, convRes]) => {
      if (get(presRes)) setPresencas(get(presRes));
      if (get(avalRes)) setAvaliacoes(get(avalRes));
      if (get(fcRes))   setForumConfig(get(fcRes));
      if (get(topRes))  setTopicos(get(topRes));
      if (get(ponRes))  setPontuacoes(get(ponRes));
      if (get(instRes)) setInstituicoes(get(instRes));
      if (get(gamRes))  setPontosConfig(get(gamRes));
      if (get(folRes))  setFollows(get(folRes));
      if (get(convRes)) setConvidados(get(convRes));
    });
  }

  // ── Auth listener ─────────────────────────────────────────────
  useEffect(() => {
    // Verifica sessão ativa imediatamente (sem bloquear a tela)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setAuthUser(session.user);
    });

    // Carrega dados do Supabase em background — substitui os mocks quando chegar
    loadData().catch(err => console.error("Erro ao carregar dados:", err));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setAuthUser(session.user);
      }
      if (event === "SIGNED_OUT") {
        setAuthUser(null);
        setUser(null);
        setView("landing");
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Quando authUser muda E profiles estiver carregado, resolve o profile
  useEffect(() => {
    if (!authUser) return;
    const prof = profiles.find(p => p.id === authUser.id);
    if (prof) {
      setUser(prof);
      setConfirmandoEmail(false);
      if (loginExplicito.current) {
        loginExplicito.current = false;
        navigate("/painel", { replace: true });
      }
    } else if (!loading && !criandoProfile.current) {
      fetchProfiles().then(async ({ data }) => {
        if (data) {
          setProfiles(data);
          const found = data.find(p => p.id === authUser.id);
          if (found) {
            setUser(found);
            setConfirmandoEmail(false);
            showToast(`Bem-vindo(a), ${found.nome.split(" ")[0]}!`, "success");
            if (loginExplicito.current) {
              loginExplicito.current = false;
              navigate("/painel", { replace: true });
            }
          } else {
            // Profile não encontrado — cria a partir do user_metadata (caso em que
            // a confirmação de e-mail estava ativada e o insert no signUp foi bloqueado pelo RLS)
            if (criandoProfile.current) return; // evita criação duplicada
            criandoProfile.current = true;
            const meta = authUser.user_metadata || {};
            if (meta.nome) {
              const novoProfile = {
                id:          authUser.id,
                role:        "participante",
                email:       authUser.email,
                nome:        meta.nome,
                cpf:         meta.cpf || "",
                instituicao: meta.instituicao || "",
                cargo:       meta.cargo || "",
                credenciado: false,
                ativo:       true,
                foto_iniciais: meta.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase(),
              };
              const { error } = await supabase.from("profiles").upsert(novoProfile, { onConflict: "id" });
              if (!error) {
                setProfiles(prev => [...prev, novoProfile]);
                setUser(novoProfile);
                setConfirmandoEmail(false);
                showToast(`E-mail confirmado! Bem-vindo(a), ${meta.nome.split(" ")[0]}!`, "success");
              } else {
                // Upsert falhou — tenta buscar o profile existente como fallback
                console.error("Erro ao criar profile:", error.message);
                const { data: existente } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
                if (existente) {
                  setProfiles(prev => prev.some(p => p.id === existente.id) ? prev : [...prev, existente]);
                  setUser(existente);
                  setConfirmandoEmail(false);
                  showToast(`Bem-vindo(a), ${existente.nome.split(" ")[0]}!`, "success");
                } else {
                  criandoProfile.current = false;
                }
              }
              navigate("/painel", { replace: true });
            } else {
              // Sem metadata — usuário antigo ou sem dados; redireciona para /painel mesmo assim
              criandoProfile.current = false;
              setConfirmandoEmail(false);
              navigate("/painel", { replace: true });
            }
          }
        }
      });
    }
  }, [authUser, profiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login callback (vindo do FormLogin após signIn) ───────────
  async function handleLogin() {
    loginExplicito.current = true;
    setShowLogin(false);
  }

  // ── Logout ───────────────────────────────────────────────────
  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
    showToast("Até logo!", "info");
  }

  // ── Pontuação por presença ────────────────────────────────────
  async function registrarPresencaComPontos(userId) {
    const ponto = {
      id: Date.now(),
      user_id: userId,
      tipo: "presenca",
      valor: PONTOS.presenca,
      desc: "Presença confirmada",
      created_at: new Date().toISOString(),
    };
    // Otimista
    setPontuacoes(prev => [...prev, ponto]);
    // Persiste
    await inserirPontuacao({ user_id: userId, tipo: "presenca", valor: PONTOS.presenca, desc: "Presença confirmada" });
  }

  // ── Derived: split de profiles por role ───────────────────────
  const palestrantes = profiles.filter(p => p.role === "palestrante");
  // Participantes = todos os profiles ativos (qualquer role pode receber certificado)
  const participantes = profiles.filter(p => p.ativo !== false);
  const admins = profiles.filter(p => ["super_admin", "admin", "credenciador"].includes(p.role));

  function simularQR(atividadeId) {
    setPresencaAtv(atividadeId);
    setView("presenca");
  }

  const adminProps = {
    user,
    event, setEvent,
    atividades, setAtividades,
    palestrantes,
    setPalestrantes: updated => setProfiles(prev => [...prev.filter(p => p.role !== "palestrante"), ...updated]),
    participantes,
    setParticipantes: updated => setProfiles(() => updated),
    presencas, setPresencas,
    admins,
    setAdmins: updated => setProfiles(prev => [...prev.filter(p => !["super_admin","admin","credenciador"].includes(p.role)), ...updated]),
    topicos, setTopicos,
    pontuacoes, setPontuacoes,
    pontosConfig, setPontosConfig,
    forumConfig, setForumConfig,
    avaliacoes, setAvaliacoes,
    instituicoes, setInstituicoes,
    convidados, setConvidados,
    onLogout: handleLogout,
    showToast,
  };

  return (
    <>
      <Toast toast={toast} />

      <Routes>
        {/* Validação pública de certificado — sem autenticação */}
        <Route path="/validar" element={<ValidarCertificado />} />

        {/* /admin e /admin/* redirecionam para /painel */}
        <Route path="/admin"   element={<Navigate to="/painel" replace />} />
        <Route path="/admin/*" element={<Navigate to="/painel" replace />} />

        {/* Rota principal — /painel e /painel/* para todos os usuários autenticados */}
        <Route path="/painel/*" element={
          !user
            ? <PainelLogin onLogin={handleLogin} instituicoes={instituicoes} showToast={showToast} />
            : ["super_admin","admin","credenciador"].includes(user.role)
              ? <PainelAdmin {...adminProps} />
              : <AreaUsuario
                  user={user}
                  setUser={u => setUser(typeof u === "function" ? u(user) : u)}
                  event={event} atividades={atividades} setAtividades={setAtividades}
                  palestrantes={palestrantes} presencas={presencas} setPresencas={setPresencas}
                  topicos={topicos} setTopicos={setTopicos} pontuacoes={pontuacoes} setPontuacoes={setPontuacoes}
                  forumConfig={forumConfig} participantes={participantes} admins={admins}
                  instituicoes={instituicoes} avaliacoes={avaliacoes} setAvaliacoes={setAvaliacoes}
                  follows={follows} setFollows={setFollows} pontosConfig={pontosConfig}
                  onSeguir={async (followingId) => {
                    const novo = { id: Date.now(), follower_id: user.id, following_id: followingId, criado_em: new Date().toISOString() };
                    setFollows(prev => [...prev, novo]);
                    seguirUsuario(user.id, followingId);
                    const pts = pontosConfig.seguir ?? 5;
                    if (pts > 0) {
                      const p = { id: Date.now()+1, user_id: user.id, tipo: "seguir", valor: pts, desc: "Seguiu um participante" };
                      setPontuacoes(prev => [...prev, p]);
                      inserirPontuacao(p);
                    }
                  }}
                  onDesseguir={(followingId) => {
                    setFollows(prev => prev.filter(f => !(f.follower_id === user.id && f.following_id === followingId)));
                    desseguirUsuario(user.id, followingId);
                  }}
                  registrarPresencaComPontos={registrarPresencaComPontos}
                  onLogout={handleLogout}
                />
        } />

        {/* Rota de presença via QR Code */}
        <Route path="/presenca/:atividadeId" element={
          <PresencaRoute
            atividades={atividades}
            participantes={participantes}
            presencas={presencas}
            setPresencas={setPresencas}
            user={user}
            onLoginClick={() => setShowLogin(true)}
            registrarPresencaComPontos={registrarPresencaComPontos}
          />
        } />

        {/* Landing page e presença (via state) */}
        <Route path="*" element={
          view === "presenca" ? (
            <PaginaPresenca
              atividadeId={presencaAtv}
              atividades={atividades}
              participantes={participantes}
              presencas={presencas}
              setPresencas={(newPresencas) => {
                if (Array.isArray(newPresencas)) {
                  const ultima = newPresencas[newPresencas.length - 1];
                  if (ultima && !presencas.find(p => p.id === ultima.id)) {
                    const uid = user?.id ?? ultima.participante_id;
                    if (uid) registrarPresencaComPontos(uid);
                  }
                }
                setPresencas(newPresencas);
              }}
              user={user}
              onVoltar={() => user ? navigate("/painel") : setView("landing")}
              onLoginClick={() => setShowLogin(true)}
              skipTokenCheck
            />
          ) : (
            <LandingPage
              event={event}
              atividades={atividades}
              palestrantes={palestrantes}
              user={user}
              onInscricaoClick={() => setShowInscricao(true)}
              onLoginClick={() => user ? navigate("/painel") : setShowLogin(true)}
            />
          )
        } />
      </Routes>

      <Modal show={showInscricao} onClose={() => setShowInscricao(false)} title="Inscrição no Evento">
        <FormInscricao showToast={showToast} onClose={() => setShowInscricao(false)} instituicoes={instituicoes} />
      </Modal>

      <Modal show={showLogin} onClose={() => setShowLogin(false)} title="Acesso ao Sistema">
        <FormLogin
          onLogin={handleLogin}
          onClose={() => setShowLogin(false)}
          onInscricaoClick={() => { setShowLogin(false); setShowInscricao(true); }}
        />
      </Modal>

      <Modal show={!!linkExpirado} onClose={() => setLinkExpirado(null)} title="Link de confirmação expirado">
        <LinkExpiradoModal
          email={linkExpirado?.email}
          onClose={() => setLinkExpirado(null)}
          onLogin={() => { setLinkExpirado(null); setShowLogin(true); }}
        />
      </Modal>

      <Modal show={confirmandoEmail && !user} onClose={() => setConfirmandoEmail(false)} title="Inscrição confirmada!">
        <div style={{ textAlign: "center", padding: "1rem 0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
          <h3 style={{ fontFamily: "'Playfair Display',serif", color: "var(--navy)", marginBottom: "0.5rem" }}>
            Inscrição confirmada com sucesso!
          </h3>
          <p style={{ color: "var(--text2)", marginBottom: "0.75rem", lineHeight: 1.6 }}>
            Seu e-mail foi verificado e você já está inscrito(a) no evento.<br />
            Preparando sua área de participante...
          </p>
          <div style={{ display: "inline-block", width: 32, height: 32, border: "3px solid var(--navy)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      </Modal>
    </>
  );
}
