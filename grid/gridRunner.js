import { openDifficultySelect } from '../difficultySelect.js';
import { showScreen } from '../screens.js';

import { startGridEasy } from './gridEasy.js';
import { startGridMedium } from './gridMedium.js';
import { startGridHard } from './gridHard.js';

// ============================
// MENÜ → DIFFICULTY-SCREEN
// ============================
document.getElementById('btn-grid')?.addEventListener('click', () => {
  openDifficultySelect({
    title: 'Richtungs-Training',
    onStart: {
      easy: () => {
        window.lastGridDifficulty = 'easy';
        showScreen('grid');
        startGridEasy();
      },
      medium: () => {
        window.lastGridDifficulty = 'medium';
        showScreen('grid');
        startGridMedium();
      },
      hard: () => {
        window.lastGridDifficulty = 'hard';
        showScreen('grid');
        startGridHard();
      }
    }
  });
});

// ============================
// RESULT-SCREEN BUTTONS
// ============================

// Zurück zum Menü
document.getElementById('grid-res-menu')?.addEventListener('click', () => {
  showScreen('menu');
});

// Nochmal spielen (gleiche Difficulty)
document.getElementById('grid-res-retry')?.addEventListener('click', () => {
  if (window.lastGridDifficulty === 'easy') {
    showScreen('grid');
    startGridEasy();
  }

  if (window.lastGridDifficulty === 'medium') {
    showScreen('grid');
    startGridMedium();
  }

  if (window.lastGridDifficulty === 'hard') {
    showScreen('grid');
    startGridHard();
  }
});
