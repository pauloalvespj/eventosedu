import { useState, useEffect } from "react";
import { fetchMinhasRespostasPesquisa, salvarRespostaPesquisa } from "../../lib/db";

export function PesquisaSatisfacaoForm({ event, user, perguntasPesquisa, onRespondido }) {
  const [respostas, setRespostas] = useState({}); // pergunta_id -> valor
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState(false);

  const ordenadas = [...perguntasPesquisa].sort((a, b) => a.ordem - b.ordem);

  useEffect(() => {
    fetchMinhasRespostasPesquisa(user.id).then(({ data }) => {
      const mapa = {};
      (data || []).forEach(r => { mapa[r.pergunta_id] = r.resposta_opcao ?? r.resposta_texto ?? ""; });
      setRespostas(mapa);
      setCarregando(false);
    });
  }, [user.id]);

  function set(perguntaId, valor) {
    setRespostas(prev => ({ ...prev, [perguntaId]: valor }));
    setErro(false);
  }

  async function enviar() {
    const faltando = ordenadas.filter(p => p.obrigatoria && !respostas[p.id]?.trim());
    if (faltando.length) { setErro(true); return; }
    setEnviando(true);
    await Promise.all(
      ordenadas.filter(p => respostas[p.id]?.trim()).map(p => salvarRespostaPesquisa({
        pergunta_id: p.id,
        participante_id: user.id,
        resposta_opcao: p.tipo === "fechada" ? respostas[p.id] : null,
        resposta_texto: p.tipo === "aberta" ? respostas[p.id] : null,
      }))
    );
    setEnviando(false);
    setEnviado(true);
    onRespondido?.();
  }

  if (carregando) return <div style={{ textAlign: "center", padding: "3rem", color: "var(--text3)" }}>Carregando…</div>;

  if (enviado) return (
    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
      <h2 style={{ fontFamily: "'Playfair Display',serif", color: "var(--navy)", marginBottom: "0.5rem" }}>Obrigado pela sua resposta!</h2>
      <p style={{ color: "var(--text2)", marginBottom: "1.5rem" }}>Sua opinião foi registrada e vai nos ajudar a melhorar os próximos eventos.</p>
      <button className="btn btn-outline btn-sm" onClick={() => setEnviado(false)}>Editar minha resposta</button>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* Cabeçalho com logo do evento */}
      <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "2rem", textAlign: "center", marginBottom: "1.75rem" }}>
        {event.logo_url && (
          <img src={event.logo_url} alt={event.nome} style={{ maxHeight: 64, maxWidth: 220, objectFit: "contain", marginBottom: "1rem" }} />
        )}
        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", fontWeight: 800, color: "var(--navy)", marginBottom: "0.4rem" }}>
          Pesquisa de Satisfação
        </div>
        <div style={{ fontSize: "0.9rem", color: "var(--text2)" }}>{event.nome}</div>
        {event.pesquisa_intro && (
          <p style={{ fontSize: "0.88rem", color: "var(--text3)", lineHeight: 1.6, marginTop: "1rem", maxWidth: 480, marginInline: "auto" }}>
            {event.pesquisa_intro}
          </p>
        )}
      </div>

      {ordenadas.length === 0 && (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--text3)" }}>A pesquisa ainda não tem perguntas cadastradas.</div>
      )}

      {ordenadas.map((p, i) => (
        <div key={p.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem 1.5rem", marginBottom: "1rem" }}>
          <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "0.85rem" }}>
            {i + 1}. {p.texto} {p.obrigatoria && <span style={{ color: "var(--danger)" }}>*</span>}
          </div>
          {p.tipo === "fechada" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {(p.opcoes || []).map(op => (
                <label key={op} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.9rem", color: "var(--text)" }}>
                  <input type="radio" name={`pergunta-${p.id}`} checked={respostas[p.id] === op} onChange={() => set(p.id, op)} />
                  {op}
                </label>
              ))}
            </div>
          ) : (
            <textarea className="form-input" rows={3} placeholder="Digite sua resposta..."
              value={respostas[p.id] || ""} onChange={e => set(p.id, e.target.value)} />
          )}
        </div>
      ))}

      {erro && (
        <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          Responda todas as perguntas obrigatórias (marcadas com *) antes de enviar.
        </div>
      )}

      {ordenadas.length > 0 && (
        <button className="btn btn-primary btn-block" onClick={enviar} disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar respostas"}
        </button>
      )}
    </div>
  );
}
