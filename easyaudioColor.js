// easyaudioColor.js – Easy Audio-Color mit Timer, Reaktionszeiten, Fehlklicks & Button-Handlern

import {
  // DOM & State
  circle,
  circle2,
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
  startCountdown
} from './core.js';

// 5 Basisfarben
const COLORS = [
  { name: 'Rot',     code: '#e74c3c' },
  { name: 'Blau',    code: '#3498db' },
  { name: 'Grün',    code: '#2ecc71' },
  { name: 'Gelb',    code: '#f1c40f' },
  { name: 'Violett', code: '#9b59b6' }
];

let correctColor;

// TTS‑Wrapper
function speak(text) {
  if ('speechSynthesis' in window) {
    const msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
  }
}

// Platziere zwei Kreise & sage eine Farbe
function spawnCircles() {
  const [a, b] = COLORS.sort(() => 0.5 - Math.random()).slice(0, 2);

  circle.dataset.color  = a.name;
  circle2.dataset.color = b.name;

  circle.style.background   = a.code;
  circle2.style.background  = b.code;
  circle.style.display      = 'block';
  circle2.style.display     = 'block';

  moveCircle();                
  moveCircleSafely(circle2);

  setLastMoveTime(Date.now());

  correctColor = Math.random() < 0.5 ? a.name : b.name;
  speak(correctColor);
}

// Klick auf Kreis
function handleCircleClick(e) {
  const chosen = e.target.dataset.color;
  if (!chosen) return;

  if (chosen === correctColor) {
    reactionTimes.push((Date.now() - lastMoveTime) / 1000);
    incrementScore();
    scoreDisplay.textContent = +scoreDisplay.textContent + 1;
    spawnCircles();
  } else {
    incrementMisses();
    triggerMissFlash();
  }
}

// Klick neben die Kreise
function handleMissClick(e) {
  if (e.target === circle || e.target === circle2) return;
  incrementMisses();
  triggerMissFlash();
}

// Entfernt Listener und versteckt Kreise
function cleanupAudioColor() {
  circle.removeEventListener('click', handleCircleClick);
  circle2.removeEventListener('click', handleCircleClick);
  gameArea.removeEventListener('click', handleMissClick);
  circle.style.display  = 'none';
  circle2.style.display = 'none';
}

// EndGame‑Wrapper
function endGameAudioColor() {
  cleanupAudioColor();
  baseEndGame();
}

// Start Easy Audio-Color Modus
export function startEasyAudioColorMode() {
  // Reset
  resetScore();
  resetMisses();
  reactionTimes.length = 0;
  scoreDisplay.textContent = '0';

  // Timer & EndGame
  setEndGame(endGameAudioColor);
  startCountdown(30);

  // Screen umschalten
  startScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';
  gameScreen.style.display  = 'block';

  // Listener für Kreise + Spielbereich
  circle .addEventListener('click', handleCircleClick);
  circle2.addEventListener('click', handleCircleClick);
  gameArea.addEventListener('click', handleMissClick);

  // Back‑Button im Spiel
  const backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.onclick = () => {
      cleanupAudioColor();
      gameScreen.style.display  = 'none';
      startScreen.style.display = 'block';
    };
  }

  // Restart- & GameOver-Buttons
  const restartBtn = document.getElementById('restart-button');
  const goBackBtn = document.getElementById('gameover-back-button');

  if (restartBtn) {
    restartBtn.onclick = () => {
      cleanupAudioColor();
      startEasyAudioColorMode();
    };
  }
  if (goBackBtn) {
    goBackBtn.onclick = () => {
      cleanupAudioColor();
      gameOverScreen.style.display = 'none';
      startScreen.style.display    = 'block';
    };
  }

  // Erste Runde
  spawnCircles();
}
