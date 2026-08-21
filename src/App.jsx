import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import "./styles/global.css";

// Captura o hash ANTES de qualquer código assíncrono (Supabase limpa o hash via replaceState)
const INITIAL_HASH = window.location.hash;

import { supabase } from "./lib/supabase";
import {
  fetchEvent, fetchAtividades, fetchProfiles, fetchPresencas,
  fetchAvaliacoes, fetchForumConfig, fetchTopicos, fetchPontuacoes,
  fetchInstituicoes, fetchGamificacaoConfig, fetchFollows, fetchConvidados,
  fetchTurnos, fetchPresencasTurno, fetchPerguntasPesquisa,
  seguirUsuario, desseguirUsuario,
  inserirEnrollment,
} from "./lib/db";
import { INITIAL_EVENT, INITIAL_FORUM_CONFIG, INITIAL_GAMIFICACAO_CONFIG } from "./data/initial";
import { PONTOS } from "./config/gamificacao";
import { TIPO_ICON } from "./utils/helpers";
import { applyTheme } from "./lib/themes";

import { Toast, Modal } from "./components/base/index";
import { FormInscricao } from "./components/auth/FormInscricao";
import { FormLogin } from "./components/auth/FormLogin";
import { LandingPage } from "./components/landing/LandingPage";
import { PainelLogin } from "./components/PainelLogin";
import { PaginaPresenca } from "./components/presenca/PaginaPresenca";
import { PaginaPresencaTurno } from "./components/presenca/PaginaPresencaTurno";
import { AuthCallback } from "./components/auth/AuthCallback";
import { RoleSelector } from "./components/auth/RoleSelector";

// Painéis pesados carregam sob demanda (code splitting) — visitante da
// landing não baixa o painel admin nem a área do usuário
const AreaUsuario = lazy(() => import("./components/usuario/AreaUsuario").then(m => ({ default: m.AreaUsuario })));
const PainelAdmin = lazy(() => import("./components/admin/PainelAdmin").then(m => ({ default: m.PainelAdmin })));
const ValidarCertificado = lazy(() => import("./components/ValidarCertificado").then(m => ({ default: m.ValidarCertificado })));

function CarregandoPainel() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}>
      Carregando…
    </div>
  );
}

function PresencaRoute({ atividades, presencas, setPresencas, user, onLoginClick, registrarPresencaComPontos }) {
  const { atividadeId } = useParams();
  const navigate = useNavigate();

  function handleSetPresencas(updater) {
    const newPresencas = typeof updater === "function" ? updater(presencas) : updater;
    if (Array.isArray(newPresencas)) {
      const ultima = newPresencas[newPresencas.length - 1];
      if (ultima && !presencas.find(p => p.id === ultima.id)) {
        // Pontuação local otimista — no banco o trigger de presenças já pontuou
        registrarPresencaComPontos(ultima.participante_id);
      }
    }
    setPresencas(newPresencas);
  }

  return (
    <PaginaPresenca
      atividadeId={atividadeId}
      atividades={atividades}
      presencas={presencas}
      setPresencas={handleSetPresencas}
      user={user}
      onVoltar={() => navigate("/")}
      onLoginClick={onLoginClick}
    />
  );
}

function PresencaTurnoRoute({ turnos, presencasTurno, setPresencasTurno, user, onLoginClick, onLogout, registrarPresencaComPontos }) {
  const { turnoId } = useParams();
  const navigate = useNavigate();

  function handleSetPresencasTurno(updater) {
    const novas = typeof updater === "function" ? updater(presencasTurno) : updater;
    if (Array.isArray(novas)) {
      const ultima = novas[novas.length - 1];
      if (ultima && !presencasTurno.find(p => p.id === ultima.id)) {
        // Pontuação local otimista — no banco o trigger de presenças já pontuou
        registrarPresencaComPontos(ultima.participante_id);
      }
    }
    setPresencasTurno(novas);
  }

  return (
    <PaginaPresencaTurno
      turnoId={turnoId}
      turnos={turnos}
      presencasTurno={presencasTurno}
      setPresencasTurno={handleSetPresencasTurno}
      user={user}
      onVoltar={() => navigate("/")}
      onLoginClick={onLoginClick}
      onLogout={onLogout}
    />
  );
}

