import { useState } from "react";
import { PONTOS, CATEGORIAS_FORUM } from "../../config/gamificacao";
import { forumAberto, getUserId, calcPontos, getNivel, timeAgo } from "../../utils/helpers";
import { Modal, AvatarMini, RoleBadge, PtsFloat } from "../base/index";
import {
  criarTopico as dbCriarTopico,
  criarResposta as dbCriarResposta,
  curtirTopico as dbCurtirTopico,
  curtirResposta as dbCurtirResposta,
  fixarTopico as dbFixarTopico,
  deletarTopico as dbDeletarTopico,
  deletarResposta as dbDeletarResposta,
  inserirPontuacao,
  normalizeTopicoSingle,
} from "../../lib/db";

export function ForumView({ user, topicos, setTopicos, pontuacoes, setPontuacoes, forumConfig }) {
  const [catAtiva, setCatAtiva] = useState("all");
  const [topicoAberto, setTopicoAberto] = useState(null);
  const [novoTopico, setNovoTopico] = useState(false);
  const [formTop, setFormTop] = useState({ titulo: "", corpo: "", categoria: "geral" });
  const [resposta, setResposta] = useState("");
  const [busca, setBusca] = useState("");
  const [floats, setFloats] = useState([]);

  const aberto = forumAberto(forumConfig);
  const uid = getUserId(user);
  const isAdmin = user && user.role === "admin";
  const podePostar = user && (aberto || isAdmin);

  function showFloat(pts) {
    const id = Date.now();
    setFloats(f => [...f, { id, pts, x: window.innerWidth / 2 - 30, y: 200 }]);
    setTimeout(() => setFloats(f => f.filter(ff => ff.id !== id)), 1600);
  }

  function addPonto(tipo) {
    const val = PONTOS[tipo] || 0;
    if (!uid) return;
    const ponto = { id: Date.now(), user_id: uid, tipo, valor: val, desc: tipo, created_at: new Date().toISOString() };
    setPontuacoes(prev => [...prev, ponto]);
    showFloat(val);
    inserirPontuacao({ user_id: uid, tipo, valor: val, desc: tipo });
  }

  function addPontoParaOutro(userId, tipo) {
    const val = PONTOS[tipo] || 0;
    if (!userId) return;
    const ponto = { id: Date.now(), user_id: userId, tipo, valor: val, desc: tipo, created_at: new Date().toISOString() };
    setPontuacoes(prev => [...prev, ponto]);
    inserirPontuacao({ user_id: userId, tipo, valor: val, desc: tipo });
  }

  async function criarTopico() {
    if (!formTop.titulo.trim() || !formTop.corpo.trim() || !uid) return;
    // Otimista
    const tempId = Date.now();
    const tempTopico = {
      id: tempId, categoria: formTop.categoria, titulo: formTop.titulo, corpo: formTop.corpo,
      user_id: uid, autor_id: uid, autor_nome: user.nome, autor_role: user.role,
      created_at: new Date().toISOString(), curtidas: [], fixado: false, destaque: false, removido: false, respostas: [],
    };
    setTopicos(prev => [tempTopico, ...prev]);
    addPonto("topico");
    setFormTop({ titulo: "", corpo: "", categoria: "geral" });
    setNovoTopico(false);
    setTopicoAberto(tempTopico);

    // Persiste
    const { data, error } = await dbCriarTopico({
      user_id: uid, categoria: formTop.categoria, titulo: formTop.titulo, corpo: formTop.corpo,
    });
    if (!error && data) {
      const normalizado = normalizeTopicoSingle({ ...data, respostas: [] });
      setTopicos(prev => prev.map(t => t.id === tempId ? normalizado : t));
      setTopicoAberto(prev => prev?.id === tempId ? normalizado : prev);
    }
  }

  async function responderTopico() {
    if (!resposta.trim() || !uid) return;
    const tempId = Date.now();
    const tempResp = {
      id: tempId, corpo: resposta, user_id: uid,
      autor_id: uid, autor_nome: user.nome, autor_role: user.role,
      created_at: new Date().toISOString(), curtidas: [],
    };
    const atualizaTopicos = prev => prev.map(t =>
      t.id === topicoAberto.id ? { ...t, respostas: [...t.respostas, tempResp] } : t
    );
    setTopicos(atualizaTopicos);
    setTopicoAberto(prev => ({ ...prev, respostas: [...prev.respostas, tempResp] }));
    addPonto("resposta");
    setResposta("");

    // Persiste
    const { data, error } = await dbCriarResposta({ topico_id: topicoAberto.id, user_id: uid, corpo: resposta });
    if (!error && data) {
      const r = { ...data, autor_id: data.user_id, autor_nome: data.autor?.nome ?? user.nome, autor_role: data.autor?.role ?? user.role };
      setTopicos(prev => prev.map(t =>
        t.id === topicoAberto.id
          ? { ...t, respostas: t.respostas.map(rr => rr.id === tempId ? r : rr) }
          : t
      ));
      setTopicoAberto(prev => prev
        ? { ...prev, respostas: prev.respostas.map(rr => rr.id === tempId ? r : rr) }
        : prev
      );
    }
  }

  async function curtirItem(topicoId, respostaId = null) {
    if (!uid) return;
    setTopicos(prev => prev.map(t => {
      if (t.id !== topicoId) return t;
      if (!respostaId) {
        const jaCurtiu = t.curtidas.includes(uid);
        const novas = jaCurtiu ? t.curtidas.filter(c => c !== uid) : [...t.curtidas, uid];
        if (!jaCurtiu && t.autor_id !== uid) addPontoParaOutro(t.autor_id, "curtida_recebida");
        const up = { ...t, curtidas: novas };
        if (topicoAberto?.id === topicoId) setTopicoAberto(up);
        dbCurtirTopico(topicoId, uid, novas);
        return up;
      } else {
        const rs = t.respostas.map(r => {
          if (r.id !== respostaId) return r;
          const jaCurtiu = r.curtidas.includes(uid);
          const novas = jaCurtiu ? r.curtidas.filter(c => c !== uid) : [...r.curtidas, uid];
          if (!jaCurtiu && r.autor_id !== uid) addPontoParaOutro(r.autor_id, "curtida_recebida");
          dbCurtirResposta(respostaId, novas);
          return { ...r, curtidas: novas };
        });
        const up = { ...t, respostas: rs };
        if (topicoAberto?.id === topicoId) setTopicoAberto(up);
        return up;
      }
    }));
  }

  async function toggleFixado(topicoId) {
    setTopicos(prev => prev.map(t => {
      if (t.id !== topicoId) return t;
      const novo = { ...t, fixado: !t.fixado };
      if (topicoAberto?.id === topicoId) setTopicoAberto(novo);
      dbFixarTopico(topicoId, novo.fixado);
      return novo;
    }));
  }

  function toggleDestaque(topicoId) {
    // destaque é só visual (não tem campo na DB — é um estado local/admin)
    setTopicos(prev => prev.map(t => {
      if (t.id !== topicoId) return t;
      const novo = { ...t, destaque: !t.destaque };
      if (novo.destaque && !t.destaque) addPontoParaOutro(t.autor_id, "topico_destaque");
      if (topicoAberto?.id === topicoId) setTopicoAberto(novo);
      return novo;
    }));
  }

  async function removerTopico(topicoId) {
    if (!confirm("Remover tópico?")) return;
    setTopicos(prev => prev.map(t => t.id === topicoId ? { ...t, removido: true } : t));
    setTopicoAberto(null);
    await dbDeletarTopico(topicoId);
  }

  async function removerResposta(topicoId, respostaId) {
    setTopicos(prev => prev.map(t =>
      t.id === topicoId
        ? { ...t, respostas: t.respostas.filter(r => r.id !== respostaId) }
        : t
    ));
    setTopicoAberto(prev => prev?.id === topicoId
      ? { ...prev, respostas: prev.respostas.filter(r => r.id !== respostaId) }
      : prev
    );
    await dbDeletarResposta(respostaId);
  }

  const topicosFiltrados = topicos
    .filter(t => !t.removido)
    .filter(t => catAtiva === "all" || t.categoria === catAtiva)
    .filter(t => !busca || t.titulo.toLowerCase().includes(busca.toLowerCase()) || t.corpo.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => { if (a.fixado && !b.fixado) return -1; if (!a.fixado && b.fixado) return 1; return new Date(b.created_at) - new Date(a.created_at); });

  const meusPts = uid ? calcPontos(uid, pontuacoes) : 0;
  const nivel = getNivel(meusPts);

  // ── Tópico aberto ──
  if (topicoAberto) {
    const t = topicos.find(tp => tp.id === topicoAberto.id) || topicoAberto;
    if (t.removido) { setTopicoAberto(null); return null; }
    const cat = CATEGORIAS_FORUM.find(c => c.id === t.categoria);
    return (
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {floats.map(f => <PtsFloat key={f.id} {...f} />)}
        <button className="btn btn-sm btn-outline" style={{ marginBottom: "1.25rem" }} onClick={() => setTopicoAberto(null)}>← Voltar</button>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", marginBottom: "1rem" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              {cat && <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: 50, background: cat.cor + "18", color: cat.cor }}>{cat.label}</span>}
              {t.fixado && <span className="badge badge-gold">📌 Fixado</span>}
              {t.destaque && <span className="badge badge-teal">⭐ Destaque</span>}
            </div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", color: "var(--navy)", marginBottom: "0.5rem" }}>{t.titulo}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <AvatarMini nome={t.autor_nome} role={t.autor_role} />
              <span style={{ fontSize: "0.82rem", color: "var(--text)", fontWeight: 600 }}>{t.autor_nome}</span>
              <RoleBadge role={t.autor_role} />
              <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>{timeAgo(t.created_at)}</span>
            </div>
          </div>
          <div style={{ padding: "1.25rem 1.5rem" }}>
            <p style={{ fontSize: "0.92rem", color: "var(--text)", lineHeight: 1.75 }}>{t.corpo}</p>
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
              <button className={`btn-curtir${t.curtidas.includes(uid) ? " curtido" : ""}`} onClick={() => curtirItem(t.id)} disabled={!uid}>
                ❤️ {t.curtidas.length} curtida{t.curtidas.length !== 1 ? "s" : ""}
              </button>
              <span style={{ fontSize: "0.78rem", color: "var(--text3)" }}>{t.respostas.length} resposta{t.respostas.length !== 1 ? "s" : ""}</span>
              {isAdmin && <>
                <button className="btn btn-sm btn-outline" style={{ marginLeft: "auto" }} onClick={() => toggleDestaque(t.id)}>{t.destaque ? "⭐ Remover destaque" : "⭐ Destacar"}</button>
                <button className="btn btn-sm btn-outline" onClick={() => toggleFixado(t.id)}>{t.fixado ? "📌 Desafixar" : "📌 Fixar"}</button>
                <button className="btn btn-sm btn-danger" onClick={() => removerTopico(t.id)}>🗑</button>
              </>}
            </div>
          </div>
        </div>
        {/* Respostas */}
        <div style={{ marginBottom: "1rem" }}>
          {t.respostas.map(r => (
            <div key={r.id} className={`resposta-card${r.autor_id === uid ? " proprio" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                <AvatarMini nome={r.autor_nome} role={r.autor_role} />
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)" }}>{r.autor_nome}</span>
                <RoleBadge role={r.autor_role} />
                <span style={{ fontSize: "0.75rem", color: "var(--text3)", marginLeft: "auto" }}>{timeAgo(r.created_at)}</span>
              </div>
              <p style={{ fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.65, marginBottom: "0.6rem" }}>{r.corpo}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <button className={`btn-curtir${r.curtidas.includes(uid) ? " curtido" : ""}`} onClick={() => curtirItem(t.id, r.id)} disabled={!uid}>❤️ {r.curtidas.length}</button>
                {isAdmin && <button style={{ background: "transparent", border: "none", color: "var(--danger)", fontSize: "0.78rem", cursor: "pointer" }} onClick={() => removerResposta(t.id, r.id)}>🗑</button>}
              </div>
            </div>
          ))}
        </div>
        {/* Caixa de resposta */}
        {podePostar ? (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.25rem" }}>
            <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "0.75rem", fontSize: "0.9rem" }}>💬 Sua resposta</div>
            <textarea className="form-input" rows={3} placeholder="Escreva sua resposta..." value={resposta} onChange={e => setResposta(e.target.value)} style={{ marginBottom: "0.75rem", resize: "vertical" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text3)" }}>+{PONTOS.resposta} pts ao responder</span>
              <button className="btn btn-primary" onClick={responderTopico} disabled={!resposta.trim()}>Responder</button>
            </div>
          </div>
        ) : (
          <div style={{ background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: "1rem", textAlign: "center", color: "var(--text3)", fontSize: "0.88rem" }}>
            {!user ? "Faça login para participar do fórum." : "O fórum está fechado no momento."}
          </div>
        )}
      </div>
    );
  }

  // ── Lista de tópicos ──
  return (
    <div>
      {floats.map(f => <PtsFloat key={f.id} {...f} />)}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.4rem", color: "var(--navy)", marginBottom: "0.2rem" }}>Fórum do Evento</h2>
          <div style={{ fontSize: "0.82rem", color: aberto ? "var(--success)" : "var(--text3)", fontWeight: 600 }}>
            {aberto ? "🟢 Aberto" : "🔴 Fechado"} · {topicosFiltrados.length} tópico{topicosFiltrados.length !== 1 ? "s" : ""}
          </div>
        </div>
        {uid && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.6rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.1rem" }}>{nivel.icon}</span>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: nivel.cor }}>{nivel.label}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{meusPts} pts</div>
            </div>
          </div>
        )}
        {podePostar && <button className="btn btn-primary" onClick={() => setNovoTopico(true)}>+ Novo Tópico</button>}
      </div>

      <Modal show={novoTopico} onClose={() => setNovoTopico(false)} title="Criar tópico">
        <div className="form-group">
          <label className="form-label">Categoria</label>
          <select className="form-input" value={formTop.categoria} onChange={e => setFormTop(f => ({ ...f, categoria: e.target.value }))}>
            {CATEGORIAS_FORUM.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Título *</label>
          <input className="form-input" value={formTop.titulo} onChange={e => setFormTop(f => ({ ...f, titulo: e.target.value }))} placeholder="Título do tópico..." />
        </div>
        <div className="form-group">
          <label className="form-label">Mensagem *</label>
          <textarea className="form-input" rows={4} value={formTop.corpo} onChange={e => setFormTop(f => ({ ...f, corpo: e.target.value }))} placeholder="Sua mensagem..." />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text3)" }}>+{PONTOS.topico} pts ao criar</span>
          <button className="btn btn-primary" onClick={criarTopico} disabled={!formTop.titulo.trim() || !formTop.corpo.trim()}>Publicar</button>
        </div>
      </Modal>

      <div className="forum-layout">
        {/* Sidebar categorias */}
        <div className="forum-sidebar">
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.75rem" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>Categorias</div>
            <button className={`forum-cat-btn${catAtiva === "all" ? " active" : ""}`} onClick={() => setCatAtiva("all")}>
              🗂 Todos <span style={{ marginLeft: "auto", fontSize: "0.75rem", opacity: 0.7 }}>{topicos.filter(t => !t.removido).length}</span>
            </button>
            {CATEGORIAS_FORUM.map(c => (
              <button key={c.id} className={`forum-cat-btn${catAtiva === c.id ? " active" : ""}`} onClick={() => setCatAtiva(c.id)}>
                <span className="forum-cat-dot" style={{ background: c.cor }} /> {c.label.replace(/^\S+\s/, "")}
                <span style={{ marginLeft: "auto", fontSize: "0.75rem", opacity: 0.7 }}>{topicos.filter(t => !t.removido && t.categoria === c.id).length}</span>
              </button>
            ))}
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "0.75rem", marginTop: "0.75rem" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" }}>Como ganhar pontos</div>
            {Object.entries(PONTOS).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", padding: "0.25rem 0", borderBottom: "1px solid var(--border)", color: "var(--text2)" }}>
                <span>{k === "presenca" ? "✅ Presença" : k === "topico" ? "💬 Criar tópico" : k === "resposta" ? "↩ Responder" : k === "curtida_recebida" ? "❤️ Curtida" : k === "topico_destaque" ? "⭐ Destaque" : "🎯 Bônus"}</span>
                <span style={{ fontWeight: 700, color: "var(--navy)" }}>+{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div>
          <input className="search-input" placeholder="Buscar tópicos..." value={busca} onChange={e => setBusca(e.target.value)} style={{ width: "100%", marginBottom: "1rem" }} />
          {topicosFiltrados.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text3)", background: "var(--surface)", borderRadius: "var(--radius)", border: "1px dashed var(--border2)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>💬</div>
              <p>Nenhum tópico. {podePostar && "Crie o primeiro!"}</p>
            </div>
          ) : topicosFiltrados.map(t => {
            const cat = CATEGORIAS_FORUM.find(c => c.id === t.categoria);
            return (
              <div key={t.id} className={`topico-card${t.fixado ? " fixado" : t.destaque ? " destaque" : ""}`} onClick={() => setTopicoAberto(t)}>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  {cat && <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.55rem", borderRadius: 50, background: cat.cor + "18", color: cat.cor }}>{cat.label}</span>}
                  {t.fixado && <span style={{ fontSize: "0.7rem", color: "var(--warn)" }}>📌</span>}
                  {t.destaque && <span style={{ fontSize: "0.7rem", color: "var(--teal)" }}>⭐</span>}
                </div>
                <div className="topico-titulo">{t.titulo}</div>
                <p style={{ fontSize: "0.83rem", color: "var(--text2)", lineHeight: 1.5, margin: "0.35rem 0 0.6rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{t.corpo}</p>
                <div className="topico-meta">
                  <RoleBadge role={t.autor_role} /> <span>{t.autor_nome}</span>
                  <span>·</span><span>{timeAgo(t.created_at)}</span>
                  <span>·</span><span>❤️ {t.curtidas.length}</span>
                  <span>·</span><span>💬 {t.respostas.length}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
