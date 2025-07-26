// hardAudioColor.js – Hard Audio-Color mit 4 Kreisen

import {
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
  resetScore,
  resetMisses,
  incrementScore,
  incrementMisses,
  setLastMoveTime,
  moveCircle,
  moveCircleSafely,
  triggerMissFlash,
  setEndGame,
  baseEndGame,
  startCountdown
} from './core.js';

// 5 Grundfarben
const COLORS = [
  { name: 'Rot',     code: '#e74c3c' },
  { name: 'Blau',    code: '#3498db' },
  { name: 'Grün',    code: '#2ecc71' },
  { name: 'Gelb',    code: '#f1c40f' },
  { name: 'Violett', code: '#9b59b6' }
];

let correctColor;

// TTS‑Helper
function speak(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }
}

// Platziere 4 Kreise & sage eine Farbe
function spawnCircles() {
  // 4 verschiedene Farben
  const quad = COLORS.sort(() => 0.5 - Math.random()).slice(0, 4);
  [circle, circle2, circle3, circle4].forEach((c, i) => {
    c.dataset.color = quad[i].name;
    c.style.background = quad[i].code;
    c.style.display = 'block';
  });
  // Positionierung ohne Überlappung
  moveCircle();                  
  moveCircleSafely(circle2);
  moveCircleSafely(circle3);
  moveCircleSafely(circle4);
  // Zeitstempel für Reaktionszeit
  setLastMoveTime(Date.now());
  // zufällige Ansage
  correctColor = quad[Math.floor(Math.random() * 4)].name;
  speak(correctColor);
}

// Klick auf einen der 4 Kreise
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

// Klick außerhalb der Kreise
function handleMissClick(e) {
  if ([circle, circle2, circle3, circle4].includes(e.target)) return;
  incrementMisses();
  triggerMissFlash();
}

// Entfernt Listener und versteckt Kreise
function cleanup() {
  [circle, circle2, circle3, circle4].forEach(c =>
    c.removeEventListener('click', handleCircleClick)
  );
  gameArea.removeEventListener('click', handleMissClick);
  [circle, circle2, circle3, circle4].forEach(c => c.style.display = 'none');
}

// EndGame‑Wrapper
function endGame() {
  cleanup();
  baseEndGame();
}

// Start Hard‑Modus
export function startHardAudioColorMode() {
  // Reset
  resetScore();
  resetMisses();
  reactionTimes.length = 0;
  scoreDisplay.textContent = '0';

  // Timer & EndGame
  setEndGame(endGame);
  startCountdown(30);

  // Screens umschalten
  startScreen.style.display    = 'none';
  gameOverScreen.style.display = 'none';
  gameScreen.style.display     = 'block';

  // Listener setzen
  [circle, circle2, circle3, circle4].forEach(c =>
    c.addEventListener('click', handleCircleClick)
  );
  gameArea.addEventListener('click', handleMissClick);

  // Back‑Button
  const back = document.getElementById('back-button');
  if (back) back.onclick = () => {
    cleanup();
    gameScreen.style.display  = 'none';
    startScreen.style.display = 'block';
  };

  // Restart & GoBack im GameOver
  const restart = document.getElementById('restart-button');
  const goBack  = document.getElementById('gameover-back-button');
  if (restart) restart.onclick = () => { cleanup(); startHardAudioColorMode(); };
  if (goBack)  goBack.onclick  = () => {
    cleanup();
    gameOverScreen.style.display = 'none';
    startScreen.style.display    = 'block';
  };

  // Erste Runde
  spawnCircles();
}
