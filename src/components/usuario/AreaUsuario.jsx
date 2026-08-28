import { useState, useEffect } from "react";
import { useRoutes, Navigate, NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse, faCalendarDays, faCircleCheck, faTrophy, faComments, faMedal,
  faHandshake, faClipboardList, faCircleUser, faMicrophone, faIdBadge,
} from "@fortawesome/free-solid-svg-icons";
import { calcPresenca, calcPontos, getNivel, getUserId, nomeExibicao } from "../../utils/helpers";
import { toggleHighContrast, isHighContrast } from "../../lib/a11y";
import { AvatarUpload, Sidebar, Topbar, AlterarSenha } from "../base/index";
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
import { Credenciamento } from "../admin/sections/Credenciamento";

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
function CredenciamentoTab() {
  const { participantes, setParticipantes, showToast } = useUsuario();
  return <Credenciamento participantes={participantes} setParticipantes={setParticipantes} showToast={showToast} />;
}
function AlterarSenhaTab() {
  const { showToast } = useUsuario();
  return <AlterarSenha showToast={showToast} voltarPath="/painel/dados" />;
}
// "Minha Área" (mobile) — página com o restante da navegação que não cabe
// na barra inferior, mais acesso a dados/perfil. Substitui o antigo popup.
function MenuMobileTab() {
  const { user, setUser, itensMenuMobile, instituicaoNome, onSwitchRole, onLogout } = useUsuario();
  const nomeDestaque = nomeExibicao(user);
  const nomeCompletoDiferente = user.nome && user.nome.trim() !== nomeDestaque.trim();
  return (
    <div className="menu-mobile">
      <div className="menu-mobile-header">
        <AvatarUpload
          userId={user.id}
          fotoUrl={user.foto_url}
          iniciais={user.nome ? user.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() : (user.foto_iniciais || "?")}
          size={76}
          onUploaded={url => setUser(prev => ({ ...prev, foto_url: url }))}
        />
        <div className="menu-mobile-nome">{nomeDestaque}</div>
        {nomeCompletoDiferente && <div className="menu-mobile-nome-completo">{user.nome}</div>}
        {(user.cargo || user.titulo) && <div className="menu-mobile-cargo">{user.cargo || user.titulo}</div>}
        {instituicaoNome && <div className="menu-mobile-orgao">{instituicaoNome}</div>}
      </div>

      <div className="minha-area-fs-list">
        <NavLink to="/painel/dados" className="minha-area-item">
          <FontAwesomeIcon icon={faCircleUser} fixedWidth />Meus Dados
        </NavLink>
        {itensMenuMobile.map(([k, icon, l]) => (
          <NavLink key={k} to={`/painel/${k}`} className="minha-area-item">
            <FontAwesomeIcon icon={icon} fixedWidth />{l}
          </NavLink>
        ))}
        {onSwitchRole && (
          <button type="button" className="minha-area-item" onClick={onSwitchRole}>⇄ Trocar perfil</button>
        )}
      </div>

      <div className="minha-area-fs-list">
        <button type="button" className="minha-area-item danger" onClick={onLogout}>← Sair</button>
      </div>
    </div>
  );
}

