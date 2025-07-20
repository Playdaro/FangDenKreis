// main.js – Refactor + Best-Streak-Anzeige

import { 
  initCore, 
  updateBestStreakDisplay 
} from './core.js';

import { startEasyMode }   from './easy.js';
import { startMediumMode } from './medium.js';
import { startHardMode }   from './hard.js';
import { startTraining }   from './training.js';
import { updateHighscoreUI } from './highscore.js';

window.addEventListener('DOMContentLoaded', () => {
  // Core Setup (DOM-Refs etc.)
  initCore();

  // Buttons (Modi)
  document.getElementById('btn-easy')    .addEventListener('click', startEasyMode);
  document.getElementById('btn-medium')  .addEventListener('click', startMediumMode);
  document.getElementById('btn-hard')    .addEventListener('click', startHardMode);
  document.getElementById('btn-training').addEventListener('click', startTraining);

  // Intro -> Name Screen
  const infoContinue = document.getElementById('info-continue');
  if (infoContinue) {
    infoContinue.addEventListener('click', () => {
      document.getElementById('info-screen').style.display  = 'none';
      document.getElementById('name-screen').style.display  = 'block';
      localStorage.setItem('instructionsSeen', 'true');
    });
  }

  // Name Submit
  const nameSubmit = document.getElementById('name-submit');
  const nameInput  = document.getElementById('name-input');
  if (nameSubmit && nameInput) {
    nameSubmit.addEventListener('click', () => {
      const raw = (nameInput.value || '').trim();
      if (!raw) { alert('Bitte gib einen Namen ein.'); return; }
      if (raw.length > 12) { alert('Max. 12 Zeichen.'); return; }
      if (/\s/.test(raw)) { alert('Keine Leerzeichen.'); return; }
      if (/\d{4,}/.test(raw)) { alert('Bitte keinen echten Namen.'); return; }

      localStorage.setItem('lastPlayerName', raw);
      document.getElementById('name-screen').style.display  = 'none';
      document.getElementById('start-screen').style.display = 'block';
      updateHighscoreUI();
      updateBestStreakDisplay(); // neu
    });
  }

  // Highscores initial
  updateHighscoreUI();

  // Falls Nutzer bereits gespeichert war (initCore setzt playerName)
  // Wird die Best-Streak-Anzeige hier aktualisiert (falls Element existiert)
  updateBestStreakDisplay();

  console.log('▶ main.js initialisiert (Refactor + BestStreak)');
});
