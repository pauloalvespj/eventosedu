import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faFloppyDisk, faFileLines, faLocationDot, faBuilding, faFileAlt } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { DatePickerInput } from "../../base/index";
import { formatData } from "../../../utils/helpers";
import { atualizarEvento } from "../../../lib/db";

function InscricoesStatusBadge({ event }) {
  const hoje = new Date().toISOString().split("T")[0];
  const { inscricao_inicio: ini, inscricao_fim: fim } = event;
  if (!ini && !fim) return null;
  const dot = (color) => <span style={{ width:6, height:6, borderRadius:"50%", background:color, flexShrink:0, display:"inline-block" }}/>;
  const badge = (color, bg, border, label) => (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:"0.72rem", color, background:bg, border:`1px solid ${border}`, borderRadius:50, padding:"0.2rem 0.65rem", marginTop:4 }}>
      {dot(color)}{label}
    </span>
  );
  if (ini && hoje < ini) return badge("var(--gold-on-dark)","var(--gold-tint)","var(--gold-border)",`Abre em ${formatData(ini)}`);
  if (fim && hoje > fim) return badge("#f87171","rgba(248,113,113,0.1)","rgba(248,113,113,0.3)","Encerradas");
  return badge("#4ade80","rgba(74,222,128,0.1)","rgba(74,222,128,0.3)","Abertas");
}

