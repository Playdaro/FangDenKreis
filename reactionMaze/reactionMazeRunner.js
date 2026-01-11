// reactionMazeRunner.js – Clean & Unified Difficulty System

import { showScreen } from '../screens.js';
import { openDifficultySelect } from '../difficultySelect.js';
import { startMaze } from './reactionMazeCore.js';

// ============================
// Schwierigkeits-Configs
// ============================
const DIFF = {
  easy:   { cols: 5, rows: 5, pathLen: 18, stepMs: 2600, label: 'easy' },
  medium: { cols: 6, rows: 6, pathLen: 24, stepMs: 2000, label: 'medium' },
  hard:   { cols: 7, rows: 7, pathLen: 30, stepMs: 1600, label: 'hard' },
};

// ============================
// MENÜ → DIFFICULTY-SCREEN
// ============================
document.getElementById('btn-maze')?.addEventListener('click', () => {
  openDifficultySelect({
    title: 'Reaction Maze',
    onStart: {
      easy:   () => startFromDifficulty('easy'),
      medium: () => startFromDifficulty('medium'),
      hard:   () => startFromDifficulty('hard')
    }
  });
});

// ============================
// RESULT-SCREEN → RETRY
// ============================
window.startMazeFromMenu = function () {
  if (window.lastMazeDifficulty === 'easy') {
    startFromDifficulty('easy');
  }

  if (window.lastMazeDifficulty === 'medium') {
    startFromDifficulty('medium');
  }

  if (window.lastMazeDifficulty === 'hard') {
    startFromDifficulty('hard');
  }
};

// ============================
// ZENTRALE STARTFUNKTION
// ============================
function startFromDifficulty(mode) {
  window.lastMazeDifficulty = mode;

  const cfg = DIFF[mode];
  if (!cfg) return; // <- kein Raten, kein Default

  showScreen('maze');
  startMaze(cfg);
}

// ============================
// BACK-BUTTON IM MAZE
// ============================
document.getElementById('maze-back')?.addEventListener('click', () => {
  if (typeof window.stopMaze === 'function') {
    window.stopMaze();
  }

  const overlay = document.getElementById('maze-overlay');
  if (overlay) overlay.innerHTML = '';

  showScreen('menu');
});
