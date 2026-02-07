// difficultySelect.js
// Zentrale Difficulty-Auswahl für ALLE Modi (fix & stabil)

import { showScreen } from './screens.js';
import { MODE_DESCRIPTIONS } from './modeDescriptions.js';

let currentHandlers = null;
let currentModeKey = null;

/**
 * Öffnet den Difficulty-Screen für einen Modus
 * @param {Object} options
 * @param {string} options.modeKey   z.B. "visual", "sound", "overload"
 * @param {Object} options.onStart   { easy, medium, hard } (optional)
 */
export function openDifficultySelect({ modeKey, onStart } = {}) {
  currentModeKey  = modeKey || null;
  currentHandlers = onStart || null;

  const titleEl = document.getElementById('difficulty-title');
  const descEl  = document.getElementById('difficulty-desc');

  const data = MODE_DESCRIPTIONS[currentModeKey];

  // ---------- Titel ----------
  if (titleEl) {
    titleEl.textContent =
      data?.title || 'Schwierigkeit wählen';
  }

  // ---------- Beschreibung ----------
  if (descEl) {
    descEl.textContent =
      data?.text || 'Wähle eine Schwierigkeit, um zu starten.';
  }

  // Screen anzeigen
  showScreen('difficulty');
}

/* ======================================================
   BUTTON-BINDINGS (global, einmalig)
   ====================================================== */
document.addEventListener('DOMContentLoaded', () => {

  // Difficulty-Buttons
  document
    .querySelectorAll('#screen-difficulty [data-diff]')
    .forEach(btn => {
      btn.addEventListener('click', () => {

        // Kein Start-Handler → nichts tun (Beschreibung bleibt!)
        if (!currentHandlers) return;

        const diff = btn.dataset.diff;
        const handler = currentHandlers[diff];

        if (typeof handler === 'function') {
          handler();
        }
      });
    });

  // Zurück zum Menü
  document
    .getElementById('difficulty-back')
    ?.addEventListener('click', () => {
      currentHandlers = null;
      currentModeKey  = null;
      showScreen('menu');
    });

});
