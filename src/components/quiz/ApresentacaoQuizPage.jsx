import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faChartSimple, faArrowLeft, faHourglassHalf } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../../lib/supabase";
import { fetchQuizPorCodigo, fetchPerguntaAbertaDoQuiz, fetchEvent, fetchLiveRespostas } from "../../lib/db";
import { QRCodeCanvas } from "../base/index";
import { BAR_COLORS } from "../../utils/quizColors";

// Página standalone do telão — link estável por CÓDIGO do quiz (o mesmo
// código de 4 dígitos do QR), aberto em nova janela/aba pelo botão "Abrir
// Telão" no admin do quiz (QuizDetail), pra poder ser arrastada pra um
// segundo monitor/projetor em modo tela estendida, sem espelhar a tela do
// admin. Acompanha via Realtime qual pergunta está "aberta" no momento —
// o admin troca de pergunta no painel e o telão atualiza sozinho, sem
// precisar reabrir a janela a cada pergunta nova.
export function ApresentacaoQuizPage() {
  const { codigo } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [event, setEvent] = useState(null);
  const [pergunta, setPergunta] = useState(null);
  const [fase, setFase] = useState("lobby");
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [contagens, setContagens] = useState({});
  const [pulso, setPulso] = useState({});
  const [pops, setPops] = useState([]);

  // Resolve o quiz pelo código e o evento (pro logo) uma única vez.
  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data: ev, error: evErro } = await fetchEvent();
      if (!ativo) return;
      if (!ev) { console.error("Telão do quiz: falha ao buscar evento", evErro); setNaoEncontrado(true); return; }
      const { data: q, error: qErro } = await fetchQuizPorCodigo(ev.id, codigo);
      if (!ativo) return;
      if (!q) { console.error("Telão do quiz: código não encontrado", { codigo, eventId: ev.id, erro: qErro }); setNaoEncontrado(true); return; }
      setEvent(ev);
      setQuiz(q);
    })();
    return () => { ativo = false; };
  }, [codigo]);

  // Acompanha sozinho qual pergunta está "aberta" nesse quiz — o admin
  // troca de pergunta no painel e esse telão atualiza sem precisar reabrir
  // a janela a cada pergunta nova.
  useEffect(() => {
    if (!quiz) return;
    let ativo = true;

    function buscarAberta() {
      fetchPerguntaAbertaDoQuiz(quiz.id).then(({ data }) => {
        if (!ativo) return;
        setPergunta(prev => {
          if (data && (!prev || prev.id !== data.id)) setFase("lobby");
          return data ?? null;
        });
      });
    }
    buscarAberta();

    const channel = supabase
      .channel(`quiz-telao-${quiz.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_perguntas", filter: `quiz_id=eq.${quiz.id}` }, buscarAberta)
      .subscribe();

    return () => { ativo = false; supabase.removeChannel(channel); };
  }, [quiz?.id]);

  useEffect(() => {
    if (!pergunta) return;
    let ativo = true;
    fetchLiveRespostas(pergunta.id).then(({ data }) => {
      if (!ativo) return;
      const c = {};
      (data || []).forEach(r => { c[r.opcao] = (c[r.opcao] || 0) + 1; });
      setContagens(c);
    });

    const channel = supabase
      .channel(`live-respostas-${pergunta.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_respostas", filter: `pergunta_id=eq.${pergunta.id}` }, payload => {
        const opcao = payload.new.opcao;
        setContagens(prev => ({ ...prev, [opcao]: (prev[opcao] || 0) + 1 }));
        setPulso(prev => ({ ...prev, [opcao]: (prev[opcao] || 0) + 1 }));
        const popId = `${opcao}-${payload.new.id}`;
        setPops(prev => [...prev, { id: popId, opcao }]);
        setTimeout(() => setPops(prev => prev.filter(p => p.id !== popId)), 1000);
        setTimeout(() => setPulso(prev => ({ ...prev, [opcao]: 0 })), 700);
      })
      .subscribe();

    function onKeyDown(e) { if (e.key === "Escape") window.close(); }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      ativo = false;
      supabase.removeChannel(channel);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pergunta?.id]);

  const total = Object.values(contagens).reduce((s, n) => s + n, 0);
  const urlResposta = quiz ? `${window.location.origin}/quiz?c=${quiz.codigo}` : "";

  if (naoEncontrado) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}>
        Código de quiz não encontrado.
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}>
        Carregando…
      </div>
    );
  }

  if (!pergunta) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "linear-gradient(160deg,#fafafb,#eceef1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "1.25rem" }}>
        {event?.logo_url && (
          <img src={event.logo_url} alt={event.nome} style={{ maxHeight: 64, maxWidth: 220, objectFit: "contain", marginBottom: "1rem" }} />
        )}
        <FontAwesomeIcon icon={faHourglassHalf} style={{ fontSize: "2.5rem", color: "var(--text3)" }} />
        <h2 style={{ fontFamily: "'Poppins',sans-serif", color: "var(--navy)", fontSize: "1.5rem", margin: 0 }}>{quiz.titulo}</h2>
        <p style={{ color: "var(--text3)", fontSize: "1rem", margin: 0 }}>Aguardando a próxima pergunta…</p>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "linear-gradient(160deg,#fafafb,#eceef1)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <button onClick={() => window.close()} title="Fechar (Esc)"
        style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "#fff", border: "1px solid var(--border)", color: "var(--text2)", width: 42, height: 42, borderRadius: "50%", cursor: "pointer", fontSize: "1.1rem", zIndex: 2, boxShadow: "var(--shadow)" }}>
        <FontAwesomeIcon icon={faXmark} />
      </button>

      {event?.logo_url && (
        <div style={{ textAlign: "center", padding: "2rem 2rem 0" }}>
          <img src={event.logo_url} alt={event.nome} style={{ maxHeight: 64, maxWidth: 220, objectFit: "contain" }} />
        </div>
      )}

      {fase === "lobby" ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <button className="btn btn-sm btn-outline" style={{ alignSelf: "flex-end", margin: "0 3rem 0 0" }}
            onClick={() => setFase("resultados")}>
            <FontAwesomeIcon icon={faChartSimple} style={{ marginRight: 6 }} />Ver respostas
          </button>

          <h1 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, color: "var(--navy)", fontSize: "clamp(1.5rem,2.6vw,2.1rem)", margin: "0.5rem auto 0", maxWidth: 1700, width: "100%", padding: "0 3rem", boxSizing: "border-box", textAlign: "center", lineHeight: 1.3 }}>{pergunta.texto}</h1>

          <div style={{ flex: 1, display: "flex", alignItems: "flex-start", padding: "84px 3rem 2rem", gap: "3rem", flexWrap: "wrap", maxWidth: 1700, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
            {/* ── Coluna esquerda (2/5) — QR code ── */}
            <div style={{ flex: "2 1 300px", maxWidth: 380, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", justifyContent: "center", gap: "1.5rem" }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: "1rem", display: "inline-block", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
                <QRCodeCanvas value={urlResposta} size={260} />
              </div>
              {quiz?.codigo && (
                <div>
                  <div style={{ color: "var(--text3)", fontSize: "0.78rem" }}>ou acesse</div>
                  <div style={{ color: "var(--text2)", fontSize: "1rem", fontWeight: 600 }}>{window.location.host}/quiz</div>
                  <div style={{ color: "var(--text3)", fontSize: "0.78rem", marginTop: "0.4rem", marginBottom: "0.4rem" }}>e digite o código</div>
                  <div style={{ display: "inline-block", background: "#fff", color: "var(--navy)", fontSize: "1.8rem", fontWeight: 800, letterSpacing: "0.3em", fontFamily: "monospace", lineHeight: 1, padding: "0.5rem 1.1rem", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)" }}>{quiz.codigo}</div>
                </div>
              )}
            </div>

            {/* ── Coluna direita (3/5) — opções ── */}
            <div style={{ flex: "3 1 480px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.7rem" }}>
              {(pergunta.opcoes || []).map((opcao, i) => (
                <div key={opcao} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "0.65rem 1.25rem", boxShadow: "var(--shadow)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: BAR_COLORS[i % BAR_COLORS.length], flexShrink: 0 }} />
                  <span style={{ color: "var(--text)", fontSize: "1.25rem", fontWeight: 500 }}>{opcao}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <button className="btn btn-sm btn-outline" style={{ alignSelf: "flex-end", margin: "0 3rem 0 0" }}
            onClick={() => setFase("lobby")}>
            <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 6 }} />Voltar pro QR code
          </button>

          <h1 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, color: "var(--navy)", fontSize: "clamp(1.5rem,2.6vw,2.1rem)", margin: "0.5rem auto 0", maxWidth: 1700, width: "100%", padding: "0 3rem", boxSizing: "border-box", textAlign: "center", lineHeight: 1.3 }}>{pergunta.texto}</h1>

          <div style={{ flex: 1, display: "flex", alignItems: "flex-start", padding: "84px 3rem 2rem", gap: "3rem", flexWrap: "wrap", maxWidth: 1700, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
            {/* ── Coluna esquerda (2/5) — QR code ── */}
            <div style={{ flex: "2 1 300px", maxWidth: 380, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", justifyContent: "center", gap: "1.5rem" }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: "1rem", display: "inline-block", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
                <QRCodeCanvas value={urlResposta} size={260} />
              </div>
              {quiz?.codigo && (
                <div>
                  <div style={{ color: "var(--text3)", fontSize: "0.78rem" }}>ou acesse</div>
                  <div style={{ color: "var(--text2)", fontSize: "1rem", fontWeight: 600 }}>{window.location.host}/quiz</div>
                  <div style={{ color: "var(--text3)", fontSize: "0.78rem", marginTop: "0.4rem", marginBottom: "0.4rem" }}>e digite o código</div>
                  <div style={{ display: "inline-block", background: "#fff", color: "var(--navy)", fontSize: "1.8rem", fontWeight: 800, letterSpacing: "0.3em", fontFamily: "monospace", lineHeight: 1, padding: "0.5rem 1.1rem", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)" }}>{quiz.codigo}</div>
                </div>
              )}
              <div style={{ color: "var(--text2)", fontSize: "0.9rem", lineHeight: 1.4 }}>
                Ainda não respondeu? Escaneie o QR code
              </div>
              <div style={{ color: "var(--text2)", fontSize: "1rem" }}>
                {total} {total === 1 ? "resposta recebida" : "respostas recebidas"} até agora
              </div>
            </div>

          {/* ── Coluna direita (3/5) — resultados ao vivo, ordenados por votos ── */}
          <div style={{ flex: "3 1 480px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "1.4rem", maxHeight: "100%", overflowY: "auto", paddingRight: "0.5rem" }}>
            {(pergunta.opcoes || [])
              .map((opcao, i) => ({ opcao, i, n: contagens[opcao] || 0 }))
              .sort((a, b) => b.n - a.n)
              .map(({ opcao, i, n }) => {
              const pct = total > 0 ? Math.round((n / total) * 100) : 0;
              return (
                <div key={opcao} style={{ position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text)", fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                    <span>{opcao}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{n} {n === 1 ? "voto" : "votos"} · {pct}%</span>
                  </div>
                  <div className={pulso[opcao] ? "live-bar-pulse" : ""} style={{ position: "relative", background: "var(--border)", borderRadius: 50, height: 34, overflow: "visible" }}>
                    <div style={{
                      width: `${pct}%`, height: "100%", borderRadius: 50, overflow: "hidden",
                      background: BAR_COLORS[i % BAR_COLORS.length],
                      transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
                    }} />
                    {pops.filter(p => p.opcao === opcao).map(p => (
                      <span key={p.id} className="live-vote-pop" style={{ left: `min(${pct}%, 92%)` }}>+1</span>
                    ))}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
