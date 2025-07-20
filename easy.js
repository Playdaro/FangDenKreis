// easy.js – Refactored (zentraler EndGame, Streak + Miss-Flash + Persistenz persönl. Best-Streak)

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
  baseEndGame // falls nicht exportiert -> in core.js `export { baseEndGame };`
} from './core.js';

import {
  loadPersistedBestStreak
} from './core.js';

// ---- EndGame Wrapper (nur für Persistenz persönlicher Best-Streak) ----
function endGameWithPersist() {
  // Basis-Auswertung (setzt u.a. finalBestStreak = Run-Bestwert)
  baseEndGame();

  if (!playerName) return;

  const key = `bestStreak_${playerName}`;
  const old = +localStorage.getItem(key) || 0;
  if (bestStreak > old) {
    localStorage.setItem(key, bestStreak);
  }

  // Anzeige im Game-Over Screen (persönlicher Rekord – nach Speicherung)
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

// ---- Cleanup ----
function cleanup() {
  circle.removeEventListener('click', handleHit);
  gameArea.removeEventListener('click', handleMiss);
  clearInterval(interval);
  clearInterval(countdownInterval);
  clearCircleIntervals();
}

// ---- Start ----
export function startEasyMode() {
  setDifficulty('easy');
  // Unser EndGame-Wrapper aktivieren
  setEndGame(endGameWithPersist);
  initModeRun('easy');

  cleanup();

  resetScore();
  resetMisses();
  clearReactionTimes();
  startNewRunStreakReset();
  scoreDisplay.textContent = '0';

  // Screens
  startScreen.style.display    = 'none';
  gameOverScreen.style.display = 'none';
  gameScreen.style.display     = 'block';

  // Buttons frisch holen (erst jetzt sicher vorhanden)
  const restartButton  = document.getElementById('restart-button');
  const backButton     = document.getElementById('back-button');
  const goBackGameOver = document.getElementById('gameover-back-button');

  // Listener
  circle.addEventListener('click', handleHit);
  gameArea.addEventListener('click', handleMiss);

  if (backButton) {
    backButton.onclick = () => {
      cleanup();
      gameScreen.style.display  = 'none';
      startScreen.style.display = 'block';
    };
  }
  if (restartButton) {
    restartButton.onclick = () => {
      cleanup();
      startEasyMode();
    };
  }
  if (goBackGameOver) {
    goBackGameOver.onclick = () => {
      cleanup();
      gameOverScreen.style.display = 'none';
      startScreen.style.display    = 'block';
    };
  }

  // Optional: historischen Best-Streak als Tooltip zeigen
  const historic = loadPersistedBestStreak();
  const streakBox = document.getElementById('streak-box');
  if (streakBox && historic > 0) {
    streakBox.title = 'Persönlicher Rekord: ' + historic;
  }

  // Start der Runde
  moveCircle();
  setMainInterval(moveCircle, MODE_CONFIG.easy.appearTime);
  startCountdown(MODE_CONFIG.easy.durationSec);
}
