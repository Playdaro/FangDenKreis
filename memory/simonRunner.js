import { openDifficultySelect } from '../difficultySelect.js';
import { showScreen } from '../screens.js';

import { startSimonEasy } from './simonEasy.js';
import { startSimonMedium } from './simonMedium.js';
import { startSimonHard } from './simonHard.js';

// ============================
// MENÜ → DIFFICULTY-SCREEN
// ============================
document.getElementById('btn-memory')?.addEventListener('click', () => {
  openDifficultySelect({
    title: 'Gedächtnis-Training',
    onStart: {
      easy: () => {
        window.lastMemoryDifficulty = 'easy';
        showScreen('memory');
        startSimonEasy();
      },
      medium: () => {
        window.lastMemoryDifficulty = 'medium';
        showScreen('memory');
        startSimonMedium();
      },
      hard: () => {
        window.lastMemoryDifficulty = 'hard';
        showScreen('memory');
        startSimonHard();
      }
    }
  });
});

// ============================
// INGAME BACK BUTTON
// ============================
document.getElementById('memory-back')?.addEventListener('click', () => {
  showScreen('menu');
});

// ============================
// RESULT-SCREEN BUTTONS
// (für später / Clean-Migration)
// ============================

// Zurück zum Menü
document.getElementById('memory-res-menu')?.addEventListener('click', () => {
  showScreen('menu');
});

// Nochmal spielen (gleiche Difficulty)
document.getElementById('memory-res-retry')?.addEventListener('click', () => {
  if (window.lastMemoryDifficulty === 'easy') {
    showScreen('memory');
    startSimonEasy();
  }

  if (window.lastMemoryDifficulty === 'medium') {
    showScreen('memory');
    startSimonMedium();
  }

  if (window.lastMemoryDifficulty === 'hard') {
    showScreen('memory');
    startSimonHard();
  }
});
