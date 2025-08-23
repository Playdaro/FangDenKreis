// mediumAudioColor.js – Medium Audio-Color (3 Bälle, reset-sicher, managed Listener, Timer-Registrierung)

import {
  // DOM & State
  circle,
  circle2,
  circle3,            // ← dritter Ball
  gameArea,
  scoreDisplay,
  startScreen,
  gameScreen,
  gameOverScreen,
  reactionTimes,
  lastMoveTime,
  // Mutatoren
  resetScore,
  resetMisses,
  incrementScore,
  incrementMisses,
  setLastMoveTime,
  // Core-Funktionen
  moveCircle,
  moveCircleSafely,
  triggerMissFlash,
  setEndGame,
  baseEndGame,
  startCountdown,
  // Timer-IDs (werden nach startCountdown gesetzt)
  countdownInterval
} from './core.js';

import {
  resetGameState,
  addManagedListener,
  registerInterval
} from './reset.js';

// Farbpalette
const COLORS = [
  { name: 'Rot',     code: '#e74c3c' },
  { name: 'Blau',    code: '#3498db' },
  { name: 'Grün',    code: '#2ecc71' },
  { name: 'Gelb',    code: '#f1c40f' },
  { name: 'Violett', code: '#9b59b6' }
];

let correctColor;

// TTS
function speak(text) {
  if ('speechSynthesis' in window) {
    const msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
  }
}

// 3 Kreise spawnen + Farbe ansagen
function spawnCircles() {
  const [a, b, c] = [...COLORS].sort(() => 0.5 - Math.random()).slice(0, 3);

  circle.dataset.color  = a.name;
  circle2.dataset.color = b.name;
  circle3.dataset.color = c.name;

  circle.style.background  = a.code;
  circle2.style.background = b.code;
  circle3.style.background = c.code;

  circle.style.display  = 'block';
  circle2.style.display = 'block';
  circle3.style.display = 'block';

  moveCircle();                 // bewegt #circle
  moveCircleSafely(circle2);    // bewegt #circle2
  moveCircleSafely(circle3);    // bewegt #circle3

  setLastMoveTime(Date.now());

  const pool = [a.name, b.name, c.name];
  correctColor = pool[Math.floor(Math.random() * 3)];
  speak(correctColor);
}

function handleCircleClick(e) {
  const chosen = e.target.dataset.color;
  if (!chosen) return;

  if (chosen === correctColor) {
    reactionTimes.push((Date.now() - lastMoveTime) / 1000);
    incrementScore();
    scoreDisplay.textContent = String(+scoreDisplay.textContent + 1);
    spawnCircles();
  } else {
    incrementMisses();
    triggerMissFlash();
  }
}

function handleMissClick(e) {
  if (e.target === circle || e.target === circle2 || e.target === circle3) return;
  incrementMisses();
  triggerMissFlash();
}

// EndGame-Wrapper
function endGameAudioColorMedium() {
  baseEndGame();
}

export function startMediumAudioColorMode() {
  // 0) Clean start
  resetGameState();

  // 1) Rundenstate
  resetScore();
  resetMisses();
  reactionTimes.length = 0;
  scoreDisplay.textContent = '0';

  // 2) EndGame + Countdown
  setEndGame(endGameAudioColorMedium);
  startCountdown(30);                 // ggf. anpassen (z. B. 45s)
  registerInterval(countdownInterval);

  // 3) Screens
  startScreen.style.display    = 'none';
  gameOverScreen.style.display = 'none';
  gameScreen.style.display     = 'block';

  // 4) Listener (managed)
  if (circle)  addManagedListener(circle,  'click', handleCircleClick);
  if (circle2) addManagedListener(circle2, 'click', handleCircleClick);
  if (circle3) addManagedListener(circle3, 'click', handleCircleClick);
  if (gameArea) addManagedListener(gameArea, 'click', handleMissClick);

  const backButton     = document.getElementById('back-button');
  const restartBtn     = document.getElementById('restart-button');
  const goBackGameOver = document.getElementById('gameover-back-button');

  if (backButton) {
    addManagedListener(backButton, 'click', () => {
      resetGameState();
      gameScreen.style.display  = 'none';
      startScreen.style.display = 'block';
    });
  }
  if (restartBtn) {
    addManagedListener(restartBtn, 'click', () => {
      resetGameState();
      startMediumAudioColorMode();
    });
  }
  if (goBackGameOver) {
    addManagedListener(goBackGameOver, 'click', () => {
      resetGameState();
      gameOverScreen.style.display = 'none';
      startScreen.style.display    = 'block';
    });
  }

  // 5) Erste Runde
  spawnCircles();
}
