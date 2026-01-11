import { showScreen } from './screens.js';

let currentHandlers = null;

export function openDifficultySelect({ title, onStart }) {
  currentHandlers = onStart || null;

  const titleEl = document.getElementById('difficulty-title');
  if (titleEl) titleEl.textContent = title || 'Schwierigkeit wählen';

  showScreen('difficulty');
}

document.addEventListener('DOMContentLoaded', () => {

  // Difficulty-Buttons
  document
    .querySelectorAll('#screen-difficulty .difficulty-buttons button')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        const diff = btn.dataset.diff;
        if (!currentHandlers || !currentHandlers[diff]) return;

        currentHandlers[diff]();
      });
    });

  // Zurück zum Menü
  document.getElementById('difficulty-back')?.addEventListener('click', () => {
    currentHandlers = null;
    showScreen('menu');
  });

});
