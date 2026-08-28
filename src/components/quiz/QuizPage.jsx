import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../../lib/supabase";
import {
  fetchQuizPorCodigo, fetchPerguntaAbertaDoQuiz,
  fetchMinhaLiveRespostaAnonima, responderLivePerguntaAnonimo,
} from "../../lib/db";

const ANON_ID_KEY = "enaudin_quiz_anon_id";

function getAnonId() {
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

// Página pública (sem login) pra responder Perguntas ao Vivo — é pra onde o
// QR code/código do telão apontam. O código identifica o QUIZ (um conjunto
// de perguntas); dentro dele, só uma pergunta fica "aberta" por vez, e é
// essa que aparece. Não existe nada visível sem o código (o QR já leva com
// ele em ?c=, quem digita o link à mão precisa ter visto o código no telão).
// Voto é amarrado a um id anônimo salvo no navegador, só pra evitar
// duplicidade óbvia no mesmo aparelho.
export function QuizPage({ event, eventLoaded }) {
  const [searchParams] = useSearchParams();
  const [anonId] = useState(getAnonId);
  const [quiz, setQuiz] = useState(null);
  const [pergunta, setPergunta] = useState(null);
  const [encerrada, setEncerrada] = useState(false);
  const [minhaResposta, setMinhaResposta] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [erroCodigo, setErroCodigo] = useState("");

  async function resolverCodigo(cod) {
    setErroCodigo("");
    setEnviandoCodigo(true);
    const { data: quizData, error } = await fetchQuizPorCodigo(event.id, cod);
    if (error || !quizData) {
      setEnviandoCodigo(false);
      setErroCodigo("Código inválido.");
      return;
    }
    const { data: perguntaAberta } = await fetchPerguntaAbertaDoQuiz(quizData.id);
    setEnviandoCodigo(false);
    setQuiz(quizData);
    setPergunta(perguntaAberta ?? null);
    setEncerrada(false);
    setMinhaResposta(undefined);
    setCodigo("");
  }

  // QR code já chega com ?c=XXXX — resolve sozinho, sem precisar digitar
  useEffect(() => {
    if (!event?.id) return;
    const cParam = (searchParams.get("c") || "").trim();
    if (cParam.length === 4) resolverCodigo(cParam);
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Código certo mas nenhuma pergunta aberta ainda — espera o admin dar play
  useEffect(() => {
    if (!quiz || pergunta) return;
    const channel = supabase
      .channel(`quiz-aguardando-${quiz.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_perguntas", filter: `quiz_id=eq.${quiz.id}` }, () => {
        fetchPerguntaAbertaDoQuiz(quiz.id).then(({ data }) => {
          if (data) { setPergunta(data); setEncerrada(false); setMinhaResposta(undefined); }
        });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [quiz?.id, pergunta]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pergunta) return;
    if (minhaResposta !== undefined) return;
    fetchMinhaLiveRespostaAnonima(pergunta.id, anonId).then(({ data }) => {
      setMinhaResposta(data?.opcao ?? null);
    });
  }, [pergunta?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Se o admin encerrar essa pergunta enquanto a pessoa está olhando, avisa
  useEffect(() => {
    if (!pergunta) return;
    const channel = supabase
      .channel(`quiz-pergunta-${pergunta.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_perguntas", filter: `id=eq.${pergunta.id}` }, payload => {
        if (payload.new.status !== "aberta") { setEncerrada(true); setPergunta(null); }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [pergunta?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function responder(opcao) {
    if (enviando) return;
    setEnviando(true);
    const { error } = await responderLivePerguntaAnonimo({ pergunta_id: pergunta.id, anon_id: anonId, opcao });
    if (error?.code === "23505") {
      const { data } = await fetchMinhaLiveRespostaAnonima(pergunta.id, anonId);
      setMinhaResposta(data?.opcao ?? opcao);
      setEnviando(false);
      return;
    }
    setEnviando(false);
    if (error) return;
    setMinhaResposta(opcao);
  }

  function entrarComCodigo() {
    const cod = codigo.trim();
    if (cod.length !== 4) { setErroCodigo("Digite os 4 dígitos do código"); return; }
    resolverCodigo(cod);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1.5rem" }}>
      {eventLoaded && event?.logo_url && (
        <img src={event.logo_url} alt={event.nome} style={{ maxHeight: 72, maxWidth: 220, objectFit: "contain", marginBottom: "2.5rem" }} />
      )}

      {!eventLoaded ? null : !quiz ? (
        <div style={{ maxWidth: 340, width: "100%" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚡</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: "var(--navy)", fontSize: "1.25rem", marginBottom: "0.5rem" }}>Perguntas ao Vivo</h2>
          <p style={{ color: "var(--text2)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>Digite o código de 4 dígitos mostrado no telão pra responder.</p>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
            <input className="form-input" inputMode="numeric" maxLength={4} placeholder="0000" autoFocus
              style={{ maxWidth: 110, textAlign: "center", fontFamily: "monospace", fontSize: "1.2rem", letterSpacing: "0.2em" }}
              value={codigo} onChange={e => { setCodigo(e.target.value.replace(/\D/g, "").slice(0, 4)); setErroCodigo(""); }}
              onKeyDown={e => e.key === "Enter" && !enviandoCodigo && entrarComCodigo()} />
            <button className="btn btn-primary" onClick={entrarComCodigo} disabled={enviandoCodigo || codigo.length !== 4}>
              {enviandoCodigo ? "…" : "Entrar"}
            </button>
          </div>
          {erroCodigo && <div style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "0.6rem" }}>{erroCodigo}</div>}
        </div>
      ) : encerrada ? (
        <div style={{ maxWidth: 340, width: "100%" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⏹</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: "var(--navy)", fontSize: "1.2rem", marginBottom: "0.5rem" }}>Essa pergunta foi encerrada</h2>
          <p style={{ color: "var(--text2)", fontSize: "0.9rem" }}>Confira os resultados no telão. Aguarde a próxima pergunta.</p>
        </div>
      ) : !pergunta ? (
        <div style={{ maxWidth: 340, width: "100%" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⏳</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: "var(--navy)", fontSize: "1.2rem", marginBottom: "0.5rem" }}>{quiz.titulo}</h2>
          <p style={{ color: "var(--text2)", fontSize: "0.9rem" }}>Nenhuma pergunta aberta agora. Assim que a organização iniciar, ela aparece aqui automaticamente.</p>
        </div>
      ) : minhaResposta ? (
        <div style={{ maxWidth: 380, width: "100%" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", color: "var(--success)", fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.6rem" }}>Resposta enviada!</h2>
          <p style={{ color: "var(--text2)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
            Você respondeu: <strong>{minhaResposta}</strong>
          </p>
          <p style={{ color: "var(--text3)", fontSize: "0.85rem" }}>Aguarde os resultados no telão 📊</p>
        </div>
      ) : (
        <div style={{ maxWidth: 420, width: "100%" }}>
          <div style={{ display: "inline-block", background: "var(--gold-pale, var(--gold-tint))", color: "var(--warn, var(--navy))", borderRadius: 50, padding: "0.25rem 0.9rem", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
            <FontAwesomeIcon icon={faBolt} style={{ marginRight: 5 }} />Ao vivo agora
          </div>
          <h2 style={{ fontSize: "1.35rem", color: "var(--navy)", fontWeight: 700, marginBottom: "1.75rem", lineHeight: 1.4 }}>{pergunta.texto}</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(pergunta.opcoes || []).map(opcao => (
              <button key={opcao} className="btn btn-outline" style={{ textAlign: "center", padding: "1rem", fontSize: "1.02rem", fontWeight: 600 }}
                disabled={enviando} onClick={() => responder(opcao)}>
                {opcao}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
