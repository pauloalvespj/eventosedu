import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare, faFloppyDisk, faFileLines, faLocationDot, faBuilding, faFileAlt } from "@fortawesome/free-solid-svg-icons";
import { useAdmin } from "./AdminContext";
import { DatePickerInput } from "../../base/index";
import { formatData } from "../../../utils/helpers";
import { atualizarEvento } from "../../../lib/db";
import { PRESETS, applyTheme, isLightHex } from "../../../lib/themes";

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

// ── Seletor de tema ───────────────────────────────────────────
function ThemeSelector({ value, onChange }) {
  const presetId = value?.preset || "azul";
  const [customHero,   setCustomHero]   = useState(value?.hero   || "#0d1f3c");
  const [customAccent, setCustomAccent] = useState(value?.accent || "#c4a050");

  function selectPreset(id) {
    onChange({ preset: id });
    applyTheme({ preset: id });
  }

  function applyCustom(hero, accent) {
    const mode = isLightHex(hero) ? "light" : "dark";
    const tema = { preset: "custom", hero, accent, mode };
    onChange(tema);
    applyTheme(tema);
  }

  function openCustom() {
    if (presetId !== "custom") applyCustom(customHero, customAccent);
  }

  const isCustom = presetId === "custom";

  const swatchBtn = (sel, onClick, children, title) => (
    <button onClick={onClick} title={title}
      style={{
        display:"flex", flexDirection:"column", alignItems:"center", gap:5,
        padding:6, border: sel ? "2px solid var(--navy)" : "2px solid var(--border)",
        borderRadius:10, cursor:"pointer", background: sel ? "var(--surface2)" : "transparent",
        width:68, flexShrink:0,
      }}
    >
      {children}
    </button>
  );

  return (
    <div>
      {/* ── Swatches ── */}
      <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap", marginBottom: isCustom ? "0.85rem" : 0 }}>
        {PRESETS.map(p => {
          const sel = presetId === p.id;
          const textOnHero = p.mode === "light" ? "rgba(20,24,40,0.25)" : "rgba(255,255,255,0.30)";
          return swatchBtn(sel, () => selectPreset(p.id), (
            <>
              <div style={{ width:56, height:44, background:p.hero, borderRadius:8, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", gap:5 }}>
                <div style={{ width:32, height:3, background:textOnHero, borderRadius:2 }}/>
                <div style={{ width:24, height:4, background:p.accent, borderRadius:2 }}/>
              </div>
              <span style={{ fontSize:"0.58rem", color: sel ? "var(--navy)" : "var(--text3)", fontWeight: sel ? 700 : 500, textAlign:"center", lineHeight:1.2 }}>{p.label}</span>
            </>
          ), p.label);
        })}

        {/* Botão personalizado */}
        {swatchBtn(isCustom, openCustom, (
          <>
            <div style={{ width:56, height:44, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", border:"1.5px dashed var(--border2)" }}>
              <span style={{ fontSize:"1.5rem", color:"var(--text3)", lineHeight:1 }}>+</span>
            </div>
            <span style={{ fontSize:"0.58rem", color: isCustom ? "var(--navy)" : "var(--text3)", fontWeight: isCustom ? 700 : 500 }}>Personalizado</span>
          </>
        ), "Personalizado")}
      </div>

      {/* ── Pickers do tema personalizado ── */}
      {isCustom && (
        <div style={{ display:"flex", gap:"1.5rem", alignItems:"center", flexWrap:"wrap", padding:"0.9rem 1rem", background:"var(--surface2)", borderRadius:"var(--radius)", border:"1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize:"0.65rem", fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>Fundo</div>
            <input type="color" value={customHero}
              onChange={e => { setCustomHero(e.target.value); applyCustom(e.target.value, customAccent); }}
              style={{ width:44, height:34, border:"1px solid var(--border)", cursor:"pointer", borderRadius:6, padding:2 }}
            />
          </div>
          <div>
            <div style={{ fontSize:"0.65rem", fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:5 }}>Destaque</div>
            <input type="color" value={customAccent}
              onChange={e => { setCustomAccent(e.target.value); applyCustom(customHero, e.target.value); }}
              style={{ width:44, height:34, border:"1px solid var(--border)", cursor:"pointer", borderRadius:6, padding:2 }}
            />
          </div>
          {/* Mini prévia */}
          <div style={{ flex:1, minWidth:140, background:customHero, borderRadius:"var(--radius)", padding:"0.65rem 1rem" }}>
            {(() => {
              const r = parseInt(customAccent.slice(1,3),16);
              const g = parseInt(customAccent.slice(3,5),16);
              const b = parseInt(customAccent.slice(5,7),16);
              const textColor = isLightHex(customHero) ? "rgba(20,24,40,0.55)" : "rgba(255,255,255,0.55)";
              return (
                <>
                  <div style={{ fontSize:"0.52rem", letterSpacing:"0.12em", textTransform:"uppercase", color:`rgba(${r},${g},${b},0.85)`, marginBottom:3 }}>Prévia</div>
                  <div style={{ color:customAccent, fontWeight:700, fontSize:"0.88rem", marginBottom:2 }}>Nome do Evento</div>
                  <div style={{ color:textColor, fontSize:"0.7rem" }}>Subtítulo / tema aqui</div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export function Evento() {
  const { event, setEvent, showToast } = useAdmin();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function iniciarEdicao() { setForm({ ...event }); setEditando(true); }
  function salvar() { setEvent(form); setEditando(false); atualizarEvento(event.id, form); showToast("Evento atualizado!", "success"); }
  function cancelar() { setEditando(false); applyTheme(event.tema); }

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
            {/* Bloco tema + inscrições */}
            <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
            {(() => {
              const t = event.tema;
              const preset = t?.preset || "azul";
              const p = PRESETS.find(x => x.id === preset);
              const label = preset === "custom" ? "Personalizado" : (p?.label || "Azul");
              const hero  = preset === "custom" ? (t?.hero   || "#0d1f3c") : (p?.hero   || "#0d1f3c");
              const acct  = preset === "custom" ? (t?.accent || "#c4a050") : (p?.accent || "#c4a050");
              return (
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:28, height:22, background:hero, borderRadius:5, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ width:14, height:3, background:acct, borderRadius:2 }}/>
                  </div>
                  <span style={{ fontSize:"0.72rem", color:"var(--white-mid)" }}>{label}</span>
                </div>
              );
            })()}
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

          {/* ── Tema visual — linha inteira abaixo do grid ── */}
          <div style={{ gridColumn:"1/-1", marginTop:"0.25rem" }}>
            <div style={{ ...LABEL, marginBottom:"0.85rem" }}>Tema Visual</div>
            <ThemeSelector value={form.tema} onChange={v => set("tema", v)} />
          </div>
        </div>
      )}
    </div>
  );
}
