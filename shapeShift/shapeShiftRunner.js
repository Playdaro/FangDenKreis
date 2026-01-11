// shapeShiftRunner.js
import { openDifficultySelect } from '../difficultySelect.js';
import { showScreen } from '../screens.js';

import { startShapeShift, stopShapeShift } from './shapeShiftCore.js';
import { getShapeShiftEasyConfig } from './shapeShiftEasy.js';
import { getShapeShiftMediumConfig } from './shapeShiftMedium.js';
import { getShapeShiftHardConfig } from './shapeShiftHard.js';

// ============================
// MENÜ → DIFFICULTY-SCREEN
// ============================
document.getElementById('btn-shape-shift')?.addEventListener('click', () => {
  openDifficultySelect({
    title: 'Shape Shift',
    onStart: {
      easy:   () => startFromDifficulty('easy'),
      medium: () => startFromDifficulty('medium'),
      hard:   () => startFromDifficulty('hard'),
    }
  });
});

// ============================
// ZENTRALE STARTFUNKTION
// ============================
function startFromDifficulty(diff) {
  window.lastShapeShiftDifficulty = diff;

  let cfg = null;
  if (diff === 'easy') cfg = getShapeShiftEasyConfig();
  if (diff === 'medium') cfg = getShapeShiftMediumConfig();
  if (diff === 'hard') cfg = getShapeShiftHardConfig();
  if (!cfg) return;

  showScreen('shapeShift');
  startShapeShift(cfg);
}

// ============================
// INGAME BACK BUTTON
// ============================
document.getElementById('shapeShift-back')?.addEventListener('click', () => {
  try { stopShapeShift(); } catch {}
  showScreen('menu');
});

// ============================
// RESULT-SCREEN BUTTONS
// ============================

// Zurück zum Menü
document.getElementById('shapeShift-res-menu')?.addEventListener('click', () => {
  showScreen('menu');
});

// Nochmal spielen (gleiche Difficulty)
document.getElementById('shapeShift-res-retry')?.addEventListener('click', () => {
  const diff = window.lastShapeShiftDifficulty || 'easy';
  startFromDifficulty(diff);
});
