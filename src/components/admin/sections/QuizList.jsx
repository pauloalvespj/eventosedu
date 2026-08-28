import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt, faArrowRight, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { Modal } from "../../base/index";
import { fetchQuizzes, criarQuiz, atualizarQuiz } from "../../../lib/db";
import { formatData } from "../../../utils/helpers";

export function QuizList() {
  const { event, showToast } = useAdmin();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [titulo, setTitulo] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!event?.id) return;
    fetchQuizzes(event.id).then(({ data }) => { setQuizzes(data); setCarregando(false); });
  }, [event?.id]);

  function abrirNovo() {
    setEditandoId(null);
    setTitulo("");
    setDataInicio(event.data_inicio || "");
    setDataFim(event.data_fim || "");
    setAtivo(true);
    setModal(true);
  }

  function abrirEdicao(quiz) {
    setEditandoId(quiz.id);
    setTitulo(quiz.titulo);
    setDataInicio(quiz.data_inicio || "");
    setDataFim(quiz.data_fim || "");
    setAtivo(quiz.ativo !== false);
    setModal(true);
  }

  async function salvar() {
    const tituloOk = titulo.trim();
    if (!tituloOk) { showToast("Digite um nome pro quiz", "error"); return; }
    setSalvando(true);
    if (editandoId) {
      const { error } = await atualizarQuiz(editandoId, { titulo: tituloOk, data_inicio: dataInicio || null, data_fim: dataFim || null, ativo });
      setSalvando(false);
      if (error) { showToast("Erro ao salvar: " + error.message, "error"); return; }
      setQuizzes(prev => prev.map(q => q.id === editandoId ? { ...q, titulo: tituloOk, data_inicio: dataInicio || null, data_fim: dataFim || null, ativo } : q));
      setModal(false);
      showToast("Quiz atualizado!", "success");
      return;
    }
    const { data, error } = await criarQuiz({ event_id: event.id, titulo: tituloOk, data_inicio: dataInicio || null, data_fim: dataFim || null });
    setSalvando(false);
    if (error) { showToast("Erro ao criar: " + error.message, "error"); return; }
    setModal(false);
    navigate(`/painel/quiz/${data.id}`);
  }

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Quiz / Perguntas</h1><p>Enquetes ao vivo respondidas em tempo real</p></div>
        <button className="btn btn-primary" onClick={abrirNovo}>
          <FontAwesomeIcon icon={faBolt} style={{ marginRight: 6 }} />+ Novo Quiz
        </button>
      </div>

      <div className="table-wrap">
        <div className="table-header"><span className="table-title">Quizzes</span></div>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Código</th>
              <th>Validade</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map(q => (
              <tr key={q.id} style={{ cursor: "pointer", opacity: q.ativo === false ? 0.55 : 1 }} onClick={() => navigate(`/painel/quiz/${q.id}`)}>
                <td style={{ fontWeight: 600 }}>{q.titulo}</td>
                <td style={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.1em" }}>{q.codigo}</td>
                <td style={{ fontSize: "0.82rem", color: "var(--text2)" }}>
                  {q.data_inicio ? `${formatData(q.data_inicio)}${q.data_fim && q.data_fim !== q.data_inicio ? ` a ${formatData(q.data_fim)}` : ""}` : "—"}
                </td>
                <td><span className={`badge ${q.ativo === false ? "badge-danger" : "badge-success"}`}>{q.ativo === false ? "Inativo" : "Ativo"}</span></td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <button className="btn btn-sm btn-outline" title="Editar" onClick={() => abrirEdicao(q)}>
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <button className="btn btn-sm btn-outline" title="Abrir" onClick={() => navigate(`/painel/quiz/${q.id}`)}>
                      <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!carregando && quizzes.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text3)", padding: "2rem" }}>Nenhum quiz criado ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal show={modal} onClose={() => setModal(false)} title={editandoId ? "Editar Quiz" : "Novo Quiz"}>
        <div className="form-group">
          <label className="form-label">Nome do quiz *</label>
          <input className="form-input" placeholder="Ex: Palestras dia 1" value={titulo} onChange={e => setTitulo(e.target.value)} autoFocus />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Válido a partir de</label>
            <input type="date" className="form-input" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Válido até</label>
            <input type="date" className="form-input" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
        </div>
        {editandoId && (
          <div className="form-group">
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", userSelect: "none" }}>
              <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "var(--navy)" }} />
              <span className="form-label" style={{ margin: 0 }}>Quiz ativo (código funciona pra responder)</span>
            </label>
          </div>
        )}
        <button className="btn btn-primary btn-block" style={{ marginTop: "0.5rem" }} onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : editandoId ? "Salvar alterações" : "Criar Quiz"}
        </button>
      </Modal>
    </div>
  );
}
