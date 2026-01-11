// screens.js – FINAL & narrensicher
// Verantwortlich für ALLE Screen-Wechsel im Spiel

const screens = new Map();

/**
 * Alle Screens einmal einsammeln
 */
function collectScreens() {
  screens.clear();

  document.querySelectorAll(".app-screen").forEach(el => {
    screens.set(el.id, el);
  });

  if (screens.size === 0) {
    console.error("[screens] Keine .app-screen Elemente gefunden!");
  }
}

/**
 * Zeigt exakt EINEN Screen an
 * @param {string} name z.B. "menu", "visual", "visual-result"
 */
export function showScreen(name) {
  if (!screens.size) collectScreens();

  // erlaubt "visual" ODER "screen-visual"
  const id = name.startsWith("screen-") ? name : `screen-${name}`;
  const target = screens.get(id);

  if (!target) {
    console.error(
      `[screens] showScreen("${name}") → NICHT GEFUNDEN`,
      { gesucht: id, vorhanden: [...screens.keys()] }
    );
    return;
  }

  // alle Screens ausblenden
  screens.forEach(el => el.classList.add("hidden"));

  // Ziel-Screen anzeigen
  target.classList.remove("hidden");

  console.log(`[screens] now: ${id}`);
}

/**
 * Optional: aktueller Screen (Debug)
 */
export function getCurrentScreen() {
  for (const [id, el] of screens) {
    if (!el.classList.contains("hidden")) return id;
  }
  return null;
}

// Initial sammeln
document.addEventListener("DOMContentLoaded", collectScreens);
