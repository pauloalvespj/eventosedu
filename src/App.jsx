import { useState, useEffect, useCallback, useRef } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import "./styles/global.css";

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

import { Toast, Modal } from "./components/base/index";
import { FormInscricao } from "./components/auth/FormInscricao";
import { FormLogin } from "./components/auth/FormLogin";
import { LandingPage } from "./components/landing/LandingPage";
import { AreaUsuario } from "./components/usuario/AreaUsuario";
import { PainelAdmin } from "./components/admin/PainelAdmin";
import { AdminLogin } from "./components/admin/AdminLogin";
import { PaginaPresenca } from "./components/presenca/PaginaPresenca";

// Converte dados mock para o formato profiles (array unificado)
const INITIAL_PROFILES = [
  ...INITIAL_PARTICIPANTES,
  ...INITIAL_PALESTRANTES.map(p => ({ ...p, role: "palestrante" })),
  ...INITIAL_ADMINS,
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false); // sem tela de loading — mock é imediato

  // ── Estado — inicia com mock, substitui pelo Supabase quando disponível ──
  const [event, setEvent] = useState(INITIAL_EVENT);
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
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Views derivadas por role ──────────────────────────────────
  function viewParaRole(role) {
    if (["super_admin", "admin", "credenciador"].includes(role)) return "admin";
    return "participante";
  }

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
      const v = viewParaRole(prof.role);
      setUser(prof);
      setView(v);
      if (loginExplicito.current && v === "admin") {
        loginExplicito.current = false;
        navigate("/admin", { replace: true });
      }
    } else if (!loading) {
      fetchProfiles().then(({ data }) => {
        if (data) {
          setProfiles(data);
          const found = data.find(p => p.id === authUser.id);
          if (found) {
            const v = viewParaRole(found.role);
            setUser(found);
            setView(v);
            showToast(`Bem-vindo(a), ${found.nome.split(" ")[0]}!`, "success");
            if (loginExplicito.current && v === "admin") {
              loginExplicito.current = false;
              navigate("/admin", { replace: true });
            }
          }
        }
      });
    }
  }, [authUser, profiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login callback (vindo do FormLogin após signIn) ───────────
  async function handleLogin(authUserObj) {
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
        {/* Rotas do painel admin */}
        <Route path="/admin" element={
          user ? <PainelAdmin {...adminProps} /> : <AdminLogin onLogin={handleLogin} instituicoes={instituicoes} showToast={showToast} />
        } />
        <Route path="/admin/*" element={
          user ? <PainelAdmin {...adminProps} /> : <AdminLogin onLogin={handleLogin} instituicoes={instituicoes} showToast={showToast} />
        } />

        {/* Todas as demais views (landing, participante, presença) */}
        <Route path="*" element={<>
          {(view === "landing" || view === "admin") && (
            <>
              <LandingPage
                event={event}
                atividades={atividades}
                palestrantes={palestrantes}
                onInscricaoClick={() => setShowInscricao(true)}
                onLoginClick={() => {
                  if (user) {
                    if (["super_admin","admin","credenciador"].includes(user.role)) navigate("/admin");
                    else setView(viewParaRole(user.role));
                  } else {
                    setShowLogin(true);
                  }
                }}
              />
            </>
          )}

          {(view === "participante" || view === "palestrante") && user && (
            <AreaUsuario
              user={user}
              setUser={u => setUser(typeof u === "function" ? u(user) : u)}
              event={event}
              atividades={atividades}
              palestrantes={palestrantes}
              presencas={presencas}
              setPresencas={setPresencas}
              topicos={topicos} setTopicos={setTopicos}
              pontuacoes={pontuacoes} setPontuacoes={setPontuacoes}
              forumConfig={forumConfig}
              participantes={participantes}
              admins={admins}
              avaliacoes={avaliacoes} setAvaliacoes={setAvaliacoes}
              follows={follows} setFollows={setFollows}
              pontosConfig={pontosConfig}
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
          )}

          {view === "presenca" && (
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
              onVoltar={() => setView(user
                ? (["super_admin","admin","credenciador"].includes(user.role) ? "admin" : "participante")
                : "landing")}
              onLoginClick={() => setShowLogin(true)}
            />
          )}
        </>} />
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
    </>
  );
}
