// mediumAudioColor.js – Medium Audio-Color mit 3 Kreisen

import {
  circle,
  circle2,
  circle3,
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

// Platziere 3 Kreise & sage eine Farbe
function spawnCircles() {
  // 3 verschiedene Farben wählen
  const trio = COLORS.sort(() => 0.5 - Math.random()).slice(0, 3);
  // Daten-Attribute + Styles setzen
  [circle, circle2, circle3].forEach((c,i) => {
    c.dataset.color = trio[i].name;
    c.style.background = trio[i].code;
    c.style.display = 'block';
  });
  // Positionierung ohne Überlappung
  moveCircle();                  // circle + lastMoveTime
  moveCircleSafely(circle2);
  moveCircleSafely(circle3);
  // Reset Reaktions-Timestamp
  setLastMoveTime(Date.now());
  // zufällige Ansage
  correctColor = trio[Math.floor(Math.random()*3)].name;
  speak(correctColor);
}

// Klick auf einen der 3 Kreise
function handleCircleClick(e) {
  const chosen = e.target.dataset.color;
  if (chosen === correctColor) {
    reactionTimes.push((Date.now() - lastMoveTime)/1000);
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
  if ([circle, circle2, circle3].includes(e.target)) return;
  incrementMisses();
  triggerMissFlash();
}

// Listener clean‑up
function cleanup() {
  [circle, circle2, circle3].forEach(c =>
    c.removeEventListener('click', handleCircleClick)
  );
  gameArea.removeEventListener('click', handleMissClick);
  [circle, circle2, circle3].forEach(c => c.style.display = 'none');
}

// EndGame‑Wrapper
function endGame() {
  cleanup();
  baseEndGame();
}

// Start Medium‑Modus
export function startMediumAudioColorMode() {
  // Reset
  resetScore();
  resetMisses();
  reactionTimes.length = 0;
  scoreDisplay.textContent = '0';

  // Timer & EndGame
  setEndGame(endGame);
  startCountdown(30);

  // Screens
  startScreen.style.display    = 'none';
  gameOverScreen.style.display = 'none';
  gameScreen.style.display     = 'block';

  // Listener
  [circle, circle2, circle3].forEach(c =>
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

  // Restart & Zurück‑im‑GameOver
  const restart = document.getElementById('restart-button');
  const goBack  = document.getElementById('gameover-back-button');
  if (restart) restart.onclick = () => { cleanup(); startMediumAudioColorMode(); };
  if (goBack)  goBack.onclick  = () => {
    cleanup();
    gameOverScreen.style.display = 'none';
    startScreen.style.display    = 'block';
  };

  // Erstes Spawn
  spawnCircles();
}
