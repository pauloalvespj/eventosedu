import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt, faPlay, faStop, faTrash, faPlus, faXmark, faDisplay, faArrowLeft, faPenToSquare, faEye, faArrowUp, faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal } from "../../base/index";
import {
  fetchQuiz, fetchPerguntasDoQuiz, criarLivePergunta, atualizarLivePergunta,
  atualizarStatusLivePergunta, deletarLivePergunta, deletarQuiz, fetchLiveRespostas,
  limparLiveRespostas, atualizarOrdemLivePergunta,
} from "../../../lib/db";
import { formatData } from "../../../utils/helpers";
import { BAR_COLORS } from "../../../utils/quizColors";

const STATUS_LABEL = { rascunho: "Rascunho", aberta: "Aberta", encerrada: "Encerrada" };
const STATUS_BADGE = { rascunho: "badge-navy", aberta: "badge-success", encerrada: "badge-warn" };

function novaOpcoesForm() {
  return ["", ""];
}

export function QuizDetail() {
  const { showToast } = useAdmin();
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

  // Troca a posição da pergunta com a vizinha (direção: -1 sobe, +1 desce).
  async function moverPergunta(pergunta, direcao) {
    const idx = perguntas.findIndex(p => p.id === pergunta.id);
    const alvoIdx = idx + direcao;
    if (alvoIdx < 0 || alvoIdx >= perguntas.length) return;
    const alvo = perguntas[alvoIdx];
    const novaLista = [...perguntas];
    novaLista[idx] = alvo;
    novaLista[alvoIdx] = pergunta;
    setPerguntas(novaLista);
    await Promise.all([
      atualizarOrdemLivePergunta(pergunta.id, alvo.ordem),
      atualizarOrdemLivePergunta(alvo.id, pergunta.ordem),
    ]);
  }

  async function removerQuiz() {
    if (!confirm(`Excluir o quiz "${quiz?.titulo}"? Todas as perguntas e respostas dele também serão apagadas.`)) return;
    await deletarQuiz(quizId);
    showToast("Quiz removido", "info");
    navigate("/painel/quiz");
  }

  // Abre o telão em nova janela/aba — dá pra arrastar pra um segundo
  // monitor/projetor sem espelhar a tela do admin.
  function apresentar(p) {
    window.open(`/quiz-telao/${p.id}`, "_blank", "noopener,width=1400,height=900");
  }

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
              <th style={{ width: 80 }}></th>
              <th>Pergunta</th>
              <th style={{ width: 100 }}>Status</th>
              <th style={{ textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {perguntas.map((p, idx) => (
              <tr key={p.id}>
                <td>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button className="btn btn-sm btn-outline" title="Mover para cima" disabled={idx === 0} onClick={() => moverPergunta(p, -1)}>
                      <FontAwesomeIcon icon={faArrowUp} />
                    </button>
                    <button className="btn btn-sm btn-outline" title="Mover para baixo" disabled={idx === perguntas.length - 1} onClick={() => moverPergunta(p, 1)}>
                      <FontAwesomeIcon icon={faArrowDown} />
                    </button>
                  </div>
                </td>
                <td style={{ fontWeight: 600, maxWidth: 320 }}>{p.texto}</td>
                <td><span className={`badge ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span></td>
                <td>
                  <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
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
        <ResultadosModal pergunta={perguntaResultados} onClose={() => setResultadosId(null)} showToast={showToast} />
      )}

    </div>
  );
}

// Consulta simples (não precisa abrir o telão) — busca as respostas uma vez
// e mostra a distribuição por opção. Útil pra revisar depois do evento.
function ResultadosModal({ pergunta, onClose, showToast }) {
  const [contagens, setContagens] = useState(null);
  const [limpando, setLimpando] = useState(false);

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

  async function limparRespostas() {
    if (!confirm("Apagar todas as respostas desta pergunta? Essa ação não pode ser desfeita.")) return;
    setLimpando(true);
    const { error } = await limparLiveRespostas(pergunta.id);
    setLimpando(false);
    if (error) { showToast("Erro ao limpar respostas: " + error.message, "error"); return; }
    setContagens({});
    showToast("Respostas apagadas!", "success");
  }

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
          {total > 0 && (
            <button className="btn btn-sm btn-danger" style={{ alignSelf: "flex-start" }} onClick={limparRespostas} disabled={limpando}>
              <FontAwesomeIcon icon={faTrash} style={{ marginRight: 6 }} />
              {limpando ? "Limpando…" : "Limpar respostas"}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

