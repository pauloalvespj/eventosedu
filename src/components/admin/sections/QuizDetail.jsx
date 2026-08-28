import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt, faPlay, faStop, faTrash, faPlus, faXmark, faDisplay, faChartSimple, faArrowLeft, faPenToSquare, faEye } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal, QRCodeCanvas } from "../../base/index";
import { supabase } from "../../../lib/supabase";
import {
  fetchQuiz, fetchPerguntasDoQuiz, criarLivePergunta, atualizarLivePergunta,
  atualizarStatusLivePergunta, deletarLivePergunta, deletarQuiz, fetchLiveRespostas,
} from "../../../lib/db";
import { formatData } from "../../../utils/helpers";

const STATUS_LABEL = { rascunho: "Rascunho", aberta: "Aberta", encerrada: "Encerrada" };
const STATUS_BADGE = { rascunho: "badge-navy", aberta: "badge-success", encerrada: "badge-warn" };
const BAR_COLORS = ["#234c82", "#c9a84c", "#1d6a6a", "#a1458e", "#dc7633", "#4a7a3f", "#7c5cbf", "#b23b3b"];

function novaOpcoesForm() {
  return ["", ""];
}

export function QuizDetail() {
  const { event, showToast } = useAdmin();
  const navigate = useNavigate();
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [perguntas, setPerguntas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [texto, setTexto] = useState("");
  const [opcoes, setOpcoes] = useState(novaOpcoesForm());
  const [salvando, setSalvando] = useState(false);
  const [apresentacao, setApresentacao] = useState(null); // { perguntaId, fase: "lobby" | "resultados" }
  const [resultadosId, setResultadosId] = useState(null);

  useEffect(() => {
    fetchQuiz(quizId).then(({ data }) => setQuiz(data));
    fetchPerguntasDoQuiz(quizId).then(({ data }) => { setPerguntas(data); setCarregando(false); });
  }, [quizId]);

  function abrirNova() {
    setEditandoId(null);
    setTexto("");
    setOpcoes(novaOpcoesForm());
    setModal(true);
  }

  async function abrirEdicao(pergunta) {
    const { data } = await fetchLiveRespostas(pergunta.id);
    if ((data || []).length > 0) {
      showToast("Essa pergunta já recebeu respostas — não é possível editar (crie uma nova).", "error");
      return;
    }
    setEditandoId(pergunta.id);
    setTexto(pergunta.texto);
    setOpcoes(pergunta.opcoes?.length ? pergunta.opcoes : novaOpcoesForm());
    setModal(true);
  }

  function setOpcao(i, v) {
    setOpcoes(prev => prev.map((o, idx) => idx === i ? v : o));
  }
  function addOpcao() {
    if (opcoes.length >= 8) return;
    setOpcoes(prev => [...prev, ""]);
  }
  function removerOpcao(i) {
    setOpcoes(prev => prev.filter((_, idx) => idx !== i));
  }

  async function salvar() {
    const textoOk = texto.trim();
    const opcoesOk = opcoes.map(o => o.trim()).filter(Boolean);
    if (!textoOk) { showToast("Digite a pergunta", "error"); return; }
    if (opcoesOk.length < 2) { showToast("Adicione pelo menos 2 opções", "error"); return; }
    setSalvando(true);
    if (editandoId) {
      const { error } = await atualizarLivePergunta(editandoId, { texto: textoOk, opcoes: opcoesOk });
      setSalvando(false);
      if (error) { showToast("Erro ao salvar: " + error.message, "error"); return; }
      setPerguntas(prev => prev.map(p => p.id === editandoId ? { ...p, texto: textoOk, opcoes: opcoesOk } : p));
      setModal(false);
      showToast("Pergunta atualizada!", "success");
      return;
    }
    const { data, error } = await criarLivePergunta({ quiz_id: quizId, texto: textoOk, opcoes: opcoesOk });
    setSalvando(false);
    if (error) { showToast("Erro ao criar: " + error.message, "error"); return; }
    setPerguntas(prev => [data, ...prev]);
    setModal(false);
    showToast("Pergunta criada!", "success");
  }

  // Só uma pergunta fica "aberta" por vez dentro do quiz — o participante
  // sempre cai na mesma URL/código, então dar play numa nova encerra a
  // anterior sozinho.
  async function mudarStatus(pergunta, status) {
    const outrasAbertas = status === "aberta" ? perguntas.filter(p => p.status === "aberta" && p.id !== pergunta.id) : [];
    setPerguntas(prev => prev.map(p => {
      if (p.id === pergunta.id) return { ...p, status };
      if (outrasAbertas.some(o => o.id === p.id)) return { ...p, status: "encerrada" };
      return p;
    }));
    await Promise.all(outrasAbertas.map(p => atualizarStatusLivePergunta(p.id, "encerrada")));
    const { error } = await atualizarStatusLivePergunta(pergunta.id, status);
    if (error) { showToast("Erro ao atualizar: " + error.message, "error"); return; }
    showToast(status === "aberta" ? "Pergunta aberta — participantes já podem responder!" : "Pergunta encerrada", "success");
  }

  async function remover(pergunta) {
    if (!confirm(`Excluir a pergunta "${pergunta.texto}"? As respostas recebidas também serão apagadas.`)) return;
    setPerguntas(prev => prev.filter(p => p.id !== pergunta.id));
    await deletarLivePergunta(pergunta.id);
    showToast("Pergunta removida", "info");
  }

  async function removerQuiz() {
    if (!confirm(`Excluir o quiz "${quiz?.titulo}"? Todas as perguntas e respostas dele também serão apagadas.`)) return;
    await deletarQuiz(quizId);
    showToast("Quiz removido", "info");
    navigate("/painel/quiz");
  }

  function apresentar(p) {
    setApresentacao({ perguntaId: p.id, fase: p.status === "aberta" ? "lobby" : "resultados" });
  }

  const perguntaApresentada = perguntas.find(p => p.id === apresentacao?.perguntaId);
  const perguntaResultados = perguntas.find(p => p.id === resultadosId);

  return (
    <div>
      <button className="btn btn-sm btn-outline" style={{ marginBottom: "1rem" }} onClick={() => navigate("/painel/quiz")}>
        <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 6 }} />Voltar aos Quizzes
      </button>

      <div className="admin-topbar">
        <div>
          <h1>{quiz?.titulo || "Quiz"}</h1>
          <p>
            Código <strong style={{ fontFamily: "monospace", letterSpacing: "0.1em" }}>{quiz?.codigo}</strong>
            {quiz?.data_inicio && <> · válido {formatData(quiz.data_inicio)}{quiz.data_fim && quiz.data_fim !== quiz.data_inicio ? ` a ${formatData(quiz.data_fim)}` : ""}</>}
          </p>
        </div>
        <button className="btn btn-primary" onClick={abrirNova}>
          <FontAwesomeIcon icon={faBolt} style={{ marginRight: 6 }} />+ Nova Pergunta
        </button>
      </div>

      <div className="table-wrap">
        <div className="table-header"><span className="table-title">Perguntas</span></div>
        <table>
          <thead>
            <tr>
              <th>Pergunta</th>
              <th>Opções</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {perguntas.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600, maxWidth: 320 }}>{p.texto}</td>
                <td style={{ fontSize: "0.82rem", color: "var(--text2)" }}>{(p.opcoes || []).join(" · ")}</td>
                <td><span className={`badge ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span></td>
                <td>
                  <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                    <button className="btn btn-sm btn-outline" title="Apresentar (tela cheia)" onClick={() => apresentar(p)}>
                      <FontAwesomeIcon icon={faDisplay} />
                    </button>
                    {p.status !== "aberta" ? (
                      <button className="btn btn-sm btn-outline" title="Abrir para respostas" onClick={() => mudarStatus(p, "aberta")}>
                        <FontAwesomeIcon icon={faPlay} />
                      </button>
                    ) : (
                      <button className="btn btn-sm btn-outline" title="Encerrar" onClick={() => mudarStatus(p, "encerrada")}>
                        <FontAwesomeIcon icon={faStop} />
                      </button>
                    )}
                    <button className="btn btn-sm btn-outline" title="Editar pergunta" onClick={() => abrirEdicao(p)}>
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <button className="btn btn-sm btn-outline" title="Ver respostas" onClick={() => setResultadosId(p.id)}>
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                    <button className="btn btn-sm btn-danger" title="Excluir" onClick={() => remover(p)}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!carregando && perguntas.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text3)", padding: "2rem" }}>Nenhuma pergunta criada ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Zona de perigo — excluir o quiz inteiro ── */}
      <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px dashed var(--border2)" }}>
        <button style={{ background: "transparent", border: "none", color: "var(--text3)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}
          onClick={removerQuiz}>
          Excluir este quiz
        </button>
      </div>

      {/* ── Modal: nova pergunta / editar pergunta ── */}
      <Modal show={modal} onClose={() => setModal(false)} title={editandoId ? "Editar Pergunta ao Vivo" : "Nova Pergunta ao Vivo"}>
        <div className="form-group">
          <label className="form-label">Pergunta *</label>
          <input className="form-input" placeholder="Ex: Qual tema você quer ver no próximo evento?"
            value={texto} onChange={e => setTexto(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Opções de resposta * (mín. 2)</label>
          {opcoes.map((o, i) => (
            <div key={i} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem" }}>
              <input className="form-input" placeholder={`Opção ${i + 1}`} value={o} onChange={e => setOpcao(i, e.target.value)} />
              {opcoes.length > 2 && (
                <button type="button" className="btn btn-sm btn-outline" onClick={() => removerOpcao(i)}>
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              )}
            </div>
          ))}
          {opcoes.length < 8 && (
            <button type="button" className="btn btn-sm btn-outline" onClick={addOpcao}>
              <FontAwesomeIcon icon={faPlus} style={{ marginRight: 6 }} />Adicionar opção
            </button>
          )}
        </div>
        <button className="btn btn-primary btn-block" style={{ marginTop: "0.5rem" }} onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : editandoId ? "Salvar alterações" : "Criar Pergunta"}
        </button>
      </Modal>

      {/* ── Modal: ver respostas (consulta, sem precisar do telão) ── */}
      {perguntaResultados && (
        <ResultadosModal pergunta={perguntaResultados} onClose={() => setResultadosId(null)} />
      )}

      {/* ── APRESENTAÇÃO — tela cheia: lobby com QR code, depois resultados ao vivo ── */}
      {perguntaApresentada && quiz && (
        <Apresentacao
          pergunta={perguntaApresentada}
          quizCodigo={quiz.codigo}
          event={event}
          faseInicial={apresentacao.fase}
          onClose={() => setApresentacao(null)}
        />
      )}
    </div>
  );
}

// Consulta simples (não precisa abrir o telão) — busca as respostas uma vez
// e mostra a distribuição por opção. Útil pra revisar depois do evento.
function ResultadosModal({ pergunta, onClose }) {
  const [contagens, setContagens] = useState(null);

  useEffect(() => {
    let ativo = true;
    fetchLiveRespostas(pergunta.id).then(({ data }) => {
      if (!ativo) return;
      const c = {};
      (data || []).forEach(r => { c[r.opcao] = (c[r.opcao] || 0) + 1; });
      setContagens(c);
    });
    return () => { ativo = false; };
  }, [pergunta.id]);

  const total = contagens ? Object.values(contagens).reduce((s, n) => s + n, 0) : 0;

  return (
    <Modal show onClose={onClose} title="Respostas">
      <p style={{ fontWeight: 600, color: "var(--navy)", marginBottom: "1.25rem" }}>{pergunta.texto}</p>
      {contagens === null ? (
        <p style={{ color: "var(--text3)" }}>Carregando…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {(pergunta.opcoes || []).map((opcao, i) => {
            const n = contagens[opcao] || 0;
            const pct = total > 0 ? Math.round((n / total) * 100) : 0;
            return (
              <div key={opcao}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.3rem" }}>
                  <span>{opcao}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text2)" }}>{n} {n === 1 ? "voto" : "votos"} · {pct}%</span>
                </div>
                <div style={{ background: "var(--border)", borderRadius: 50, height: 16, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 50, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                </div>
              </div>
            );
          })}
          <div style={{ fontSize: "0.82rem", color: "var(--text3)", marginTop: "0.25rem" }}>
            {total} {total === 1 ? "resposta recebida" : "respostas recebidas"} no total
          </div>
        </div>
      )}
    </Modal>
  );
}

// Tela cheia projetável, em duas fases:
// 1) Lobby — logo + pergunta grande + QR code grande pra quem ainda vai entrar
// 2) Resultados — gráfico de barras animado, atualizado via Realtime, com o
//    QR code menor no canto pra quem chegar atrasado
function Apresentacao({ pergunta, quizCodigo, event, faseInicial, onClose }) {
  const [fase, setFase] = useState(faseInicial);
  const [contagens, setContagens] = useState({});
  const [pulso, setPulso] = useState({});
  const [pops, setPops] = useState([]);
  const total = Object.values(contagens).reduce((s, n) => s + n, 0);
  // QR já leva o código do quiz embutido — quem escaneia entra direto, sem
  // digitar nada; quem digita a URL à mão continua precisando do código.
  const urlResposta = `${window.location.origin}/quiz?c=${quizCodigo}`;

  useEffect(() => {
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

    function onKeyDown(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      ativo = false;
      supabase.removeChannel(channel);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pergunta.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: "fixed", inset: 0, background: "linear-gradient(160deg,#fafafb,#eceef1)", zIndex: 9999, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <button onClick={onClose} title="Fechar (Esc)"
        style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "#fff", border: "1px solid var(--border)", color: "var(--text2)", width: 42, height: 42, borderRadius: "50%", cursor: "pointer", fontSize: "1.1rem", zIndex: 2, boxShadow: "var(--shadow)" }}>
        <FontAwesomeIcon icon={faXmark} />
      </button>

      {event?.logo_url && (
        <div style={{ textAlign: "center", padding: "2rem 2rem 0" }}>
          <img src={event.logo_url} alt={event.nome} style={{ maxHeight: 64, maxWidth: 220, objectFit: "contain" }} />
        </div>
      )}

      {fase === "lobby" ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4rem", padding: "2rem 4rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 380px", maxWidth: 560, alignSelf: "flex-start", marginTop: "3rem" }}>
            <div style={{ color: "var(--text3)", fontSize: "0.95rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              <FontAwesomeIcon icon={faBolt} style={{ marginRight: 8, color: "var(--gold, #c9a84c)" }} />É hora de participar!
            </div>
            <h1 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, color: "var(--navy)", fontSize: "clamp(2rem,4.5vw,3.4rem)", margin: 0, lineHeight: 1.25 }}>{pergunta.texto}</h1>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem", marginTop: "2rem" }}>
              {(pergunta.opcoes || []).map((opcao, i) => (
                <div key={opcao} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "0.65rem 1rem", boxShadow: "var(--shadow)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: BAR_COLORS[i % BAR_COLORS.length], flexShrink: 0 }} />
                  <span style={{ color: "var(--text)", fontSize: "1.05rem", fontWeight: 500 }}>{opcao}</span>
                </div>
              ))}
            </div>

            <button className="btn btn-lg" style={{ marginTop: "2rem", background: "var(--navy)", borderColor: "var(--navy)", color: "#fff", fontWeight: 700 }}
              onClick={() => setFase("resultados")}>
              <FontAwesomeIcon icon={faChartSimple} style={{ marginRight: 8 }} />Ver respostas
            </button>
          </div>

          <div style={{ flex: "0 0 auto", textAlign: "center" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: "1.25rem", display: "inline-block", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
              <QRCodeCanvas value={urlResposta} size={280} />
            </div>
            <div style={{ color: "var(--text2)", fontSize: "1rem", marginTop: "1rem" }}>
              Aponte a câmera do celular pra responder
            </div>
            {quizCodigo && (
              <>
                <div style={{ color: "var(--text3)", fontSize: "0.9rem", marginTop: "1.25rem" }}>ou acesse o link abaixo e digite o seguinte código:</div>
                <div style={{ color: "var(--text2)", fontSize: "1.2rem", fontWeight: 600, marginTop: "0.3rem" }}>{window.location.host}/quiz</div>
                <div style={{ display: "inline-block", background: "#fff", color: "var(--navy)", fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 800, letterSpacing: "0.3em", fontFamily: "monospace", lineHeight: 1, marginTop: "0.5rem", padding: "0.5rem 1.25rem", border: "1px solid var(--border)", borderRadius: 16 }}>{quizCodigo}</div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <button className="btn btn-sm btn-outline" style={{ alignSelf: "flex-start", margin: "0 0 0 3rem" }}
            onClick={() => setFase("lobby")}>
            <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: 6 }} />Voltar pro QR code
          </button>

          <h1 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, color: "var(--navy)", fontSize: "clamp(1.5rem,2.6vw,2.1rem)", margin: "0.5rem 3rem 0", textAlign: "center", lineHeight: 1.3 }}>{pergunta.texto}</h1>

          <div style={{ flex: 1, display: "flex", padding: "1.5rem 3rem 2.5rem", gap: "3rem", flexWrap: "wrap" }}>
            {/* ── Coluna esquerda (~1/3) — QR code ── */}
            <div style={{ flex: "1 1 300px", maxWidth: 380, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", justifyContent: "center", gap: "1.5rem" }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: "1rem", display: "inline-block", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
                <QRCodeCanvas value={urlResposta} size={200} />
              </div>
              {quizCodigo && (
                <div>
                  <div style={{ color: "var(--text3)", fontSize: "0.78rem" }}>ou digite o código</div>
                  <div style={{ color: "var(--navy)", fontSize: "1.5rem", fontWeight: 800, letterSpacing: "0.3em", fontFamily: "monospace" }}>{quizCodigo}</div>
                </div>
              )}
              <div style={{ color: "var(--text2)", fontSize: "0.9rem", lineHeight: 1.4 }}>
                Ainda não respondeu? Escaneie o QR code
              </div>
              <div style={{ color: "var(--text2)", fontSize: "1rem" }}>
                {total} {total === 1 ? "resposta recebida" : "respostas recebidas"} até agora
              </div>
            </div>

          {/* ── Coluna direita (~2/3) — resultados ao vivo ── */}
          <div style={{ flex: "2 1 480px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "1.4rem" }}>
            {(pergunta.opcoes || []).map((opcao, i) => {
              const n = contagens[opcao] || 0;
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