function AreaUsuarioRoutes() {
  const { event, isPalestrante, isCredenciador, perfilIncompleto, podeResponderPesquisa } = useUsuario();
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
    { path: "senha",         element: <AlterarSenhaTab /> },
    { path: "palestras",   element: isPalestrante ? <MinhasPalestras /> : <Navigate to="/painel" replace /> },
    { path: "presentes",   element: isPalestrante ? <PresentesPal /> : <Navigate to="/painel" replace /> },
    { path: "credenciamento", element: isCredenciador ? <CredenciamentoTab /> : <Navigate to="/painel" replace /> },
    { path: "menu",         element: <MenuMobileTab /> },
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
  const isCredenciador = user.is_credenciador;
  const perfilIncompleto = !user.cpf || !user.email || !user.nome_publico || !user.instituicao || !user.cargo || (isPalestrante && !user.mini_bio);
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
  const MENU_CREDENCIADOR_EXTRA = isCredenciador
    ? [["credenciamento", faIdBadge, "Credenciar"]]
    : [];
  const MENU_PALESTRANTE_EXTRA = isPalestrante
    ? [["palestras", faMicrophone, "Minhas Palestras"]]
    : [];
  const ABAS = [MENU_COMUM[0], ...MENU_CREDENCIADOR_EXTRA, ...MENU_PALESTRANTE_EXTRA, ...MENU_COMUM.slice(1)];
  // Bottom nav (mobile): Início + Programação + Fórum sempre, Credenciamento
  // só para quem credencia — o resto (inclusive Minhas Palestras) fica em "Minha Área"
  const ABAS_BOTTOM = [MENU_COMUM[0], MENU_COMUM.find(([k]) => k === "programacao"), ...MENU_CREDENCIADOR_EXTRA, MENU_COMUM.find(([k]) => k === "forum")].filter(Boolean);
  const chavesBottom = new Set(ABAS_BOTTOM.map(([k]) => k));
  const itensMenuMobile = ABAS.filter(([k]) => k !== "" && !chavesBottom.has(k));

  const contextValue = {
    ...props,
    turnos, presencasTurno, perguntasPesquisa,
    porTurno, isPalestrante, isCredenciador, perfilIncompleto,
    uid, meusPts, nivel, itensMenuMobile,
    minasPresencas, minhasPresencasTurno, presencaCalc, podeResponderPesquisa,
    minhasPalestras, totalCH_pal, totalPresentes_pal,
    qrTokens, respondeuPesquisa, setRespondeuPesquisa,
  };

  const headerBgH = isPalestrante ? "linear-gradient(90deg,var(--hero-dark),var(--hero))" : "var(--navy-dark)";
  const headerBgV = isPalestrante ? "linear-gradient(180deg,var(--hero-dark),var(--hero))" : "var(--navy-dark)";
  // user.instituicao guarda a sigla — exibe o nome completo do órgão quando encontrado na lista
  const instituicaoNome = (instituicoes || []).find(i => i.sigla === user.instituicao || i.nome === user.instituicao)?.nome || user.instituicao;
  contextValue.instituicaoNome = instituicaoNome;

  return (
    <UsuarioContext.Provider value={contextValue}>
      <div className="part-layout">
        {/* ── TOPBAR (mobile + desktop) ── */}
        <Topbar
          background={headerBgH}
          title={event.nome}
          user={user}
          roleLabel={isPalestrante ? "Palestrante" : "Participante"}
          meusDadosPath="/painel/dados"
          onSwitchRole={onSwitchRole}
          altoContraste={altoContraste}
          onToggleAltoContraste={() => setAltoContraste(toggleHighContrast())}
          onLogout={onLogout}
        />

        <div className="part-body">
          {/* ── SIDEBAR (desktop) ── */}
          <Sidebar
            wrapClassName="part-sidebar"
            background={headerBgV}
            extraTop={event.gamificacao_ativa !== false && (
              <div style={{ padding:"0.85rem 1rem", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ background:"rgba(255,255,255,0.06)", borderRadius:"var(--radius-sm)", padding:"0.5rem 0.75rem", display:"flex", alignItems:"center", gap:"0.5rem" }}>
                  <span style={{ fontSize:"1rem" }}>{nivel.icon}</span>
                  <div style={{ fontSize:"0.78rem", fontWeight:700, color:"var(--gold-light)" }}>{meusPts} pts</div>
                </div>
              </div>
            )}
            navWrapClassName="part-nav"
            navItems={ABAS.map(([k, icon, l]) => ({
              key: k || "inicio",
              to: k ? `/painel/${k}` : "/painel",
              end: !k,
              icon, label: l,
              itemClassName: "part-nav-item",
            }))}
          />

          {/* ── CONTEÚDO ── */}
          <div className="part-content">
            <AreaUsuarioRoutes />
          </div>
        </div>

        {/* ── BOTTOM NAV (mobile) — ícone + label, estilo apps de delivery ── */}
        <nav className="bottom-nav" style={{ background: headerBgH }}>
          {ABAS_BOTTOM.map(([k,icon,l]) => (
            <NavLink key={k || "inicio"} to={k ? `/painel/${k}` : "/painel"} end={!k}
              className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`}>
              <FontAwesomeIcon icon={icon} />
              <span>{l}</span>
            </NavLink>
          ))}
          <NavLink to="/painel/menu" className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`}>
            <FontAwesomeIcon icon={faCircleUser} />
            <span>Minha Área</span>
          </NavLink>
        </nav>
      </div>
    </UsuarioContext.Provider>
  );
}
