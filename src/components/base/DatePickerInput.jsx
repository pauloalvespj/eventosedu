import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

// ISO "2026-09-15" → "15/09/2026"
function isoToBR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

// "15/09/2026" → "2026-09-15"  (retorna "" se inválido)
function brToISO(br) {
  const match = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  const [, d, m, y] = match;
  const date = new Date(`${y}-${m}-${d}`);
  if (isNaN(date.getTime())) return "";
  return `${y}-${m}-${d}`;
}

// Aplica máscara dd/mm/yyyy enquanto o usuário digita
function applyMask(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = "";
  if (digits.length > 0) out += digits.slice(0, 2);
  if (digits.length > 2) out += "/" + digits.slice(2, 4);
  if (digits.length > 4) out += "/" + digits.slice(4, 8);
  return out;
}

function parseISO(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}
function toISO({ year, month, day }) {
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

export function DatePickerInput({ label, value, onChange, placeholder = "dd/mm/aaaa" }) {
  const [text, setText]   = useState(isoToBR(value));
  const [open, setOpen]   = useState(false);
  const [view, setView]   = useState(() => {
    const p = parseISO(value);
    const n = new Date();
    return { year: p?.year ?? n.getFullYear(), month: p?.month ?? n.getMonth() + 1 };
  });
  const ref      = useRef();
  const inputRef = useRef();

  // Sincroniza text quando value muda externamente
  useEffect(() => {
    setText(isoToBR(value));
  }, [value]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Digitação livre com máscara
  function handleTextChange(e) {
    const masked = applyMask(e.target.value);
    setText(masked);
    const iso = brToISO(masked);
    if (iso) {
      onChange(iso);
      // Atualiza view do calendário para o mês digitado
      const p = parseISO(iso);
      if (p) setView({ year: p.year, month: p.month });
    } else if (masked === "") {
      onChange("");
    }
  }

  // Abre calendário pelo ícone
  function handleCalendarToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!open) {
      const p = parseISO(value);
      const n = new Date();
      setView({ year: p?.year ?? n.getFullYear(), month: p?.month ?? n.getMonth() + 1 });
    }
    setOpen(o => !o);
  }

  // Seleciona dia no calendário
  function selectDay(iso) {
    onChange(iso);
    setText(isoToBR(iso));
    setOpen(false);
    inputRef.current?.focus();
  }

  function prevMes() {
    setView(v => v.month === 1 ? { year: v.year - 1, month: 12 } : { ...v, month: v.month - 1 });
  }
  function nextMes() {
    setView(v => v.month === 12 ? { year: v.year + 1, month: 1 } : { ...v, month: v.month + 1 });
  }

  function buildDias() {
    const firstDow = new Date(view.year, view.month - 1, 1).getDay();
    const total    = new Date(view.year, view.month, 0).getDate();
    const cells    = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  }

  const hoje    = new Date();
  const hojeISO = toISO({ year: hoje.getFullYear(), month: hoje.getMonth() + 1, day: hoje.getDate() });
  const dias    = buildDias();

  return (
    <div ref={ref} style={{ position: "relative" }} className="form-group">
      {label && <label className="form-label">{label}</label>}

      {/* Campo com ícone */}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          className="form-input"
          value={text}
          onChange={handleTextChange}
          placeholder={placeholder}
          style={{ paddingRight: "2.4rem" }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={handleCalendarToggle}
          style={{
            position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", padding: 4,
            color: open ? "var(--navy)" : "var(--text3)",
            transition: "color 0.15s",
          }}
        >
          <FontAwesomeIcon icon={faCalendarDays} />
        </button>
      </div>

      {/* Popup calendário */}
      {open && (
        <div style={{
          position: "absolute", zIndex: 999, top: "calc(100% + 4px)", left: 0,
          background: "#fff", border: "1.5px solid var(--border)",
          borderRadius: "var(--radius)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          padding: "0.75rem", minWidth: 272,
        }}>
          {/* Navegação de mês */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
            <button type="button" onClick={prevMes}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "var(--navy)", borderRadius: "var(--radius-sm)" }}>
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--navy)" }}>
              {MESES[view.month - 1]} {view.year}
            </div>
            <button type="button" onClick={nextMes}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "var(--navy)", borderRadius: "var(--radius-sm)" }}>
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>

          {/* Cabeçalho dias da semana */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
            {DIAS_SEMANA.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 700, color: "var(--text3)", padding: "2px 0" }}>{d}</div>
            ))}
          </div>

          {/* Células dos dias */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
            {dias.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const iso   = toISO({ year: view.year, month: view.month, day: d });
              const isSel = iso === value;
              const isHoje = iso === hojeISO;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => selectDay(iso)}
                  style={{
                    textAlign: "center", padding: "6px 0", fontSize: "0.82rem", border: "none",
                    borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: isSel ? 700 : 400,
                    background: isSel ? "var(--navy)" : isHoje ? "var(--gold-tint)" : "none",
                    color: isSel ? "#fff" : isHoje ? "var(--navy)" : "var(--text)",
                    outline: isHoje && !isSel ? "1.5px solid var(--navy)" : "none",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Limpar */}
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setText(""); setOpen(false); }}
              style={{ marginTop: "0.6rem", width: "100%", background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px", fontSize: "0.78rem", color: "var(--text3)", cursor: "pointer" }}
            >
              Limpar data
            </button>
          )}
        </div>
      )}
    </div>
  );
}
