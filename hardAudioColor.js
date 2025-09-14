// hardAudioColor.js – Hard Audio-Color (wie Easy/Medium, nur 4 Bälle; reset-sicher, managed Listener, Timer-Registrierung)

import {
  // DOM & State
  circle,
  circle2,
  circle3,
  circle4,
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
  // Core
  moveCircle,
  moveCircleSafely,
  triggerMissFlash,
  setEndGame,
  baseEndGame,
  startCountdown,
  // vom Core befüllte Timer-IDs
  countdownInterval,
  // echte Misszahl für Event
  misses
} from './core.js';

import {
  resetGameState,
  addManagedListener,
  registerInterval
} from './reset.js';

// Stats (Sessionstart für Spielzeit/HPM etc.)
import { beginSession } from './stats.js';

// Farbpool
const COLORS = [
  { name: 'Rot',     code: '#e74c3c' },
  { name: 'Blau',    code: '#3498db' },
  { name: 'Grün',    code: '#2ecc71' },
  { name: 'Gelb',    code: '#f1c40f' },
  { name: 'Violett', code: '#9b59b6' }
];

let correctColor;

// TTS-Wrapper: sagt "Lila" statt "Violett"
function speak(text) {
  if (!text) return;
  // Nur die Sprachausgabe umbiegen – Logik/Datensätze bleiben "Violett"
  if (String(text).toLowerCase() === 'violett') text = 'Lila';

  if ('speechSynthesis' in window) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'de-DE'; // bessere deutsche Aussprache
    window.speechSynthesis.speak(msg);
  }
}


// 4 Kreise spawnen & einmal Farbe ansagen (wie bei Easy/Medium)
function spawnCircles() {
  const [a, b, c, d] = [...COLORS].sort(() => 0.5 - Math.random()).slice(0, 4);

  circle.dataset.color  = a.name;
  circle2.dataset.color = b.name;
  circle3.dataset.color = c.name;
  circle4.dataset.color = d.name;

  circle.style.background  = a.code;
  circle2.style.background = b.code;
  circle3.style.background = c.code;
  circle4.style.background = d.code;

  circle.style.display  = 'block';
  circle2.style.display = 'block';
  circle3.style.display = 'block';
  circle4.style.display = 'block';

  // Positionieren – erster frei, die anderen sicher (wie bei Medium)
  moveCircle();
  moveCircleSafely(circle2);
  moveCircleSafely(circle3);
  moveCircleSafely(circle4);

  setLastMoveTime(Date.now());

  const pool = [a.name, b.name, c.name, d.name];
  correctColor = pool[Math.floor(Math.random() * pool.length)];

  // EINMAL ansagen – keine Reannounce-Loops
  speak(correctColor);
}

function handleCircleClick(e) {
  const chosen = e.target.dataset.color;
  if (!chosen) return;

  if (chosen === correctColor) {
    reactionTimes.push((Date.now() - lastMoveTime) / 1000);
    incrementScore();
    scoreDisplay.textContent = String(+scoreDisplay.textContent + 1);
    // neue Runde
    spawnCircles();
  } else {
    incrementMisses();
    triggerMissFlash();
  }
}

function handleMissClick(e) {
  if (
    e.target === circle ||
    e.target === circle2 ||
    e.target === circle3 ||
    e.target === circle4
  ) return;
  incrementMisses();
  triggerMissFlash();
}

// EndGame-Wrapper (Standardauswertung + Event für Stats/UI)
function endGameAudioColorHard() {
  // Standardisierte Endauswertung (befüllt deine Game-Over-UI)
  baseEndGame();

  // Event für main.js (Stats + Game-Over-Befüllung)
  window.dispatchEvent(new CustomEvent('audiomode:finished', {
    detail: {
      reason: 'ended',
      score: Number(scoreDisplay.textContent) || 0,
      misses: Number(misses ?? 0),
      bestStreak: 0,            // Audio-Color hat aktuell keine Streak-Logik
      duration: 30,             // identisch zum Countdown oben
      difficulty: 'hard',
      modeId: 'audio-hard'
    }
  }));
}

export function startHardAudioColorMode() {
  // 0) sauberer Start
  resetGameState();

  // 1) Rundenstate
  resetScore();
  resetMisses();
  reactionTimes.length = 0;
  scoreDisplay.textContent = '0';

  // 2) EndGame + Countdown (wie Easy/Medium, default 30s)
  setEndGame(endGameAudioColorHard);
  startCountdown(30);
  registerInterval(countdownInterval);

  // 3) Screens
  startScreen.style.display    = 'none';
  gameOverScreen.style.display = 'none';
  gameScreen.style.display     = 'block';

  // 3c) Startscreen-Musik stoppen & blocken + Audio/Stats-Buttons ausblenden
  window.stopStartscreenMusic?.();
  window.fdkBlockStartMusic?.();
  const audioToggle = document.getElementById('start-audio-toggle');
  if (audioToggle) audioToggle.style.display = 'none';
  const statsToggle = document.getElementById('stats-toggle');
  if (statsToggle) statsToggle.style.display = 'none';

  // === Session für Stats beginnen (Spielzeit/HPM/Aggregate) ===
  beginSession({ modeGroup: 'audio', modeId: 'audio-hard', difficulty: 'hard' });

  // 4) Listener (managed)
  if (circle)  addManagedListener(circle,  'click', handleCircleClick);
  if (circle2) addManagedListener(circle2, 'click', handleCircleClick);
  if (circle3) addManagedListener(circle3, 'click', handleCircleClick);
  if (circle4) addManagedListener(circle4, 'click', handleCircleClick);
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
      startHardAudioColorMode();
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
