// hard.js – Refactored (zentraler EndGame, Streak + Miss-Flash + Persistenz persönl. Best-Streak)

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
  baseEndGame, // in core.js: export { baseEndGame };
} from './core.js';

// Stats: Session-Start kommt aus stats.js
import { beginSession } from './stats.js';

// Reset/Registry aus reset.js
import {
  resetGameState,
  addManagedListener,
  registerInterval
} from './reset.js';

import { loadPersistedBestStreak } from './core.js';

// ---- EndGame Wrapper (Persistenz persönlicher Best-Streak + VISUAL-Event) ----
function endGameWithPersist() {
  baseEndGame();

  if (playerName) {
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

  // === NEU (2c): Event für main.js (Stats + Game-Over-Befüllung) ===
  window.dispatchEvent(new CustomEvent('visualmode:finished', {
    detail: {
      reason: 'ended',
      score,
      misses,
      bestStreak,
      duration: MODE_CONFIG?.hard?.durationSec ?? 30,
      difficulty: 'hard',
      modeId: 'visual-hard'
    }
  }));
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
export function startHardMode() {
  // 0) Clean Start
  resetGameState();

  // 1) Modus setzen / EndGame-Wrapper registrieren / Run initialisieren
  setDifficulty('hard');
  setEndGame(endGameWithPersist);
  initModeRun('hard');

  // 2) State reset
  resetScore();
  resetMisses();
  clearReactionTimes();
  startNewRunStreakReset();
  scoreDisplay.textContent = '0';

  // 3) Screens
  startScreen.style.display    = 'none';
  gameOverScreen.style.display = 'none';
  gameScreen.style.display     = 'block';

  // 3a) Session für Stats starten (Spielzeit/HPM/Aggregate)
  beginSession({ modeGroup: 'visual', modeId: 'visual-hard', difficulty: 'hard' });

  // 4) Buttons/DOM-Refs
  const restartButton  = document.getElementById('restart-button');
  const backButton     = document.getElementById('back-button');
  const goBackGameOver = document.getElementById('gameover-back-button');

  // 5) Listener (managed)
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
      startHardMode();
    });
  }
  if (goBackGameOver) {
    addManagedListener(goBackGameOver, 'click', () => {
      resetGameState();
      gameOverScreen.style.display = 'none';
      startScreen.style.display    = 'block';
    });
  }

  // Optional: Best-Streak Tooltip
  const historic = loadPersistedBestStreak();
  const streakBox = document.getElementById('streak-box');
  if (streakBox && historic > 0) {
    streakBox.title = 'Persönlicher Rekord: ' + historic;
  }

  // 6) Start
  moveCircle();

  // 7) Timer registrieren (für späteres Reset)
  setMainInterval(moveCircle, MODE_CONFIG.hard.appearTime);
  registerInterval(interval);

  startCountdown(MODE_CONFIG.hard.durationSec);
  registerInterval(countdownInterval);
}
