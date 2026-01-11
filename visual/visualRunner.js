import { openDifficultySelect } from '../difficultySelect.js';
import { showScreen } from '../screens.js';

import { startVisualEasy } from './visualEasy.js';
import { startVisualMedium } from './visualMedium.js';
import { startVisualHard } from './visualHard.js';

document.getElementById('btn-visual')?.addEventListener('click', () => {
  openDifficultySelect({
    title: 'Visuelles Training',
    onStart: {
      easy: () => {
        window.lastVisualDifficulty = 'easy';
        showScreen('visual');
        startVisualEasy();
      },
      medium: () => {
        window.lastVisualDifficulty = 'medium';
        showScreen('visual');
        startVisualMedium();
      },
      hard: () => {
        window.lastVisualDifficulty = 'hard';
        showScreen('visual');
        startVisualHard();
      }
    }
  });
});
// ============================
// RESULT-SCREEN BUTTONS
// ============================

document.getElementById('vs-res-menu')?.addEventListener('click', () => {
  showScreen('menu');
});

document.getElementById('vs-res-retry')?.addEventListener('click', () => {
  // letzte Schwierigkeit merken wir selbst
  const diff = window.lastVisualDifficulty || 'easy';

  if (window.lastVisualDifficulty === 'easy') {
    showScreen('visual');
    startVisualEasy();
  }

  if (window.lastVisualDifficulty === 'medium') {
    showScreen('visual');
    startVisualMedium();
  }

  if (window.lastVisualDifficulty === 'hard') {
    showScreen('visual');
    startVisualHard();
  }
});
