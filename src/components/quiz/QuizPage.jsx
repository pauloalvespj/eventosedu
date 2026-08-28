import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../../lib/supabase";
import {
  fetchLivePerguntas, fetchLivePerguntaPorCodigo,
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
// QR code/código do telão apontam. Voto é amarrado a um id anônimo salvo no
// navegador, só pra evitar duplicidade óbvia no mesmo aparelho.
export function QuizPage({ event, eventLoaded }) {
  const [anonId] = useState(getAnonId);
  const [perguntas, setPerguntas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [minhaResposta, setMinhaResposta] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [perguntaViaCodigo, setPerguntaViaCodigo] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [erroCodigo, setErroCodigo] = useState("");

  async function carregar() {
    const { data } = await fetchLivePerguntas(event.id);
    setPerguntas(data);
    setCarregando(false);
    setPerguntaViaCodigo(prev => {
      if (!prev) return prev;
      const atual = data.find(p => p.id === prev.id);
      return atual && atual.status === "aberta" ? atual : null;
    });
  }

  useEffect(() => {
    if (!event?.id) return;
    carregar();

    const channel = supabase
      .channel(`quiz-live-perguntas-${event.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_perguntas", filter: `event_id=eq.${event.id}` }, () => carregar())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const perguntaAberta = perguntaViaCodigo || perguntas.find(p => p.status === "aberta");

  useEffect(() => {
    if (!perguntaAberta || minhaResposta?.[perguntaAberta.id] !== undefined) return;
    fetchMinhaLiveRespostaAnonima(perguntaAberta.id, anonId).then(({ data }) => {
      setMinhaResposta(prev => ({ ...prev, [perguntaAberta.id]: data?.opcao ?? null }));
    });
  }, [perguntaAberta?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function responder(opcao) {
    if (enviando) return;
    setEnviando(true);
    const { error } = await responderLivePerguntaAnonimo({ pergunta_id: perguntaAberta.id, anon_id: anonId, opcao });
    if (error?.code === "23505") {
      const { data } = await fetchMinhaLiveRespostaAnonima(perguntaAberta.id, anonId);
      setMinhaResposta(prev => ({ ...prev, [perguntaAberta.id]: data?.opcao ?? opcao }));
      setEnviando(false);
      return;
    }
    setEnviando(false);
    if (error) return;
    setMinhaResposta(prev => ({ ...prev, [perguntaAberta.id]: opcao }));
  }

  async function entrarComCodigo() {
    const cod = codigo.trim();
    if (cod.length !== 4) { setErroCodigo("Digite os 4 dígitos do código"); return; }
    setErroCodigo("");
    setEnviandoCodigo(true);
    const { data, error } = await fetchLivePerguntaPorCodigo(event.id, cod);
    setEnviandoCodigo(false);
    if (error || !data) { setErroCodigo("Código inválido ou a pergunta já foi encerrada."); return; }
    setPerguntaViaCodigo(data);
    setCodigo("");
  }

  const respondida = perguntaAberta && minhaResposta[perguntaAberta.id];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1.5rem" }}>
      {eventLoaded && event?.logo_url && (
        <img src={event.logo_url} alt={event.nome} style={{ maxHeight: 72, maxWidth: 220, objectFit: "contain", marginBottom: "2.5rem" }} />
      )}

      {!eventLoaded || carregando ? null : !perguntaAberta ? (
        <div style={{ maxWidth: 380, width: "100%" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚡</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: "var(--navy)", fontSize: "1.25rem", marginBottom: "0.5rem" }}>Nenhuma pergunta aberta agora</h2>
          <p style={{ color: "var(--text2)", fontSize: "0.9rem", marginBottom: "2rem" }}>Aguarde a organização iniciar uma enquete ao vivo.</p>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--text3)", marginBottom: "0.6rem" }}>Tem um código de 4 dígitos mostrado no telão?</p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              <input className="form-input" inputMode="numeric" maxLength={4} placeholder="0000"
                style={{ maxWidth: 110, textAlign: "center", fontFamily: "monospace", fontSize: "1.2rem", letterSpacing: "0.2em" }}
                value={codigo} onChange={e => { setCodigo(e.target.value.replace(/\D/g, "").slice(0, 4)); setErroCodigo(""); }}
                onKeyDown={e => e.key === "Enter" && !enviandoCodigo && entrarComCodigo()} />
              <button className="btn btn-primary" onClick={entrarComCodigo} disabled={enviandoCodigo || codigo.length !== 4}>
                {enviandoCodigo ? "…" : "Entrar"}
              </button>
            </div>
            {erroCodigo && <div style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "0.6rem" }}>{erroCodigo}</div>}
          </div>
        </div>
      ) : respondida ? (
        <div style={{ maxWidth: 380, width: "100%" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", color: "var(--success)", fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.6rem" }}>Resposta enviada!</h2>
          <p style={{ color: "var(--text2)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
            Você respondeu: <strong>{minhaResposta[perguntaAberta.id]}</strong>
          </p>
          <p style={{ color: "var(--text3)", fontSize: "0.85rem" }}>Aguarde os resultados no telão 📊</p>
        </div>
      ) : (
        <div style={{ maxWidth: 420, width: "100%" }}>
          <div style={{ display: "inline-block", background: "var(--gold-pale, var(--gold-tint))", color: "var(--warn, var(--navy))", borderRadius: 50, padding: "0.25rem 0.9rem", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
            <FontAwesomeIcon icon={faBolt} style={{ marginRight: 5 }} />Ao vivo agora
          </div>
          <h2 style={{ fontSize: "1.35rem", color: "var(--navy)", fontWeight: 700, marginBottom: "1.75rem", lineHeight: 1.4 }}>{perguntaAberta.texto}</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(perguntaAberta.opcoes || []).map(opcao => (
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
