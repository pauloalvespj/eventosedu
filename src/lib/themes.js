/**
 * ENAUDIN — Sistema de temas visuais
 *
 * Cada tema define hero (fundo dos cards escuros) e accent (cor de destaque).
 * mode:'dark' → texto branco/dourado; mode:'light' → texto escuro.
 * overrides: CSS vars adicionais aplicadas após a lógica principal (por preset).
 */

export const PRESETS = [
  { id: "azul",     label: "Azul",           hero: "#234c82", accent: "#c4a050", mode: "dark"  },
  { id: "verde",    label: "Verde",           hero: "#0a2416", accent: "#6ec47e", mode: "dark"  },
  { id: "roxo",     label: "Roxo",            hero: "#1c0b32", accent: "#a87ec8", mode: "dark"  },
  { id: "vermelho", label: "Vermelho escuro", hero: "#2e0808", accent: "#d4806a", mode: "dark"  },
  {
    id: "verde_claro", label: "Cinza com Verde", hero: "#F0F2F5", accent: "#31606f", mode: "light",
    sec_defaults: { sec1_bg: "#F0F2F5", sec2_bg: "#E8EDF2", sec3_bg: "#31606f" },
    overrides: {
      "--hero-gradient":     "linear-gradient(135deg,#E8EDF2 0%,#F5F7FA 100%)",
      "--hero-subtext":      "#31606f",
      "--hero-quote-bg":     "#31606f",
      "--hero-quote-border": "#31606f",
      "--hero-quote-color":  "#ffffff",
      "--nav-hover-color":   "#31606f",
      "--section-label":     "#31606f",
      "--teal":              "#31606f",
      "--teal-light":        "#4A7F92",
      "--gold":              "#C9A227",
      "--gold-light":        "#D4AB30",
      "--gold-pale":         "#FDF6E4",
      "--gold-tint":         "rgba(49,96,111,0.10)",
      "--gold-border":       "rgba(49,96,111,0.24)",
      "--gold-divider":      "rgba(49,96,111,0.16)",
      "--warn":              "#7A5500",
      "--bg":                "#F0F2F5",
      "--surface2":          "#E8EDF2",
      "--border":            "#D0D8E0",
      "--border2":           "#B8C4D0",
    },
  },
  {
    id: "cinza", label: "Cinza com Azul", hero: "#F0F2F5", accent: "#234c82", mode: "light",
    sec_defaults: { sec1_bg: "#F0F2F5", sec2_bg: "#E8EDF2", sec3_bg: "#234c82" },
    overrides: {
      "--hero-gradient":     "linear-gradient(135deg,#E8EDF2 0%,#F5F7FA 100%)",
      "--hero-subtext":      "#234c82",
      "--hero-quote-bg":     "#234c82",
      "--hero-quote-border": "#234c82",
      "--hero-quote-color":  "#ffffff",
      "--nav-hover-color":   "#234c82",
      "--section-label":     "#234c82",
      "--teal":              "#234c82",
      "--teal-light":        "#3365a6",
      "--gold":              "#C9A227",
      "--gold-light":        "#D4AB30",
      "--gold-pale":         "#FDF6E4",
      "--gold-tint":         "rgba(35,76,130,0.10)",
      "--gold-border":       "rgba(35,76,130,0.24)",
      "--gold-divider":      "rgba(35,76,130,0.16)",
      "--warn":              "#7A5500",
      "--bg":                "#F0F2F5",
      "--surface2":          "#E8EDF2",
      "--border":            "#D0D8E0",
      "--border2":           "#B8C4D0",
    },
  },
];

