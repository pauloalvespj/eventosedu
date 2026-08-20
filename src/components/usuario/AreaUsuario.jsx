import { useState, useEffect } from "react";
import { useRoutes, Navigate, NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse, faCalendarDays, faCircleCheck, faTrophy, faComments, faMedal,
  faHandshake, faClipboardList, faCircleUser, faMicrophone, faCircleHalfStroke, faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { calcPresenca, calcPontos, getNivel, getUserId } from "../../utils/helpers";
import { toggleHighContrast, isHighContrast } from "../../lib/a11y";
import { AvatarUpload } from "../base/index";
import { ForumView } from "../forum/ForumView";
import { RankingView } from "../forum/RankingView";
import { RedeView } from "./RedeView";
import { PesquisaSatisfacaoForm } from "./PesquisaSatisfacaoForm";
import { fetchQrToken, fetchMinhasRespostasPesquisa } from "../../lib/db";
import { UsuarioContext, useUsuario } from "./UsuarioContext";

import { Dashboard } from "./sections/Dashboard";
import { MinhasPalestras } from "./sections/MinhasPalestras";
import { PresentesPal } from "./sections/PresentesPal";
import { Programacao } from "./sections/Programacao";
import { Presencas } from "./sections/Presencas";
import { Certificado } from "./sections/Certificado";
import { CredencialQR } from "./sections/CredencialQR";
import { MeusDados } from "./sections/MeusDados";

// ── Pequenos adaptadores — encaixam os componentes de view genéricos
// (usados também em outras telas) no formato de rota desta área ──
function ForumTab() {
  const { user, topicos, setTopicos, pontuacoes, setPontuacoes, forumConfig } = useUsuario();
  return <ForumView user={user} topicos={topicos} setTopicos={setTopicos} pontuacoes={pontuacoes} setPontuacoes={setPontuacoes} forumConfig={forumConfig} />;
}
function RankingTab() {
  const { participantes, palestrantes, admins, pontuacoes, user } = useUsuario();
  return <RankingView participantes={participantes} palestrantes={palestrantes} admins={admins} pontuacoes={pontuacoes} user={user} />;
}
function RedeTab() {
  const { user, participantes, follows, pontosConfig, onSeguir, onDesseguir } = useUsuario();
  return <RedeView user={user} participantes={participantes} follows={follows} pontosConfig={pontosConfig} onSeguir={onSeguir} onDesseguir={onDesseguir} />;
}
function PesquisaTab() {
  const { event, user, perguntasPesquisa, setRespondeuPesquisa } = useUsuario();
  return <PesquisaSatisfacaoForm event={event} user={user} perguntasPesquisa={perguntasPesquisa} onRespondido={() => setRespondeuPesquisa(true)} />;
}

function AreaUsuarioRoutes() {
  const { event, isPalestrante, perfilIncompleto, podeResponderPesquisa } = useUsuario();
  return useRoutes([
    { index: true, element: perfilIncompleto ? <Navigate to="/painel/dados/editar" replace /> : <Dashboard /> },
    { path: "programacao", element: <Programacao /> },
    { path: "presencas",   element: <Presencas /> },
    { path: "certificado", element: event.certificado_disponivel ? <Certificado /> : <Navigate to="/painel" replace /> },
    { path: "credencial",  element: <CredencialQR /> },
    { path: "forum",       element: event.forum_ativo !== false ? <ForumTab /> : <Navigate to="/painel" replace /> },
    { path: "ranking",     element: event.gamificacao_ativa !== false ? <RankingTab /> : <Navigate to="/painel" replace /> },
    { path: "rede",        element: event.rede_visivel !== false ? <RedeTab /> : <Navigate to="/painel" replace /> },
    { path: "pesquisa",    element: (event.pesquisa_ativa && podeResponderPesquisa) ? <PesquisaTab /> : <Navigate to="/painel" replace /> },
    { path: "dados",         element: <MeusDados /> },
    { path: "dados/editar",  element: <MeusDados /> },
    { path: "palestras",   element: isPalestrante ? <MinhasPalestras /> : <Navigate to="/painel" replace /> },
    { path: "presentes",   element: isPalestrante ? <PresentesPal /> : <Navigate to="/painel" replace /> },
    { path: "*",            element: <Navigate to="/painel" replace /> },
  ]);
}

export function AreaUsuario(props) {
  const {
    user, setUser, event, atividades, setAtividades, palestrantes, presencas, turnos = [], presencasTurno = [],
    perguntasPesquisa = [], topicos, setTopicos, pontuacoes, setPontuacoes, forumConfig, participantes, admins,
    instituicoes, setInstituicoes, avaliacoes, setAvaliacoes, follows, pontosConfig, onSeguir, onDesseguir,
    onLogout, onSwitchRole,
  } = props;

  const porTurno = event.modo_frequencia === "turno";
  const isPalestrante = user.is_palestrante;
  const perfilIncompleto = !user.cpf || !user.email || !user.nome_publico || !user.instituicao || !user.cargo || (isPalestrante && !user.mini_bio);
  const [minhaAreaAberta, setMinhaAreaAberta] = useState(false);
  const [altoContraste, setAltoContraste] = useState(isHighContrast);

  // Tokens de QR das atividades do palestrante (lidos do banco; o RLS
  // permite para palestrantes da atividade, admin e credenciador)
  const [qrTokens, setQrTokens] = useState({});
  useEffect(() => {
    if (!user.is_palestrante) return;
    const minhas = atividades.filter(a => (a.palestrantes_ids || []).includes(user.id));
    minhas.forEach(a => {
      if (qrTokens[a.id] !== undefined) return;
      fetchQrToken(a.id).then(token => {
        setQrTokens(prev => ({ ...prev, [a.id]: token }));
      });
    });
  }, [user.id, user.is_palestrante, atividades]); // eslint-disable-line react-hooks/exhaustive-deps

  // Já respondeu a pesquisa de satisfação? (pra parar de destacar no dashboard depois que responder)
  const [respondeuPesquisa, setRespondeuPesquisa] = useState(null); // null = ainda não checou
  useEffect(() => {
    if (!event.pesquisa_ativa) return;
    fetchMinhasRespostasPesquisa(user.id).then(({ data }) => setRespondeuPesquisa((data || []).length > 0));
  }, [event.pesquisa_ativa, user.id]);

  // Tela de inscrição cancelada
  if (user.ativo === false) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
          <h2 style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "0.5rem" }}>Inscrição cancelada</h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
            Sua participação no <strong>{event.nome}</strong> foi cancelada. Entre em contato com a organização do evento caso queira reativar sua inscrição.
          </p>
          <button className="btn btn-outline" onClick={onLogout}>← Sair</button>
        </div>
      </div>
    );
  }

  // Tela de inscrição pendente de aprovação (limite de inscrições atingido)
  if (user.status_inscricao === "pendente") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
          <h2 style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "0.5rem" }}>Inscrição pendente de aprovação</h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
            O evento <strong>{event.nome}</strong> atingiu o limite de vagas no momento da sua inscrição. Assim que a organização aprovar seu cadastro, você terá acesso completo à plataforma.
          </p>
          <button className="btn btn-outline" onClick={onLogout}>← Sair</button>
        </div>
      </div>
    );
  }

  // Tela de inscrição recusada
  if (user.status_inscricao === "recusado") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚫</div>
          <h2 style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "0.5rem" }}>Inscrição não aprovada</h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
            Sua inscrição no <strong>{event.nome}</strong> não foi aprovada pela organização. Entre em contato caso queira mais informações.
          </p>
          <button className="btn btn-outline" onClick={onLogout}>← Sair</button>
        </div>
      </div>
    );
  }

  // Dados comuns
  const uid = getUserId(user);
  const meusPts = calcPontos(uid, pontuacoes);
  const nivel = getNivel(meusPts);

  // Dados participante (calculados mesmo p/ palestrante se ele for inscrito)
  const minasPresencas = presencas.filter(p => p.participante_id === user.id);
  const minhasPresencasTurno = presencasTurno.filter(p => p.participante_id === user.id);
  const presencaCalc = calcPresenca(user.id, atividades, presencas, event, turnos, presencasTurno);
  // Só quem teve presença mínima de 50% pode responder a pesquisa de satisfação
  const podeResponderPesquisa = presencaCalc.pct >= 50;

  // Dados palestrante
  const minhasPalestras = isPalestrante ? atividades.filter(a => (a.palestrantes_ids || []).includes(user.id)) : [];
  const totalCH_pal = minhasPalestras.reduce((s, a) => s + a.carga_horaria, 0);
  const totalPresentes_pal = minhasPalestras.reduce((s, a) => s + presencas.filter(p => p.atividade_id === a.id).length, 0);

  // Menu dinâmico — abas comuns + extras p/ palestrante
  const MENU_COMUM = [
    ["",              faHouse,         "Início"],
    ["programacao",   faCalendarDays,  "Programação"],
    ["presencas",     faCircleCheck,   "Presenças"],
    ...(event.certificado_disponivel ? [["certificado", faTrophy, "Certificado"]] : []),
    ...(event.forum_ativo !== false ? [["forum", faComments, "Fórum"]] : []),
    ...(event.gamificacao_ativa !== false ? [["ranking", faMedal, "Ranking"]] : []),
    ...(event.rede_visivel !== false ? [["rede", faHandshake, "Rede"]] : []),
    ...(event.pesquisa_ativa && podeResponderPesquisa ? [["pesquisa", faClipboardList, "Pesquisa de Satisfação"]] : []),
  ];
  const MENU_PALESTRANTE_EXTRA = [
    ["palestras", faMicrophone, "Minhas Palestras"],
  ];
  const ABAS = isPalestrante
    ? [MENU_COMUM[0], ...MENU_PALESTRANTE_EXTRA, ...MENU_COMUM.slice(1)]
    : MENU_COMUM;
  // Bottom nav (mobile): Início + Programação sempre, Minhas Palestras só para
  // quem é palestrante — Presenças e o resto ficam dentro de "Minha Área"
  const ABAS_BOTTOM = isPalestrante
    ? [MENU_COMUM[0], MENU_COMUM.find(([k]) => k === "programacao"), MENU_PALESTRANTE_EXTRA[0]].filter(Boolean)
    : [MENU_COMUM[0], MENU_COMUM.find(([k]) => k === "programacao")].filter(Boolean);

  const contextValue = {
    ...props,
    turnos, presencasTurno, perguntasPesquisa,
    porTurno, isPalestrante, perfilIncompleto,
    uid, meusPts, nivel,
    minasPresencas, minhasPresencasTurno, presencaCalc, podeResponderPesquisa,
    minhasPalestras, totalCH_pal, totalPresentes_pal,
    qrTokens, respondeuPesquisa, setRespondeuPesquisa,
  };

  const headerBgH = isPalestrante ? "linear-gradient(90deg,var(--hero-dark),var(--hero))" : "var(--navy-dark)";
  const headerBgV = isPalestrante ? "linear-gradient(180deg,var(--hero-dark),var(--hero))" : "var(--navy-dark)";
  // user.instituicao guarda a sigla — exibe o nome completo do órgão quando encontrado na lista
  const instituicaoNome = (instituicoes || []).find(i => i.sigla === user.instituicao || i.nome === user.instituicao)?.nome || user.instituicao;

  return (
    <UsuarioContext.Provider value={contextValue}>
      <div className="part-layout">
        {/* ── HEADER (mobile) — nome do evento + alto contraste ── */}
        <div className="mobile-header" style={{ background: headerBgH }}>
          <span className="mobile-header-title">{event.nome}</span>
          <button onClick={() => setAltoContraste(toggleHighContrast())} title="Alternar alto contraste (acessibilidade)" aria-pressed={altoContraste}
            style={{ background:"rgba(255,255,255,0.12)", border:"none", borderRadius:"var(--radius-sm)", color:"#fff", fontSize:"0.85rem", padding:"0.4rem 0.55rem", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center" }}>
            <FontAwesomeIcon icon={faCircleHalfStroke} />
          </button>
        </div>

        {/* ── SIDEBAR (desktop) ── */}
        <div className="part-sidebar" style={{ background: headerBgV }}>
          <div className="part-sidebar-header">
            <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.75rem" }}>
              <AvatarUpload
                userId={user.id}
                fotoUrl={user.foto_url}
                iniciais={user.nome ? user.nome.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase() : (user.foto_iniciais || "?")}
                size={36}
                readonly
              />
              <div style={{ overflow:"hidden" }}>
                <div style={{ fontSize:"0.78rem", color:"var(--white-hi)", fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.nome.split(" ")[0]}</div>
                <div style={{ fontSize:"0.68rem", color:"var(--white-low)" }}>{isPalestrante ? "Palestrante" : "Participante"}</div>
              </div>
            </div>
            {onSwitchRole && (
              <button className="btn btn-sm btn-outline" style={{ color:"rgba(255,255,255,0.6)", borderColor:"rgba(255,255,255,0.2)", width:"100%", marginBottom:"0.75rem" }} onClick={onSwitchRole}>
                ⇄ Trocar perfil
              </button>
            )}
            {event.gamificacao_ativa !== false && (
              <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:"var(--radius-sm)", padding:"0.5rem 0.75rem", display:"flex", alignItems:"center", gap:"0.5rem" }}>
                <span style={{ fontSize:"1rem" }}>{nivel.icon}</span>
                <div style={{ fontSize:"0.78rem", fontWeight:700, color:"var(--gold-light)" }}>{meusPts} pts</div>
              </div>
            )}
          </div>

          <nav className="part-nav">
            {ABAS.map(([k,icon,l]) => (
              <NavLink key={k || "inicio"} to={k ? `/painel/${k}` : "/painel"} end={!k}
                className={({ isActive }) => `part-nav-item${isActive ? " active" : ""}`}>
                <FontAwesomeIcon icon={icon} className="admin-nav-icon" fixedWidth />{l}
              </NavLink>
            ))}
          </nav>

          <div style={{ padding:"1rem", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
            <NavLink to="/painel/dados" className="btn btn-sm btn-outline"
              style={{ color:"rgba(255,255,255,0.6)", borderColor:"rgba(255,255,255,0.2)", width:"100%", marginBottom:"0.4rem", textDecoration:"none" }}>
              <FontAwesomeIcon icon={faCircleUser} style={{ marginRight:6 }} />Meus Dados
            </NavLink>
            <div style={{ display:"flex", gap:"0.4rem" }}>
              <button className="btn btn-sm btn-outline" title="Alto contraste" aria-label="Alto contraste"
                style={{ color:"rgba(255,255,255,0.6)", borderColor:"rgba(255,255,255,0.2)", flexShrink:0, padding:"0.4rem 0.6rem" }}
                onClick={() => setAltoContraste(toggleHighContrast())} aria-pressed={altoContraste}>
                <FontAwesomeIcon icon={faCircleHalfStroke} />
              </button>
              <button className="btn btn-sm btn-outline" style={{ color:"rgba(255,255,255,0.6)", borderColor:"rgba(255,255,255,0.2)", flex:1 }} onClick={onLogout}>← Sair</button>
            </div>
          </div>
        </div>

        {/* ── CONTEÚDO ── */}
        <div className="part-content">
          <AreaUsuarioRoutes />
        </div>

        {/* ── BOTTOM NAV (mobile) — ícone + label, estilo apps de delivery ── */}
        <nav className="bottom-nav" style={{ background: headerBgH }}>
          {ABAS_BOTTOM.map(([k,icon,l]) => (
            <NavLink key={k || "inicio"} to={k ? `/painel/${k}` : "/painel"} end={!k}
              className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`}
              onClick={() => setMinhaAreaAberta(false)}>
              <FontAwesomeIcon icon={icon} />
              <span>{l}</span>
            </NavLink>
          ))}
          <button type="button" className={`bottom-nav-item${minhaAreaAberta ? " active" : ""}`} onClick={() => setMinhaAreaAberta(v => !v)}>
            <FontAwesomeIcon icon={faCircleUser} />
            <span>Minha Área</span>
          </button>
        </nav>

        {/* ── MINHA ÁREA (mobile) — tela cheia com perfil no topo ── */}
        {minhaAreaAberta && (
          <div className="minha-area-fullscreen">
            <div className="minha-area-fs-header" style={{ background: headerBgV }}>
              <button type="button" className="minha-area-fs-close" onClick={() => setMinhaAreaAberta(false)} aria-label="Fechar">
                <FontAwesomeIcon icon={faXmark} />
              </button>
              <AvatarUpload
                userId={user.id}
                fotoUrl={user.foto_url}
                iniciais={user.nome ? user.nome.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase() : (user.foto_iniciais || "?")}
                size={76}
                onUploaded={url => setUser(prev => ({ ...prev, foto_url: url }))}
              />
              <div className="minha-area-fs-nome">{user.nome}</div>
              {(user.cargo || user.titulo || user.instituicao) && (
                <div className="minha-area-fs-cargo">{[user.cargo || user.titulo, instituicaoNome].filter(Boolean).join(" · ")}</div>
              )}
            </div>

            <div className="minha-area-fs-list">
              <NavLink to="/painel/dados" className="minha-area-item" onClick={() => setMinhaAreaAberta(false)}>
                <FontAwesomeIcon icon={faCircleUser} fixedWidth />Meus Dados
              </NavLink>
              <NavLink to="/painel/presencas" className="minha-area-item" onClick={() => setMinhaAreaAberta(false)}>
                <FontAwesomeIcon icon={faCircleCheck} fixedWidth />Minhas Presenças
              </NavLink>
              {onSwitchRole && (
                <button type="button" className="minha-area-item" onClick={() => { setMinhaAreaAberta(false); onSwitchRole(); }}>
                  ⇄ Trocar perfil
                </button>
              )}
              <div className="minha-area-divider" />
              <button type="button" className="minha-area-item danger" onClick={onLogout}>← Sair</button>
            </div>
          </div>
        )}
      </div>
    </UsuarioContext.Provider>
  );
}
