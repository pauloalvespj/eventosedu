// ENAUDIN — Modo de alto contraste (acessibilidade / PCD)
//
// A maioria das variáveis de cor do tema (--navy, --teal, --gold, --bg,
// --color-primary etc.) é definida via JS em cima de :root (themes.js,
// element.style.setProperty), não em CSS estático. Uma regra CSS baseada em
// classe (:root.high-contrast{--navy:...}) nunca vence esse estilo inline —
// por isso algumas coisas continuavam na cor do tema (ex: texto azul-escuro
// em fundo preto) mesmo com o modo ligado. A correção é aplicar as mesmas
// variáveis também via inline style, na mesma "camada" que o tema usa.
import { applyTheme } from "./themes";

const STORAGE_KEY = "enaudin_alto_contraste";

// Só as variáveis que themes.js define via JS — as demais (--text, --success,
// --danger, --admin-sb-*, etc.) nunca mudam por tema e continuam cobertas
// pela regra .high-contrast{} do CSS.
const OVERRIDES = {
  "--navy": "#ffff00", "--navy-dark": "#000000", "--navy-light": "#ffff00",
  "--hero": "#000000", "--hero-dark": "#000000", "--hero-gradient": "#000000",
  "--gold": "#ffff00", "--gold-light": "#ffff00", "--gold-pale": "#000000",
  "--gold-on-dark": "#ffff00", "--gold-label": "#ffff00", "--gold-tint": "#000000",
  "--gold-border": "#ffff00", "--gold-divider": "#ffff00",
  "--white-hi": "#ffffff", "--white-mid": "#ffffff", "--white-low": "#ffffff", "--white-faint": "#ffffff",
  "--teal": "#ffff00", "--teal-light": "#ffff00",
  "--bg": "#000000", "--surface2": "#0a0a0a",
  "--border": "#ffffff", "--border2": "#ffffff",
  "--warn": "#ffff00",
  "--shadow": "none", "--shadow-lg": "none",
  "--nav-bg": "#000000",
  "--color-primary": "#ffff00", "--color-primary-rgb": "255,255,0",
  "--hero-subtext": "#ffffff", "--hero-quote-bg": "#000000", "--hero-quote-border": "#ffff00", "--hero-quote-color": "#ffff00",
  "--nav-hover-color": "#ffff00", "--section-label": "#ffff00",
  "--sec1-bg": "#000000", "--sec2-bg": "#0a0a0a", "--sec3-bg": "#000000", "--sec3-text": "#ffffff", "--sec3-text-soft": "#ffffff",
};

export function isHighContrast() {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}

export function applyHighContrast(enabled) {
  const root = document.documentElement;
  root.classList.toggle("high-contrast", enabled);

  if (enabled) {
    for (const [k, v] of Object.entries(OVERRIDES)) root.style.setProperty(k, v);
  } else {
    // Restaura as variáveis do tema atual — reaplicar o tema é o único jeito
    // confiável de "desfazer" um inline style com outro inline style.
    let tema = null;
    try { tema = JSON.parse(localStorage.getItem("enaudin_tema") || "null"); } catch { /* usa tema padrão */ }
    applyTheme(tema, { persist: false });
  }

  try { localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0"); } catch { /* storage indisponível */ }
}

export function toggleHighContrast() {
  const next = !isHighContrast();
  applyHighContrast(next);
  return next;
}

// Restaura o estado salvo imediatamente ao carregar o módulo, antes do React
// renderizar. Depende de themes.js já ter aplicado o tema cacheado (import
// acima garante essa ordem).
try {
  if (isHighContrast()) applyHighContrast(true);
} catch { /* storage indisponível — segue no modo padrão */ }
