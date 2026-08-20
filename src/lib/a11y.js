// ENAUDIN — Modo de alto contraste (acessibilidade / PCD)
const STORAGE_KEY = "enaudin_alto_contraste";

export function isHighContrast() {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}

export function applyHighContrast(enabled) {
  document.documentElement.classList.toggle("high-contrast", enabled);
  try { localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0"); } catch { /* storage indisponível */ }
}

export function toggleHighContrast() {
  const next = !isHighContrast();
  applyHighContrast(next);
  return next;
}

// Restaura o estado salvo imediatamente ao carregar o módulo, antes do React renderizar
try {
  if (isHighContrast()) document.documentElement.classList.add("high-contrast");
} catch { /* storage indisponível — segue no modo padrão */ }
