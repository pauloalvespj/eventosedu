import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faFloppyDisk, faFileLines, faLocationDot, faBuilding, faFileAlt } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { formatData } from "../../../utils/helpers";
import { atualizarEvento } from "../../../lib/db";

export function Evento() {
  const { event, setEvent, showToast } = useAdmin();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function iniciarEdicao() { setForm({ ...event }); setEditando(true); }
  function salvar() { setEvent(form); setEditando(false); atualizarEvento(event.id, form); showToast("Evento atualizado!", "success"); }
  function cancelar() { setEditando(false); }

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Dados do Evento</h1><p>Configurações gerais</p></div>
        {!editando
          ? <button className="btn btn-primary" onClick={iniciarEdicao}><FontAwesomeIcon icon={faPenToSquare} style={{ marginRight: 6 }} />Editar</button>
          : <div style={{ display:"flex", gap:"0.5rem" }}>
              <button className="btn btn-outline" onClick={cancelar}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar}><FontAwesomeIcon icon={faFloppyDisk} style={{ marginRight: 6 }} />Salvar</button>
            </div>
        }
      </div>

      {!editando ? (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem" }}>
          <div style={{ gridColumn:"1/-1", background:"linear-gradient(135deg,#0a1f40,#0f3460)", borderRadius:"var(--radius-lg)", padding:"2rem", color:"#fff" }}>
            <div style={{ fontSize:"0.72rem", letterSpacing:"0.12em", textTransform:"uppercase", color:"rgba(255,255,255,0.45)", marginBottom:"0.5rem" }}>Evento</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.6rem", color:"var(--gold-light)", marginBottom:"0.35rem" }}>{event.nome}</h2>
            <p style={{ fontSize:"0.95rem", color:"rgba(255,255,255,0.7)", marginBottom:"1rem", lineHeight:1.5 }}>{event.subtitulo}</p>
            <div style={{ display:"flex", gap:"2rem", flexWrap:"wrap" }}>
              <div><div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.4)", marginBottom:2 }}>Período</div><div style={{ fontWeight:600 }}>{formatData(event.data_inicio)} – {formatData(event.data_fim)}</div></div>
              <div><div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.4)", marginBottom:2 }}>Local</div><div style={{ fontWeight:600 }}>{event.local}</div></div>
              <div><div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.4)", marginBottom:2 }}>Mín. presença</div><div style={{ fontWeight:600 }}>{event.percentual_minimo}%</div></div>
              <div><div style={{ fontSize:"0.7rem", color:"rgba(255,255,255,0.4)", marginBottom:2 }}>Carga horária</div><div style={{ fontWeight:600 }}>{event.carga_horaria_total}h</div></div>
            </div>
          </div>
          {[
            [<><FontAwesomeIcon icon={faFileLines} style={{ marginRight: 6 }} />Nome Completo</>, event.nome_completo],
            [<><FontAwesomeIcon icon={faLocationDot} style={{ marginRight: 6 }} />Endereço</>, event.endereco],
            [<><FontAwesomeIcon icon={faBuilding} style={{ marginRight: 6 }} />Realização</>, event.realizacao],
          ].map(([k, v], i) => (
            <div key={i} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"1.25rem" }}>
              <div style={{ fontSize:"0.72rem", fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"0.5rem" }}>{k}</div>
              <div style={{ color:"var(--text)", fontSize:"0.9rem", lineHeight:1.6 }}>{v || <span style={{ color:"var(--text3)" }}>–</span>}</div>
            </div>
          ))}
          <div style={{ gridColumn:"1/-1", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"1.25rem" }}>
            <div style={{ fontSize:"0.72rem", fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"0.5rem" }}><FontAwesomeIcon icon={faFileAlt} style={{ marginRight: 6 }} />Descrição / Objetivo</div>
            <div style={{ color:"var(--text2)", fontSize:"0.9rem", lineHeight:1.75 }}>{event.descricao}</div>
          </div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem" }}>
          {[
            ["Nome curto", "nome", "text"],
            ["Nome Completo", "nome_completo", "text"],
          ].map(([l, k]) => (
            <div key={k} className="form-group" style={{ gridColumn:"1/-1" }}>
              <label className="form-label">{l}</label>
              <input className="form-input" value={form[k]||""} onChange={e => set(k, e.target.value)} />
            </div>
          ))}
          <div className="form-group" style={{ gridColumn:"1/-1" }}>
            <label className="form-label">Subtítulo / Tema</label>
            <input className="form-input" value={form.subtitulo||""} onChange={e => set("subtitulo", e.target.value)} />
          </div>
          <div className="form-group"><label className="form-label">Data Início</label><input type="date" className="form-input" value={form.data_inicio||""} onChange={e => set("data_inicio", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Data Fim</label><input type="date" className="form-input" value={form.data_fim||""} onChange={e => set("data_fim", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Percentual Mínimo (%)</label><input type="number" className="form-input" min={0} max={100} value={form.percentual_minimo||""} onChange={e => set("percentual_minimo", Number(e.target.value))} /></div>
          <div className="form-group"><label className="form-label">Carga Horária Total (h)</label><input type="number" className="form-input" min={1} value={form.carga_horaria_total||""} onChange={e => set("carga_horaria_total", Number(e.target.value))} /></div>
          <div className="form-group" style={{ gridColumn:"1/-1" }}><label className="form-label">Local</label><input className="form-input" value={form.local||""} onChange={e => set("local", e.target.value)} /></div>
          <div className="form-group" style={{ gridColumn:"1/-1" }}><label className="form-label">Endereço</label><input className="form-input" value={form.endereco||""} onChange={e => set("endereco", e.target.value)} /></div>
          <div className="form-group" style={{ gridColumn:"1/-1" }}><label className="form-label">Realização</label><textarea className="form-input" rows={2} value={form.realizacao||""} onChange={e => set("realizacao", e.target.value)} /></div>
          <div className="form-group" style={{ gridColumn:"1/-1" }}><label className="form-label">Descrição / Objetivo</label><textarea className="form-input" rows={4} value={form.descricao||""} onChange={e => set("descricao", e.target.value)} /></div>
        </div>
      )}
    </div>
  );
}