/** Retorna true se a cor hex for percebida como clara (luminância > 0.5) */
export function isLightHex(hex) {
  if (!hex || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.5;
}

// Vars estáticas do CSS root que precisam ser resetadas ao trocar de tema
// (garante que override de um preset não vaze para o próximo)
const STATIC_DEFAULTS = {
  "--teal":         "#1d6a6a",
  "--teal-light":   "#2a8a8a",
  "--gold":         "#c9a84c",
  "--gold-light":   "#e8c96a",
  "--gold-pale":    "#fdf8ee",
  "--warn":         "#a07020",
  "--bg":           "#f7f6f2",
  "--surface2":     "#f0eff9",
  "--border":       "#e2e0f0",
  "--border2":      "#c8c6e0",
};

/**
 * Aplica um tema ao :root via CSS custom properties.
 * tema pode ser:
 *   null / undefined          → azul (padrão)
 *   { preset: "verde" }       → preset nomeado
 *   { preset: "custom", hero, accent, mode } → personalizado
 */
export function applyTheme(tema, { persist = true } = {}) {
  const root = document.documentElement;
  if (persist && tema) {
    try { localStorage.setItem("enaudin_tema", JSON.stringify(tema)); } catch {}
  }

  let cfg;
  if (!tema?.preset || tema.preset === "azul") {
    cfg = PRESETS[0];
  } else if (tema.preset === "custom") {
    cfg = {
      hero:   tema.hero   || "#0d1f3c",
      accent: tema.accent || "#c4a050",
      mode:   tema.mode   || (isLightHex(tema.hero || "") ? "light" : "dark"),
    };
  } else {
    cfg = PRESETS.find(p => p.id === tema.preset) || PRESETS[0];
  }

  const { hero, accent, mode } = cfg;

  // Extrai RGB do accent para rgba()
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);

  // Variantes escura/clara do hero para gradiente e hover
  const hr = parseInt(hero.slice(1, 3), 16);
  const hg = parseInt(hero.slice(3, 5), 16);
  const hb = parseInt(hero.slice(5, 7), 16);
  const toHex = n => n.toString(16).padStart(2, "0");
  const heroDark    = `#${toHex(Math.max(0, Math.round(hr*0.70)))}${toHex(Math.max(0, Math.round(hg*0.70)))}${toHex(Math.max(0, Math.round(hb*0.75)))}`;
  const heroLighter = `#${toHex(Math.min(255, Math.round(hr*1.30+8)))}${toHex(Math.min(255, Math.round(hg*1.30+8)))}${toHex(Math.min(255, Math.round(hb*1.25+5)))}`;

  root.style.setProperty("--hero",          hero);
  root.style.setProperty("--hero-dark",     heroDark);
  root.style.setProperty("--nav-bg",        `rgba(${hr},${hg},${hb},0.97)`);
  root.style.setProperty("--hero-gradient", `linear-gradient(135deg,${heroDark} 0%,${hero} 50%,${heroLighter} 100%)`);

  // --navy e variantes
  if (mode === "light") {
    const navDark  = `#${toHex(Math.max(0,Math.round(r*0.70)))}${toHex(Math.max(0,Math.round(g*0.70)))}${toHex(Math.max(0,Math.round(b*0.75)))}`;
    const navLight = `#${toHex(Math.min(255,Math.round(r*1.35+10)))}${toHex(Math.min(255,Math.round(g*1.35+10)))}${toHex(Math.min(255,Math.round(b*1.30+8)))}`;
    root.style.setProperty("--navy",       accent);
    root.style.setProperty("--navy-dark",  navDark);
    root.style.setProperty("--navy-light", navLight);
  } else {
    root.style.setProperty("--navy",       hero);
    root.style.setProperty("--navy-dark",  heroDark);
    root.style.setProperty("--navy-light", heroLighter);
  }

  // Sombras
  const sr = mode === "light" ? r : hr;
  const sg = mode === "light" ? g : hg;
  const sb = mode === "light" ? b : hb;
  root.style.setProperty("--shadow",    `0 2px 16px rgba(${sr},${sg},${sb},0.08)`);
  root.style.setProperty("--shadow-lg", `0 8px 40px rgba(${sr},${sg},${sb},0.13)`);

  // Gold / accent vars
  root.style.setProperty("--gold-on-dark",  accent);
  root.style.setProperty("--gold-label",    `rgba(${r},${g},${b},0.90)`);
  root.style.setProperty("--gold-tint",     `rgba(${r},${g},${b},0.12)`);
  root.style.setProperty("--gold-border",   `rgba(${r},${g},${b},0.28)`);
  root.style.setProperty("--gold-divider",  `rgba(${r},${g},${b},0.20)`);
  root.style.setProperty("--color-primary",     accent);
  root.style.setProperty("--color-primary-rgb", `${r},${g},${b}`);

  // Texto em fundo escuro/claro
  if (mode === "light") {
    root.style.setProperty("--white-hi",    "rgba(20,24,40,0.87)");
    root.style.setProperty("--white-mid",   "rgba(20,24,40,0.62)");
    root.style.setProperty("--white-low",   "rgba(20,24,40,0.44)");
    root.style.setProperty("--white-faint", "rgba(20,24,40,0.18)");
  } else {
    root.style.setProperty("--white-hi",    "rgba(255,255,255,0.90)");
    root.style.setProperty("--white-mid",   "rgba(255,255,255,0.65)");
    root.style.setProperty("--white-low",   "rgba(255,255,255,0.45)");
    root.style.setProperty("--white-faint", "rgba(255,255,255,0.25)");
  }

  // ── Vars adicionais para elementos do hero e navbar ──────────
  // Subtexto do hero (nome_completo, etc.)
  root.style.setProperty("--hero-subtext",      mode === "light" ? "rgba(20,24,40,0.72)" : "rgba(255,255,255,0.75)");
  // Badge/quote do subtítulo no hero
  root.style.setProperty("--hero-quote-bg",     `rgba(${r},${g},${b},0.15)`);
  root.style.setProperty("--hero-quote-border", `rgba(${r},${g},${b},0.40)`);
  root.style.setProperty("--hero-quote-color",  mode === "light" ? accent : "#e8c96a");
  // Hover dos links da navbar
  root.style.setProperty("--nav-hover-color",   mode === "light" ? accent : "#e8c96a");
  // Labels de seção (Agenda, Sobre, etc.)
  root.style.setProperty("--section-label",     mode === "light" ? accent : `rgba(${r},${g},${b},0.85)`);

  // ── Reset de vars estáticas (evita vazamento entre presets) ──
  for (const [k, v] of Object.entries(STATIC_DEFAULTS)) root.style.setProperty(k, v);

  // ── Overrides específicos do preset ──────────────────────────
  if (cfg.overrides) {
    for (const [k, v] of Object.entries(cfg.overrides)) root.style.setProperty(k, v);
  }

  // ── Cores das seções (configuráveis pelo admin, aplicadas por último) ──
  // sec_defaults do preset tem prioridade sobre o genérico; config do admin tem prioridade sobre tudo
  const sd = cfg.sec_defaults || {};
  const defaultSec1 = sd.sec1_bg || "#ffffff";
  const defaultSec2 = sd.sec2_bg || cfg.overrides?.["--surface2"] || STATIC_DEFAULTS["--surface2"];
  const defaultSec3 = sd.sec3_bg || "#0097b2";
  const sec3Bg = tema?.sec3_bg ?? defaultSec3;
  const sec3IsLight = isLightHex(sec3Bg);
  root.style.setProperty("--sec1-bg",       tema?.sec1_bg ?? defaultSec1);
  root.style.setProperty("--sec2-bg",       tema?.sec2_bg ?? defaultSec2);
  root.style.setProperty("--sec3-bg",       sec3Bg);
  root.style.setProperty("--sec3-text",     sec3IsLight ? "#1A2340" : "#ffffff");
  root.style.setProperty("--sec3-text-soft",sec3IsLight ? "rgba(26,35,64,0.72)" : "rgba(255,255,255,0.80)");
}

// Restaura o tema salvo imediatamente ao carregar o módulo, antes do React renderizar
try {
  const cached = localStorage.getItem("enaudin_tema");
  if (cached) applyTheme(JSON.parse(cached), { persist: false });
} catch {}