export function Evento() {
  const { event, setEvent, showToast } = useAdmin();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function iniciarEdicao() { setForm({ ...event }); setEditando(true); }
  function salvar() { setEvent(form); setEditando(false); atualizarEvento(event.id, form); showToast("Evento atualizado!", "success"); }
  function cancelar() { setEditando(false); }

  const LABEL = { fontSize:"0.68rem", fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"0.5rem", display:"flex", alignItems:"center", gap:6 };

  return (
    <div>
      <div className="admin-topbar">
        <div><h1>Dados do Evento</h1><p>Configurações gerais</p></div>
        {!editando
          ? <button className="btn btn-hero" onClick={iniciarEdicao}><FontAwesomeIcon icon={faPenToSquare} style={{ marginRight:6 }}/>Editar</button>
          : <div style={{ display:"flex", gap:"0.5rem" }}>
              <button className="btn btn-outline" onClick={cancelar}>Cancelar</button>
              <button className="btn btn-hero" onClick={salvar}><FontAwesomeIcon icon={faFloppyDisk} style={{ marginRight:6 }}/>Salvar</button>
            </div>
        }
      </div>

      {!editando ? (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>

          {/* ── Card Hero ── */}
          <div className="card-hero" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"2rem", flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="hero-label">Evento</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem", fontWeight:800, color:"var(--gold-on-dark)", lineHeight:1.1, marginBottom:"0.4rem" }}>{event.nome}</div>
              {event.subtitulo && <div style={{ fontSize:"0.92rem", color:"var(--white-mid)", fontStyle:"italic", marginBottom:"1.25rem", lineHeight:1.5 }}>{event.subtitulo}</div>}
              <div style={{ display:"flex", gap:"2.25rem", flexWrap:"wrap", marginTop: event.subtitulo ? 0 : "1rem" }}>
                {[
                  ["Período",        `${formatData(event.data_inicio)} – ${formatData(event.data_fim)}`],
                  ["Local",          event.local || "–"],
                  ["Carga horária",  `${event.carga_horaria_total || "–"}h`],
                  ["Mín. presença",  `${event.percentual_minimo || "–"}%`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="hero-label" style={{ marginBottom:"0.25rem" }}>{label}</div>
                    <div style={{ fontWeight:600, fontSize:"0.95rem" }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Bloco inscrições */}
            <div style={{ flexShrink:0, background:"var(--gold-tint)", border:"1px solid var(--gold-border)", borderRadius:"var(--radius)", padding:"1.1rem 1.4rem", minWidth:170 }}>
              <div className="hero-label" style={{ marginBottom:"0.4rem" }}>Inscrições</div>
              <div style={{ fontWeight:600, fontSize:"0.88rem", lineHeight:1.5 }}>
                {event.inscricao_inicio ? formatData(event.inscricao_inicio) : "–"}
                {" – "}
                {event.inscricao_fim ? formatData(event.inscricao_fim) : "–"}
              </div>
              <InscricoesStatusBadge event={event} />
            </div>
          </div>

          {/* ── Nome completo + Endereço ── */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
            <div className="card-white">
              <div style={LABEL}><FontAwesomeIcon icon={faFileLines} style={{ color:"var(--navy)" }}/>Nome Completo</div>
              <div style={{ color:"var(--text)", fontSize:"0.92rem", lineHeight:1.6 }}>{event.nome_completo || <span style={{ color:"var(--text3)" }}>–</span>}</div>
            </div>
            <div className="card-white">
              <div style={LABEL}><FontAwesomeIcon icon={faLocationDot} style={{ color:"var(--navy)" }}/>Endereço</div>
              <div style={{ color:"var(--text)", fontSize:"0.92rem", lineHeight:1.6 }}>{event.endereco || <span style={{ color:"var(--text3)" }}>–</span>}</div>
            </div>
          </div>

          {/* ── Descrição ── */}
          <div className="card-white">
            <div style={LABEL}><FontAwesomeIcon icon={faFileAlt} style={{ color:"var(--navy)" }}/>Descrição</div>
            <div style={{ color:"var(--text2)", fontSize:"0.92rem", lineHeight:1.75, minHeight:80, whiteSpace:"pre-wrap" }}>
              {event.descricao || <span style={{ color:"var(--text3)" }}>–</span>}
            </div>
          </div>

          {/* ── Realização ── */}
          <div className="card-white">
            <div style={LABEL}><FontAwesomeIcon icon={faBuilding} style={{ color:"var(--navy)" }}/>Realização</div>
            <div style={{ color:"var(--text)", fontSize:"0.92rem", lineHeight:1.75, whiteSpace:"pre-wrap" }}>
              {event.realizacao || <span style={{ color:"var(--text3)" }}>–</span>}
            </div>
          </div>

        </div>
      ) : (
        <div className="form-grid-4">
          {/* Nome curto (1 col) + Nome completo (3 cols) */}
          <div className="form-group">
            <label className="form-label">Nome curto</label>
            <input className="form-input" value={form.nome||""} onChange={e => set("nome", e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn:"span 3" }}>
            <label className="form-label">Nome Completo</label>
            <input className="form-input" value={form.nome_completo||""} onChange={e => set("nome_completo", e.target.value)} />
          </div>

          {/* Subtítulo — linha inteira */}
          <div className="form-group" style={{ gridColumn:"1/-1" }}>
            <label className="form-label">Subtítulo / Tema</label>
            <input className="form-input" value={form.subtitulo||""} onChange={e => set("subtitulo", e.target.value)} />
          </div>

          {/* Descrição logo após o subtítulo */}
          <div className="form-group" style={{ gridColumn:"1/-1" }}>
            <label className="form-label">Descrição</label>
            <textarea className="form-input" rows={8} value={form.descricao||""} onChange={e => set("descricao", e.target.value)} />
          </div>

          {/* 4 datas na mesma linha com calendário popup */}
          <DatePickerInput label="Início do Evento"      value={form.data_inicio||""}      onChange={v => set("data_inicio", v)} />
          <DatePickerInput label="Fim do Evento"         value={form.data_fim||""}         onChange={v => set("data_fim", v)} />
          <DatePickerInput label="Início das Inscrições" value={form.inscricao_inicio||""} onChange={v => set("inscricao_inicio", v)} />
          <DatePickerInput label="Fim das Inscrições"    value={form.inscricao_fim||""}    onChange={v => set("inscricao_fim", v)} />

          {/* Percentual e Carga horária */}
          <div className="form-group" style={{ gridColumn:"span 2" }}>
            <label className="form-label">Percentual Mínimo (%)</label>
            <input type="number" className="form-input" min={0} max={100} value={form.percentual_minimo||""} onChange={e => set("percentual_minimo", Number(e.target.value))} />
          </div>
          <div className="form-group" style={{ gridColumn:"span 2" }}>
            <label className="form-label">Carga Horária Total (h)</label>
            <input type="number" className="form-input" min={1} value={form.carga_horaria_total||""} onChange={e => set("carga_horaria_total", Number(e.target.value))} />
          </div>

          {/* Local (2 cols) + Endereço (2 cols) na mesma linha */}
          <div className="form-group" style={{ gridColumn:"span 2" }}>
            <label className="form-label">Local</label>
            <input className="form-input" value={form.local||""} onChange={e => set("local", e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn:"span 2" }}>
            <label className="form-label">Endereço</label>
            <input className="form-input" value={form.endereco||""} onChange={e => set("endereco", e.target.value)} />
          </div>

          <div className="form-group" style={{ gridColumn:"1/-1" }}>
            <label className="form-label">Realização</label>
            <textarea className="form-input" rows={2} value={form.realizacao||""} onChange={e => set("realizacao", e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}
