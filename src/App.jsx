import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import "./styles/global.css";

import { supabase } from "./lib/supabase";
import {
  fetchEvent, fetchAtividades, fetchProfiles, fetchPresencas,
  fetchAvaliacoes, fetchForumConfig, fetchTopicos, fetchPontuacoes,
  fetchInstituicoes,
  inserirPontuacao,
} from "./lib/db";
import {
  INITIAL_EVENT, INITIAL_ATIVIDADES, INITIAL_PALESTRANTES, INITIAL_PARTICIPANTES,
  INITIAL_PRESENCAS, INITIAL_ADMINS, INITIAL_TOPICOS, INITIAL_PONTUACOES,
  INITIAL_FORUM_CONFIG, INITIAL_AVALIACOES, INITIAL_INSTITUICOES,
} from "./data/initial";
import { PONTOS } from "./config/gamificacao";
import { TIPO_ICON } from "./utils/helpers";

import { Toast, Modal } from "./components/base/index";
import { FormInscricao } from "./components/auth/FormInscricao";
import { FormLogin } from "./components/auth/FormLogin";
import { LandingPage } from "./components/landing/LandingPage";
import { AreaUsuario } from "./components/usuario/AreaUsuario";
import { PainelAdmin } from "./components/admin/PainelAdmin";
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

  // ── Auth ─────────────────────────────────────────────────────
  const [user, setUser] = useState(null);         // profile do usuário logado
  const [authUser, setAuthUser] = useState(null); // supabase auth.user

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
    ]).then(([presRes, avalRes, fcRes, topRes, ponRes, instRes]) => {
      if (get(presRes)) setPresencas(get(presRes));
      if (get(avalRes)) setAvaliacoes(get(avalRes));
      if (get(fcRes))   setForumConfig(get(fcRes));
      if (get(topRes))  setTopicos(get(topRes));
      if (get(ponRes))  setPontuacoes(get(ponRes));
      if (get(instRes)) setInstituicoes(get(instRes));
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
      if (v === "admin" && !location.pathname.startsWith("/admin")) {
        navigate("/admin/dashboard", { replace: true });
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
            if (v === "admin" && !location.pathname.startsWith("/admin")) {
              navigate("/admin/dashboard", { replace: true });
            }
          }
        }
      });
    }
  }, [authUser, profiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login callback (vindo do FormLogin após signIn) ───────────
  async function handleLogin(authUserObj) {
    // onAuthStateChange já dispara — só precisa fechar o modal
    setShowLogin(false);
    // showToast é chamado no useEffect acima quando profile é resolvido
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
  const participantes = profiles.filter(p => p.role === "participante");
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
    setParticipantes: updated => setProfiles(prev => [...prev.filter(p => p.role !== "participante"), ...updated]),
    presencas, setPresencas,
    admins,
    setAdmins: updated => setProfiles(prev => [...prev.filter(p => !["super_admin","admin","credenciador"].includes(p.role)), ...updated]),
    topicos, setTopicos,
    pontuacoes, setPontuacoes,
    forumConfig, setForumConfig,
    avaliacoes, setAvaliacoes,
    instituicoes, setInstituicoes,
    onLogout: handleLogout,
    showToast,
  };

  return (
    <>
      <Toast toast={toast} />

      <Routes>
        {/* Rotas do painel admin */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/*" element={
          user ? <PainelAdmin {...adminProps} /> : null
        } />

        {/* Todas as demais views (landing, participante, presença) */}
        <Route path="*" element={<>
          {view === "landing" && (
            <>
              <LandingPage
                event={event}
                atividades={atividades}
                palestrantes={palestrantes}
                onInscricaoClick={() => setShowInscricao(true)}
                onLoginClick={() => setShowLogin(true)}
              />
              {/* DEMO BAR */}
              <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--navy-dark)", padding: "0.6rem 1.5rem", display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap", zIndex: 500, borderTop: "2px solid var(--gold)" }}>
                <span style={{ color: "var(--gold)", fontSize: "0.78rem", fontWeight: 700 }}>🎯 DEMO:</span>
                <button className="btn btn-sm btn-gold" onClick={() => setShowLogin(true)}>Login</button>
                <button className="btn btn-sm btn-outline" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }} onClick={() => setShowInscricao(true)}>Inscrição</button>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.72rem" }}>|</span>
                <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.72rem" }}>Simular QR:</span>
                {atividades.filter(a => a.tipo !== "intervalo").slice(0, 4).map(a => (
                  <button key={a.id} className="btn btn-sm" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.13)", fontSize: "0.72rem" }}
                    onClick={() => simularQR(a.id)} title={a.titulo}>
                    {TIPO_ICON[a.tipo]} {a.titulo.substring(0, 20)}…
                  </button>
                ))}
              </div>
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
