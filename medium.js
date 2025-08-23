// medium.js – Refactored (zentraler EndGame, Streak + Miss-Flash + Persistenz persönl. Best-Streak)

import {
  // State / Mutationen
  score,
  misses,
  reactionTimes,
  lastMoveTime,
  incrementScore,
  incrementMisses,
  resetScore,
  resetMisses,
  clearReactionTimes,
  setDifficulty,
  setMainInterval,
  clearCircleIntervals,
  setEndGame,
  initModeRun,
  MODE_CONFIG,
  moveCircle,
  startCountdown,
  interval,
  countdownInterval,
  triggerMissFlash,
  startNewRunStreakReset,
  registerHitForStreak,
  registerMissForStreak,
  bestStreak,
  // DOM / global
  scoreDisplay,
  startScreen,
  gameScreen,
  gameOverScreen,
  circle,
  gameArea,
  playerName,
  baseEndGame, // falls nicht exportiert -> in core.js `export { baseEndGame };`
} from './core.js';

// Reset/Registry aus reset.js
import {
  resetGameState,
  addManagedListener,
  registerInterval
} from './reset.js';

import { loadPersistedBestStreak } from './core.js';

// ---- EndGame Wrapper (Persistenz persönlicher Best-Streak) ----
function endGameWithPersist() {
  baseEndGame();

  if (!playerName) return;

  const key = `bestStreak_${playerName}`;
  const old = +localStorage.getItem(key) || 0;
  if (bestStreak > old) {
    localStorage.setItem(key, bestStreak);
  }

  const persistedEl = document.getElementById('final-persisted-best-streak');
  if (persistedEl) {
    const persisted = +localStorage.getItem(key) || 0;
    persistedEl.textContent = persisted;
  }
}

// ---- Event Handler ----
function handleHit() {
  reactionTimes.push((Date.now() - lastMoveTime) / 1000);
  registerHitForStreak();
  incrementScore();
  scoreDisplay.textContent = score;
  moveCircle();
}

function handleMiss(e) {
  if (e.target === circle) return;
  incrementMisses();
  registerMissForStreak();
  triggerMissFlash();
}

// ---- Start ----
export function startMediumMode() {
  // 0) Immer zuerst alles sauber aufräumen
  resetGameState();

  // 1) Modus setzen / EndGame-Wrapper registrieren / Run initialisieren
  setDifficulty('medium');
  setEndGame(endGameWithPersist);
  initModeRun('medium');

  // 2) State für neue Runde zurücksetzen
  resetScore();
  resetMisses();
  clearReactionTimes();
  startNewRunStreakReset();
  scoreDisplay.textContent = '0';

  // 3) Screens schalten
  startScreen.style.display    = 'none';
  gameOverScreen.style.display = 'none';
  gameScreen.style.display     = 'block';

  // 4) Buttons/DOM-Refs
  const restartButton  = document.getElementById('restart-button');
  const backButton     = document.getElementById('back-button');
  const goBackGameOver = document.getElementById('gameover-back-button');

  // 5) Listener sauber verwalten (managed!)
  if (circle) {
    circle.style.display = 'block';
    addManagedListener(circle, 'click', handleHit);
  }
  if (gameArea) {
    addManagedListener(gameArea, 'click', handleMiss);
  }

  if (backButton) {
    addManagedListener(backButton, 'click', () => {
      resetGameState();
      gameScreen.style.display  = 'none';
      startScreen.style.display = 'block';
    });
  }
  if (restartButton) {
    addManagedListener(restartButton, 'click', () => {
      resetGameState();
      startMediumMode();
    });
  }
  if (goBackGameOver) {
    addManagedListener(goBackGameOver, 'click', () => {
      resetGameState();
      gameOverScreen.style.display = 'none';
      startScreen.style.display    = 'block';
    });
  }

  // Optional: historischen Best-Streak als Tooltip
  const historic = loadPersistedBestStreak();
  const streakBox = document.getElementById('streak-box');
  if (streakBox && historic > 0) {
    streakBox.title = 'Persönlicher Rekord: ' + historic;
  }

  // 6) Start der Runde
  moveCircle();

  // 7) Timer/Intervals starten und REGISTRIEREN
  setMainInterval(moveCircle, MODE_CONFIG.medium.appearTime);
  registerInterval(interval);

  startCountdown(MODE_CONFIG.medium.durationSec);
  registerInterval(countdownInterval);
}
