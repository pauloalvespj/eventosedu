import { useState, useEffect, useRef, forwardRef } from "react";
import { PONTOS } from "../../config/gamificacao";
import { TIPO_BG, TIPO_COLOR, TIPO_ICON, TIPO_LABEL, ROLE_LABEL } from "../../utils/helpers";
export { AvatarUpload } from "./AvatarUpload";
export { DatePickerInput } from "./DatePickerInput";

// ── Toast ─────────────────────────────────────────────────────
export function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast toast-${toast.type}`}>{toast.msg}</div>;
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ show, onClose, title, children, wide }) {
  if (!show) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 720 } : undefined}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── ProgressBar ───────────────────────────────────────────────
export function ProgressBar({ pct, minimo }) {
  const cls = pct >= minimo ? "" : pct >= minimo * 0.7 ? " warn" : " danger";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
        <span style={{ color: "var(--text2)" }}>Progresso</span>
        <span style={{ fontWeight: 700, color: pct >= minimo ? "var(--success)" : "var(--danger)" }}>{pct}%</span>
      </div>
      <div className="progress-bar">
        <div className={`progress-fill${cls}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--text3)", marginTop: "4px" }}>Mínimo exigido: {minimo}%</div>
    </div>
  );
}

// ── StarRating ────────────────────────────────────────────────
export function StarRating({ value, onChange, size = 28, readonly = false }) {
  const [hover, setHover] = useState(0);
  const LABELS = ["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"];
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onClick={() => !readonly && onChange && onChange(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          style={{
            fontSize: size,
            cursor: readonly ? "default" : "pointer",
            color: (hover || value) >= n ? "#c9a84c" : "#ddd",
            transition: "color 0.15s, transform 0.1s",
            transform: !readonly && hover === n ? "scale(1.2)" : "scale(1)",
            display: "inline-block",
            userSelect: "none",
          }}
        >★</span>
      ))}
      {!readonly && (hover || value) > 0 && (
        <span style={{ fontSize: "0.82rem", color: "var(--gold)", fontWeight: 700, marginLeft: 6 }}>
          {LABELS[hover || value]}
        </span>
      )}
    </div>
  );
}

