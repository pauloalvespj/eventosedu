/**
 * ENAUDIN — Sistema de temas visuais
 *
 * Cada tema define hero (cor de fundo dos cards escuros) e accent (cor de destaque).
 * mode:'dark' → texto branco/dourado; mode:'light' → texto escuro.
 */

export const PRESETS = [
  { id: "azul",     label: "Azul",          hero: "#0d1f3c", accent: "#c4a050", mode: "dark"  },
  { id: "verde",    label: "Verde",          hero: "#0a2416", accent: "#6ec47e", mode: "dark"  },
  { id: "roxo",     label: "Roxo",           hero: "#1c0b32", accent: "#a87ec8", mode: "dark"  },
  { id: "vermelho", label: "Vermelho escuro", hero: "#2e0808", accent: "#d4806a", mode: "dark"  },
  { id: "cinza",    label: "Cinza claro",    hero: "#eef0f4", accent: "#2c3348", mode: "light" },
];

/** Retorna true se a cor hex for percebida como clara (luminância > 0.5) */
export function isLightHex(hex) {
  if (!hex || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.5;
}

/**
 * Aplica um tema ao :root via CSS custom properties.
 * tema pode ser:
 *   null / undefined          → azul (padrão)
 *   { preset: "verde" }       → preset nomeado
 *   { preset: "custom", hero, accent, mode } → personalizado
 */
export function applyTheme(tema) {
  const root = document.documentElement;

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
  // --navy e variantes:
  // • Temas escuros: usa o hero (ex: azul escuro, verde escuro) como cor principal
  // • Temas claros:  usa o accent (já escuro) para sidebar/topbar continuarem visíveis
  if (mode === "light") {
    // Derivar dark/light do ACCENT, não do hero (evita sidebar cinza claro com texto branco)
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
  // sombras baseadas na cor do tema
  const sr = mode === "light" ? r : hr;
  const sg = mode === "light" ? g : hg;
  const sb = mode === "light" ? b : hb;
  root.style.setProperty("--shadow",    `0 2px 16px rgba(${sr},${sg},${sb},0.08)`);
  root.style.setProperty("--shadow-lg", `0 8px 40px rgba(${sr},${sg},${sb},0.13)`);
  root.style.setProperty("--gold-on-dark",  accent);
  root.style.setProperty("--gold-label",    `rgba(${r},${g},${b},0.90)`);
  root.style.setProperty("--gold-tint",     `rgba(${r},${g},${b},0.12)`);
  root.style.setProperty("--gold-border",   `rgba(${r},${g},${b},0.28)`);
  root.style.setProperty("--gold-divider",  `rgba(${r},${g},${b},0.20)`);

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
}
