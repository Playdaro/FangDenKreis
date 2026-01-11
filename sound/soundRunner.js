import { openDifficultySelect } from '../difficultySelect.js';
import { showScreen } from '../screens.js';

import { startSoundEasy } from './soundEasy.js';
import { startSoundMedium } from './soundMedium.js';
import { startSoundHard } from './soundHard.js';

// ============================
// MENÜ → DIFFICULTY-SCREEN
// ============================
document.getElementById('btn-audio')?.addEventListener('click', () => {
  openDifficultySelect({
    title: 'Sound Challenge',
    onStart: {
      easy: () => {
        window.lastSoundDifficulty = 'easy';
        showScreen('sound');
        startSoundEasy();
      },
      medium: () => {
        window.lastSoundDifficulty = 'medium';
        showScreen('sound');
        startSoundMedium();
      },
      hard: () => {
        window.lastSoundDifficulty = 'hard';
        showScreen('sound');
        startSoundHard();
      }
    }
  });
});

// ============================
// RESULT-SCREEN BUTTONS
// ============================

// Zurück zum Menü
document.getElementById('sound-res-menu')?.addEventListener('click', () => {
  showScreen('menu');
});

// Nochmal spielen (gleiche Difficulty)
document.getElementById('sound-res-retry')?.addEventListener('click', () => {
  if (window.lastSoundDifficulty === 'easy') {
    showScreen('sound');
    startSoundEasy();
  }

  if (window.lastSoundDifficulty === 'medium') {
    showScreen('sound');
    startSoundMedium();
  }

  if (window.lastSoundDifficulty === 'hard') {
    showScreen('sound');
    startSoundHard();
  }
});