// ── AvaliacaoWidget ───────────────────────────────────────────
export function AvaliacaoWidget({ atividadeId, participanteId, avaliacoes, setAvaliacoes, pontuacoes, setPontuacoes }) {
  const jaAvaliou = avaliacoes.find(a => a.atividade_id === atividadeId && a.participante_id === participanteId);
  const [estrelas, setEstrelas] = useState(jaAvaliou?.estrelas || 0);
  const [comentario, setComentario] = useState(jaAvaliou?.comentario || "");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(!!jaAvaliou);

  function salvar() {
    if (!estrelas) return;
    setSalvando(true);
    setTimeout(() => {
      if (jaAvaliou) {
        setAvaliacoes(prev => prev.map(a =>
          a.atividade_id === atividadeId && a.participante_id === participanteId
            ? { ...a, estrelas, comentario, created_at: new Date().toISOString() } : a
        ));
      } else {
        setAvaliacoes(prev => [...prev, {
          id: Date.now(), participante_id: participanteId, atividade_id: atividadeId,
          estrelas, comentario, created_at: new Date().toISOString()
        }]);
        setPontuacoes(prev => [...prev, {
          id: Date.now() + 1, user_id: `participante:${participanteId}`,
          tipo: "avaliacao", valor: PONTOS.avaliacao,
          desc: "Avaliação de palestra", created_at: new Date().toISOString()
        }]);
      }
      setSalvo(true);
      setSalvando(false);
    }, 400);
  }

  if (salvo && !salvando) return (
    <div style={{ marginTop: "0.75rem", padding: "0.75rem 1rem", background: "var(--gold-pale)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
      <div>
        <div style={{ fontSize: "0.78rem", color: "var(--warn)", fontWeight: 700, marginBottom: "0.2rem" }}>Sua avaliação</div>
        <StarRating value={estrelas} readonly size={18} />
        {comentario && <div style={{ fontSize: "0.8rem", color: "var(--text2)", marginTop: "0.2rem", fontStyle: "italic" }}>"{comentario}"</div>}
      </div>
      <button className="btn btn-sm btn-outline" style={{ fontSize: "0.75rem" }} onClick={() => setSalvo(false)}>Editar</button>
    </div>
  );

  return (
    <div style={{ marginTop: "0.75rem", padding: "0.85rem 1rem", background: "var(--surface2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--navy)", marginBottom: "0.6rem" }}>
        ⭐ Avalie esta atividade
        {!jaAvaliou && <span style={{ fontSize: "0.72rem", color: "var(--teal)", fontWeight: 600, marginLeft: 8 }}>+{PONTOS.avaliacao} pts</span>}
      </div>
      <StarRating value={estrelas} onChange={setEstrelas} size={26} />
      {estrelas > 0 && (
        <div style={{ marginTop: "0.6rem" }}>
          <textarea
            className="form-input"
            rows={2}
            placeholder="Comentário opcional... (max 200 caracteres)"
            maxLength={200}
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            style={{ fontSize: "0.85rem", resize: "none", marginBottom: "0.5rem" }}
          />
          <button className="btn btn-primary btn-sm" onClick={salvar} disabled={salvando || !estrelas}>
            {salvando ? "Salvando..." : "Enviar avaliação"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── QRCodeCanvas ──────────────────────────────────────────────
// QR Code gerado localmente via canvas — usa qrcode-generator via CDN
export const QRCodeCanvas = forwardRef(function QRCodeCanvas({ value, size = 200 }, externalRef) {
  const internalRef = useRef(null);
  const canvasRef = externalRef || internalRef;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    function drawQR() {
      try {
        // @ts-ignore
        const qr = window.qrcode(0, "M");
        qr.addData(value);
        qr.make();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        const moduleCount = qr.getModuleCount();
        const cellSize = Math.floor(size / moduleCount);
        const offset = Math.floor((size - cellSize * moduleCount) / 2);
        canvas.width = size;
        canvas.height = size;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--navy").trim() || "#0f3460";
        for (let row = 0; row < moduleCount; row++) {
          for (let col = 0; col < moduleCount; col++) {
            if (qr.isDark(row, col)) {
              ctx.fillRect(offset + col * cellSize, offset + row * cellSize, cellSize, cellSize);
            }
          }
        }
        setReady(true);
      } catch (e) {
        setError(true);
      }
    }

    if (window.qrcode) {
      drawQR();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
      script.onload = () => drawQR();
      script.onerror = () => setError(true);
      document.head.appendChild(script);
    }
  }, [value, size]);

  if (error) {
    return (
      <div style={{ width: size, height: size, border: "3px solid var(--navy)", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff", padding: "1rem", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📱</div>
        <div style={{ fontSize: "0.7rem", fontFamily: "monospace", color: "var(--navy)", wordBreak: "break-all", lineHeight: 1.4 }}>{value}</div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ border: "3px solid var(--navy)", borderRadius: 8, display: "block", opacity: ready ? 1 : 0, transition: "opacity 0.3s" }}
    />
  );
});

// ── TipoBadge ─────────────────────────────────────────────────
export function TipoBadge({ tipo }) {
  const t = tipo || "palestra";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.18rem 0.6rem", borderRadius: 50, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", background: TIPO_BG[t] || "#eee", color: TIPO_COLOR[t] || "#333" }}>
      {TIPO_ICON[t]} {TIPO_LABEL[t] || t}
    </span>
  );
}

// ── AvatarMini ────────────────────────────────────────────────
export function AvatarMini({ nome, role }) {
  const colors = { super_admin: ["#b03030", "#faeaea"], admin: ["#0f3460", "#e8f0fb"], credenciador: ["#1d6a6a", "#e1f3f3"], palestrante: ["#9a7a20", "#fdf8ee"], participante: ["#0f3460", "#e8f0fb"] };
  const [bg] = colors[role] || colors.participante;
  const ini = (nome || "?").split(" ").map(n => n[0]).slice(0, 2).join("");
  return <div className="avatar-mini" style={{ background: bg + "22", color: bg, border: `1.5px solid ${bg}40` }}>{ini}</div>;
}

// ── RoleBadge ─────────────────────────────────────────────────
export function RoleBadge({ role }) {
  const cfg = { super_admin: ["👑", "danger"], admin: ["🔧", "navy"], credenciador: ["🏷", "teal"], palestrante: ["🎤", "gold"], participante: ["👤", "navy"] };
  const [ic, c] = cfg[role] || ["👤", "navy"];
  return <span className={`badge badge-${c}`} style={{ fontSize: "0.68rem" }}>{ic} {ROLE_LABEL[role] || role}</span>;
}

// ── PtsFloat ──────────────────────────────────────────────────
export function PtsFloat({ pts, x, y }) {
  return <div className="pts-float" style={{ left: x, top: y }}>+{pts} pts</div>;
}

// ── IconEdit ──────────────────────────────────────────────────
export function IconEdit({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display:"inline-block", verticalAlign:"middle" }}>
      <path d="M11.5 1.5a1.414 1.414 0 0 1 2 2L5 12H3v-2L11.5 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 14h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
