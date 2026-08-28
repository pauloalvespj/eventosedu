import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../../../lib/supabase";
import { fetchLivePerguntas, fetchLivePerguntaPorCodigo, fetchMinhaLiveResposta, responderLivePergunta } from "../../../lib/db";
import { useUsuario } from "../UsuarioContext";

export function LivePerguntas() {
  const { event, user, showToast } = useUsuario();
  const [perguntas, setPerguntas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [minhaResposta, setMinhaResposta] = useState({}); // { [perguntaId]: opcao }
  const [enviando, setEnviando] = useState(false);
  const [perguntaViaCodigo, setPerguntaViaCodigo] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);

  async function carregar() {
    const { data } = await fetchLivePerguntas(event.id);
    setPerguntas(data);
    setCarregando(false);
    // Se a pergunta que veio por código foi encerrada/removida, solta ela —
    // volta a cair no fluxo automático (ou no estado de espera).
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
      .channel(`live-perguntas-${event.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_perguntas", filter: `event_id=eq.${event.id}` }, () => carregar())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const perguntaAberta = perguntaViaCodigo || perguntas.find(p => p.status === "aberta");

  useEffect(() => {
    if (!perguntaAberta || minhaResposta?.[perguntaAberta.id] !== undefined) return;
    fetchMinhaLiveResposta(perguntaAberta.id, user.id).then(({ data }) => {
      setMinhaResposta(prev => ({ ...prev, [perguntaAberta.id]: data?.opcao ?? null }));
    });
  }, [perguntaAberta?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function responder(opcao) {
    if (enviando) return;
    setEnviando(true);
    const { error } = await responderLivePergunta({ pergunta_id: perguntaAberta.id, participante_id: user.id, opcao });
    setEnviando(false);
    if (error) {
      showToast(error.code === "23505" ? "Você já respondeu essa pergunta." : "Erro ao enviar resposta: " + error.message, "error");
      setMinhaResposta(prev => ({ ...prev, [perguntaAberta.id]: opcao }));
      return;
    }
    setMinhaResposta(prev => ({ ...prev, [perguntaAberta.id]: opcao }));
  }

  async function entrarComCodigo() {
    const cod = codigo.trim();
    if (cod.length !== 4) { showToast("Digite os 4 dígitos do código", "error"); return; }
    setEnviandoCodigo(true);
    const { data, error } = await fetchLivePerguntaPorCodigo(event.id, cod);
    setEnviandoCodigo(false);
    if (error || !data) { showToast("Código inválido ou a pergunta já foi encerrada.", "error"); return; }
    setPerguntaViaCodigo(data);
    setCodigo("");
  }

  const respondida = perguntaAberta && minhaResposta[perguntaAberta.id];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minHeight: "65vh", justifyContent: "center", padding: "1rem" }}>
      {event.logo_url && (
        <img src={event.logo_url} alt={event.nome} style={{ maxHeight: 64, maxWidth: 200, objectFit: "contain", marginBottom: "2rem" }} />
      )}

      {carregando ? null : !perguntaAberta ? (
        <div style={{ maxWidth: 380, width: "100%" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚡</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: "var(--navy)", fontSize: "1.25rem", marginBottom: "0.5rem" }}>Nenhuma pergunta aberta agora</h2>
          <p style={{ color: "var(--text2)", fontSize: "0.9rem", marginBottom: "2rem" }}>Aguarde a organização iniciar uma enquete ao vivo.</p>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--text3)", marginBottom: "0.6rem" }}>Tem um código de 4 dígitos mostrado no telão?</p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              <input className="form-input" inputMode="numeric" maxLength={4} placeholder="0000"
                style={{ maxWidth: 110, textAlign: "center", fontFamily: "monospace", fontSize: "1.2rem", letterSpacing: "0.2em" }}
                value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={e => e.key === "Enter" && !enviandoCodigo && entrarComCodigo()} />
              <button className="btn btn-primary" onClick={entrarComCodigo} disabled={enviandoCodigo || codigo.length !== 4}>
                {enviandoCodigo ? "…" : "Entrar"}
              </button>
            </div>
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