function LinkExpiradoModal({ email, tipo = "signup", onClose, onLogin }) {
  const [enviando, setEnviando] = useState(false);
  const [reenvioOk, setReenvioOk] = useState(false);
  const [emailInput, setEmailInput] = useState(email || "");
  const recovery = tipo === "recovery";

  async function reenviar() {
    if (!emailInput.includes("@")) return;
    setEnviando(true);
    if (recovery) {
      await supabase.auth.resetPasswordForEmail(emailInput.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
    } else {
      await supabase.auth.resend({ type: "signup", email: emailInput });
    }
    setEnviando(false);
    setReenvioOk(true);
  }

  return (
    <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔗</div>
      <p style={{ color: "var(--text2)", marginBottom: "0.5rem", lineHeight: 1.6 }}>
        Este link de {recovery ? "redefinição de senha" : "confirmação"} <strong>já foi utilizado ou expirou</strong>.
      </p>
      <p style={{ color: "var(--text3)", fontSize: "0.85rem", marginBottom: "1.25rem", lineHeight: 1.6 }}>
        {recovery
          ? <>Isso pode acontecer se o link demorou pra ser aberto, foi usado mais de uma vez, ou foi verificado automaticamente pelo seu provedor de e-mail. Solicite um novo abaixo.</>
          : <>Se você já confirmou seu e-mail anteriormente, basta fazer login normalmente.<br />Caso contrário, solicite um novo link abaixo.</>}
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
              {enviando ? "Enviando…" : recovery ? "↩ Reenviar link de redefinição" : "↩ Reenviar link de confirmação"}
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
  const [loading, setLoading] = useState(false); // eslint-disable-line no-unused-vars

  // ── Estado — inicia com mock, substitui pelo Supabase quando disponível ──
  const [eventLoaded, setEventLoaded] = useState(false);
  const [event, setEvent] = useState(INITIAL_EVENT);
  useEffect(() => {
    document.title = event.nome_completo
      ? `${event.nome} — ${event.nome_completo}`
      : event.nome;
  }, [event.nome, event.nome_completo]);
  // Só aplica tema quando vier do Supabase (event.tema !== undefined).
  // O módulo themes.js já aplica o cache do localStorage sincronicamente antes do React renderizar.
  useEffect(() => { if (event.tema !== undefined) applyTheme(event.tema); }, [event.tema]);
  // Listas começam vazias e são preenchidas pelo Supabase — nada de
  // dados fictícios aparecendo para o usuário durante o carregamento
  const [atividades, setAtividades] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [presencas, setPresencas] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [presencasTurno, setPresencasTurno] = useState([]);
  const [perguntasPesquisa, setPerguntasPesquisa] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [forumConfig, setForumConfig] = useState(INITIAL_FORUM_CONFIG);
  const [topicos, setTopicos] = useState([]);
  const [pontuacoes, setPontuacoes] = useState([]);
  const [instituicoes, setInstituicoes] = useState([]);
  const [pontosConfig, setPontosConfig] = useState(INITIAL_GAMIFICACAO_CONFIG);
  const [follows, setFollows] = useState([]);
  const [convidados, setConvidados] = useState([]);

  // ── Auth ─────────────────────────────────────────────────────
  const [user, setUser] = useState(null);         // profile do usuário logado
  const [authUser, setAuthUser] = useState(null); // supabase auth.user
  const [authChecked, setAuthChecked] = useState(false); // já checou se existe sessão salva (evita flash de tela de login no F5)
  const loginExplicito = useRef(false);
  const [activeRole, setActiveRole] = useState(null);       // role ativo na sessão
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [roleSelectorOptions, setRoleSelectorOptions] = useState([]);

  // Usuário efetivo: mesmo profile mas com o role selecionado na sessão.
  // is_palestrante não é mais afetado pelo role escolhido — participante
  // que também é palestrante vê os dois perfis mesclados, sem precisar trocar.
  const effectiveUser = useMemo(() => {
    if (!user) return null;
    const role = activeRole ?? user.role;
    return { ...user, role };
  }, [user, activeRole]);

  // ── UI ───────────────────────────────────────────────────────
  const [showInscricao, setShowInscricao] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [linkExpirado, setLinkExpirado] = useState(null); // { email } quando link de confirmação expirou
  const [confirmandoEmail, setConfirmandoEmail] = useState(false); // true quando veio de link de confirmação válido
  const criandoProfile = useRef(false); // guarda contra criação duplicada de profile
  const profilesRecarregado = useRef(false); // garante 1 refetch de profiles já autenticado (ver comentário abaixo)
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
        // "Esqueci minha senha" marca esse flag antes de sair pro e-mail —
        // se o link vier com erro, sabemos que era um link de redefinição de
        // senha (não de confirmação de cadastro) e ajustamos a mensagem/reenvio.
        const tipo = sessionStorage.getItem("enaudin_reset_pendente") ? "recovery" : "signup";
        sessionStorage.removeItem("enaudin_reset_pendente");
        setLinkExpirado({ email, tipo });
      }
    } else if (params.get("type") === "signup" && params.get("access_token")) {
      // Confirmação de e-mail bem-sucedida — mostra o modal de boas-vindas
      // Não limpa o hash aqui: o Supabase precisa ler os tokens para criar a sessão
      setConfirmandoEmail(true);
    }
  }, []);

  // ── Carga inicial de dados ────────────────────────────────────
  async function loadData() {
    const get = r => r?.status === "fulfilled" ? r.value?.data : null;

    // Fase 1: dados críticos para mostrar o app (aguarda até 20s pelo cold start)
    const fase1 = await Promise.allSettled([
      fetchEvent(),       // 0
      fetchAtividades(),  // 1
      fetchProfiles(),    // 2
    ]);
    if (get(fase1[0])) { setEvent(get(fase1[0])); setEventLoaded(true); } else { setEventLoaded(true); }
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
      fetchTurnos(),
      fetchPresencasTurno(),
      fetchPerguntasPesquisa(),
    ]).then(([presRes, avalRes, fcRes, topRes, ponRes, instRes, gamRes, folRes, convRes, turRes, presTurRes, pergRes]) => {
      if (get(presRes)) setPresencas(get(presRes));
      if (get(avalRes)) setAvaliacoes(get(avalRes));
      if (get(fcRes))   setForumConfig(get(fcRes));
      if (get(topRes))  setTopicos(get(topRes));
      if (get(ponRes))  setPontuacoes(get(ponRes));
      if (get(instRes)) setInstituicoes(get(instRes));
      if (get(gamRes))  setPontosConfig(get(gamRes));
      if (get(folRes))  setFollows(get(folRes));
      if (get(convRes)) setConvidados(get(convRes));
      if (get(turRes))  setTurnos(get(turRes));
      if (get(presTurRes)) setPresencasTurno(get(presTurRes));
      if (get(pergRes)) setPerguntasPesquisa(get(pergRes));
    });
  }

  // ── Auth listener ─────────────────────────────────────────────
  useEffect(() => {
    // Espera a sessão ser restaurada (rápido — normalmente só localStorage,
    // sem round-trip de rede) antes de carregar os dados. Se loadData() (que
    // busca profiles) disparasse em paralelo com getSession(), a query podia
    // sair sem o JWT anexado ainda, caindo no recorte público do RLS em vez
    // da lista completa — daí números menores que só se corrigiam ao atualizar.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setAuthUser(session.user);
      setAuthChecked(true);
      loadData().catch(err => console.error("Erro ao carregar dados:", err));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION é o evento disparado ao restaurar uma sessão já
      // existente (refresh de página) — SIGNED_IN só ocorre em login novo.
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        setAuthUser(session.user);
      }
      if (event === "INITIAL_SESSION") setAuthChecked(true);
      if (event === "SIGNED_OUT") {
        setAuthUser(null);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Quando authUser muda E profiles estiver carregado, resolve o profile
  useEffect(() => {
    if (!authUser) return;

    // Verifica se o usuário tem múltiplos perfis e decide o que fazer
    function resolveRole(prof) {
      // "palestrante" e "credenciador" não são mais roles selecionáveis: quem é
      // participante (ou admin) e também é palestrante/credenciador vê tudo
      // mesclado direto na própria área, sem precisar trocar de perfil.
      const derivedRoles = [
        ...(prof.role === "admin" ? ["admin"] : ["participante"]),
        ...(prof.role === "admin" ? ["participante"] : []),
      ];
      const allRoles = derivedRoles.length > 1 ? derivedRoles : null;
      if (allRoles) {
        setRoleSelectorOptions(allRoles); // sempre disponível para o botão Trocar perfil
        const stored = sessionStorage.getItem("enaudin_active_role");
        const noAdmin = location.pathname.startsWith("/painel");
        if (stored && allRoles.includes(stored) && !loginExplicito.current) {
          setActiveRole(stored); // restaura silenciosamente (ex: F5)
        } else if (loginExplicito.current || noAdmin) {
          loginExplicito.current = false;
          setShowRoleSelector(true); // mostra seletor de perfil
        } else {
          // sessão restaurada fora do painel — usa o primeiro role sem interromper
          loginExplicito.current = false;
          setActiveRole(stored && allRoles.includes(stored) ? stored : allRoles[0]);
        }
      } else {
        setActiveRole(prof.role);
        if (loginExplicito.current) {
          loginExplicito.current = false;
          navigate("/painel", { replace: true });
        }
      }
    }

    // Corrige uma corrida rara: se loadData() rodou antes do client anexar o
    // JWT de vez (getSession() às vezes resolve cedo demais), fetchProfiles()
    // sai como se fosse anônimo e traz só o recorte público (ex: só
    // palestrantes). Se o próprio usuário também for palestrante, seu profile
    // aparece nesse recorte e o fluxo normal nunca detectava a lista
    // incompleta — só um F5 corrigia. Refaz o fetch 1x aqui, já autenticado.
    if (!profilesRecarregado.current) {
      profilesRecarregado.current = true;
      fetchProfiles().then(({ data }) => { if (data) setProfiles(data); });
    }

    const prof = profiles.find(p => p.id === authUser.id);
    if (prof) {
      setUser(prof);
      setConfirmandoEmail(false);
      resolveRole(prof);
    } else if (!loading && !criandoProfile.current) {
      fetchProfiles().then(async ({ data }) => {
        if (data) {
          setProfiles(data);
          const found = data.find(p => p.id === authUser.id);
          if (found) {
            setUser(found);
            setConfirmandoEmail(false);
            // Só cumprimenta em login explícito — esse ramo (profile não
            // achado na 1ª leitura de profiles) também acontece num F5 comum,
            // quando authUser resolve antes de profiles terminar de carregar.
            if (loginExplicito.current) showToast(`Bem-vindo(a), ${found.nome.split(" ")[0]}!`, "success");
            resolveRole(found);
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
                nome_publico: meta.nome_publico || "",
                cpf:         meta.cpf || "",
                instituicao: meta.instituicao || "",
                cargo:       meta.cargo || "",
                credenciado: false,
                ativo:       true,
                foto_iniciais: meta.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase(),
              };
              const { error } = await supabase.from("profiles").upsert(novoProfile, { onConflict: "id" });
              if (!error) {
                inserirEnrollment(novoProfile.id, "participante");
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

  // ── Seleção de perfil ─────────────────────────────────────────
  function handleSelectRole(role) {
    sessionStorage.setItem("enaudin_active_role", role);
    setActiveRole(role);
    setShowRoleSelector(false);
    navigate("/painel", { replace: true });
  }

  // ── Logout ───────────────────────────────────────────────────
  async function handleLogout() {
    sessionStorage.removeItem("enaudin_active_role");
    setActiveRole(null);
    await supabase.auth.signOut();
    navigate("/", { replace: true });
    showToast("Até logo!", "info");
  }

  // ── Pontuação por presença (só estado local — o trigger do banco
  //    concede os pontos reais junto com o insert da presença) ──
  function registrarPresencaComPontos(userId) {
    if (!userId) return;
    setPontuacoes(prev => [...prev, {
      id: Date.now(),
      user_id: userId,
      tipo: "presenca",
      valor: PONTOS.presenca,
      desc: "Presença confirmada",
      created_at: new Date().toISOString(),
    }]);
  }

  // ── Derived: split de profiles por role ───────────────────────
  const palestrantes = profiles.filter(p => p.is_palestrante);
  // Participantes = todos os profiles ativos (qualquer role pode receber certificado)
  const participantes = profiles.filter(p => p.ativo !== false);
  const admins = profiles.filter(p => p.role === "admin");

  const adminProps = {
    user: effectiveUser,
    onSwitchRole: () => setShowRoleSelector(true),
    event, setEvent,
    atividades, setAtividades,
    palestrantes,
    setPalestrantes: updated => setProfiles(prev => [...prev.filter(p => !p.is_palestrante), ...updated]),
    participantes,
    setParticipantes: updated => setProfiles(() => updated),
    presencas, setPresencas,
    turnos, setTurnos,
    presencasTurno, setPresencasTurno,
    admins,
    setAdmins: updated => setProfiles(prev => [...prev.filter(p => p.role !== "admin"), ...updated]),
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

  // Ainda não sabemos se existe sessão salva (getSession() não voltou) ou já
  // sabemos que tem sessão mas o profile ainda não resolveu — evita mostrar a
  // tela de login por um instante antes de trocar pro painel real no F5.
  const authResolving = !authChecked || (!!authUser && !effectiveUser);

  // Elemento da área logada — servido tanto em /painel quanto em /login
  // (rota mais amigável usada no link de "complete seu cadastro" por e-mail).
  const painelElement = authResolving
    ? <CarregandoPainel />
    : !effectiveUser
    ? <PainelLogin onLogin={handleLogin} instituicoes={instituicoes} showToast={showToast} event={event} eventLoaded={eventLoaded} />
    : effectiveUser.role === "admin"
      ? <PainelAdmin {...adminProps} />
      : <AreaUsuario
          user={effectiveUser}
          setUser={u => setUser(typeof u === "function" ? u(user) : u)}
          onSwitchRole={roleSelectorOptions.length > 1 ? () => setShowRoleSelector(true) : null}
          setParticipantes={updated => setProfiles(() => updated)}
          event={event} atividades={atividades} setAtividades={setAtividades}
          palestrantes={palestrantes} presencas={presencas}
          turnos={turnos} presencasTurno={presencasTurno}
          perguntasPesquisa={perguntasPesquisa}
          topicos={topicos} setTopicos={setTopicos} pontuacoes={pontuacoes} setPontuacoes={setPontuacoes}
          forumConfig={forumConfig} participantes={participantes} admins={admins}
          instituicoes={instituicoes} setInstituicoes={setInstituicoes} avaliacoes={avaliacoes} setAvaliacoes={setAvaliacoes}
          follows={follows} setFollows={setFollows} pontosConfig={pontosConfig}
          onSeguir={async (followingId) => {
            const novo = { id: Date.now(), follower_id: user.id, following_id: followingId, criado_em: new Date().toISOString() };
            setFollows(prev => [...prev, novo]);
            seguirUsuario(user.id, followingId);
            // Pontos reais vêm do trigger de follows; aqui só o otimista
            const pts = pontosConfig.seguir ?? 5;
            if (pts > 0) {
              setPontuacoes(prev => [...prev, { id: Date.now()+1, user_id: user.id, tipo: "seguir", valor: pts, desc: "Seguiu um participante" }]);
            }
          }}
          onDesseguir={(followingId) => {
            setFollows(prev => prev.filter(f => !(f.follower_id === user.id && f.following_id === followingId)));
            desseguirUsuario(user.id, followingId);
            // Estorno local do ponto de seguir (o trigger estorna no banco)
            setPontuacoes(prev => {
              const idx = prev.findLastIndex(p => p.user_id === user.id && p.tipo === "seguir");
              return idx === -1 ? prev : prev.filter((_, i) => i !== idx);
            });
          }}
          onLogout={handleLogout}
          showToast={showToast}
        />;

  return (
    <>
      <Toast toast={toast} />

      {showRoleSelector && user && (
        <RoleSelector user={user} roles={roleSelectorOptions} onSelect={handleSelectRole} />
      )}

      <Suspense fallback={<CarregandoPainel />}>
      <Routes>
        {/* Callback de autenticação por magic link */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Validação pública de certificado — sem autenticação */}
        <Route path="/validar" element={<ValidarCertificado />} />

        {/* /admin e /admin/* redirecionam para /painel */}
        <Route path="/admin"   element={<Navigate to="/painel" replace />} />
        <Route path="/admin/*" element={<Navigate to="/painel" replace />} />

        {/* Rota principal — /painel e /painel/* para todos os usuários autenticados */}
        <Route path="/painel/*" element={painelElement} />

        {/* Alias amigável — usado no link de "complete seu cadastro" por e-mail */}
        <Route path="/login/*" element={painelElement} />

        {/* Rota de presença via QR Code */}
        <Route path="/presenca/:atividadeId" element={
          <PresencaRoute
            atividades={atividades}
            presencas={presencas}
            setPresencas={setPresencas}
            user={user}
            onLoginClick={() => setShowLogin(true)}
            registrarPresencaComPontos={registrarPresencaComPontos}
          />
        } />

        {/* Rota de presença por turno via QR Code */}
        <Route path="/presenca-turno/:turnoId" element={
          <PresencaTurnoRoute
            turnos={turnos}
            presencasTurno={presencasTurno}
            setPresencasTurno={setPresencasTurno}
            user={user}
            onLoginClick={() => setShowLogin(true)}
            onLogout={handleLogout}
            registrarPresencaComPontos={registrarPresencaComPontos}
          />
        } />

        {/* Landing page */}
        <Route path="*" element={
          (
            <LandingPage
              event={event}
              eventLoaded={eventLoaded}
              atividades={atividades}
              palestrantes={palestrantes}
              instituicoes={instituicoes}
              user={user}
              onInscricaoClick={() => setShowInscricao(true)}
              onLoginClick={() => navigate("/painel")}
            />
          )
        } />
      </Routes>
      </Suspense>

      <Modal show={showInscricao} onClose={() => setShowInscricao(false)} title="Inscrição no Evento" wide>
        <FormInscricao showToast={showToast} onClose={() => setShowInscricao(false)} instituicoes={instituicoes} />
      </Modal>

      <Modal show={showLogin} onClose={() => setShowLogin(false)} title="Acesso ao Sistema">
        <FormLogin
          onLogin={handleLogin}
          onClose={() => setShowLogin(false)}
          onInscricaoClick={() => { setShowLogin(false); setShowInscricao(true); }}
        />
      </Modal>

      <Modal show={!!linkExpirado} onClose={() => setLinkExpirado(null)} title={linkExpirado?.tipo === "recovery" ? "Link de redefinição expirado" : "Link de confirmação expirado"}>
        <LinkExpiradoModal
          email={linkExpirado?.email}
          tipo={linkExpirado?.tipo}
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
