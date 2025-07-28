// trainingTimedColor.js – Getaktetes Audio‑Training mit 60 Sek Timer, Level‑Up‑Pause, XP & Reaktionszeiten

import {
  // Spielfeld & Kreise
  circle, circle2, circle3, circle4, gameArea,
  // Screens
  startScreen, gameScreen, gameOverScreen,
  // Score/Miss Reset & Logging
  resetScore, resetMisses,
  incrementScore, incrementMisses,
  // Reaktionszeiten
  reactionTimes, lastMoveTime,
  // Bewegung & Timing
  setLastMoveTime, moveCircle, moveCircleSafely, triggerMissFlash,
  // Game‑Over Funktionen
  baseEndGame,
  // Trainings‑State & XP/Level
  trainLevel, resetTimedTraining, incrementTrainXP,
  // Countdown‑UI
  trainingTimeDisplay, trainLevelDisplay, trainXPFill, trainXPAmount
} from './core.js';

// Lokaler Interval-Handler für Ballwechsel (Spawn)
let spawnIntervalId = null;

// Farboptionen mit Namen für TTS
const COLOR_OPTIONS = [
  { name: 'Rot',     code: '#e74c3c' },
  { name: 'Blau',    code: '#3498db' },
  { name: 'Grün',    code: '#2ecc71' },
  { name: 'Gelb',    code: '#f1c40f' },
  { name: 'Violett', code: '#9b59b6' }
];

// Level‑abhängige Parameter
function getCountForLevel(lvl) {
  if (lvl <= 5)  return 2;
  if (lvl <=10) return 3;
  if (lvl <=15) return 4;
  return 5;
}
function getIntervalForLevel(lvl) {
  if (lvl <= 5)  return 1700;
  if (lvl <=10) return 1500;
  if (lvl <=15) return 1300;
  return 1100;
}

let correctColorName;

// TTS‑Ansage
function speak(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }
}

// Platziert Kreise und spricht die korrekte Farbe
function spawnBalls() {
  const count = getCountForLevel(trainLevel);
  const chosen = COLOR_OPTIONS
    .sort(() => 0.5 - Math.random())
    .slice(0, count);

  // Hauptkreis
  circle.style.background = chosen[0].code;
  circle.dataset.color    = chosen[0].name;
  circle.style.display    = 'block';
  moveCircle();

  // Zusatzkreise
  const extras = [circle2, circle3, circle4];
  for (let i = 1; i < count; i++) {
    extras[i-1].style.background = chosen[i].code;
    extras[i-1].dataset.color    = chosen[i].name;
    extras[i-1].style.display    = 'block';
    moveCircleSafely(extras[i-1]);
  }
  // Rest verstecken
  for (let i = count-1; i < extras.length; i++) {
    extras[i].style.display = 'none';
  }

  setLastMoveTime(Date.now());
  correctColorName = chosen[Math.floor(Math.random() * count)].name;
  speak(correctColorName);
}

// Startet oder reset­t den Ball‑Spawn‑Loop
function startSpawnTimer() {
  clearInterval(spawnIntervalId);
  spawnBalls();
  spawnIntervalId = setInterval(spawnBalls, getIntervalForLevel(trainLevel));
}

// Klick‐Handler
function handleBallClick(e) {
  const clicked = e.target.dataset.color;
  if (!clicked) return;
  // Reaktionszeit erfassen
  reactionTimes.push((Date.now() - lastMoveTime) / 1000);
  if (clicked === correctColorName) {
    incrementScore();
    incrementTrainXP();
    // Neuer Spawn sofort, 60s‑Timer bleibt unverändert
    startSpawnTimer();
  } else {
    incrementMisses();
    triggerMissFlash();
  }
}

// Fehlklick in Spielfeld
function handleMissClick(e) {
  if (![circle, circle2, circle3, circle4].includes(e.target)) {
    incrementMisses();
    triggerMissFlash();
  }
}

// Cleanup‐Routine
function cleanup() {
  [circle, circle2, circle3, circle4].forEach(c =>
    c.removeEventListener('click', handleBallClick)
  );
  gameArea.removeEventListener('click', handleMissClick);
  clearInterval(spawnIntervalId);
}

// Wird nach Countdown-Ende aufgerufen: räumt auf, zeigt GameOver und bindet Buttons
function endTrainingTimedColor() {
  cleanup();
  document.getElementById('timed-training-ui').style.display = 'none';
  baseEndGame();

  // Button‑Handler setzen
  const restartBtn = document.getElementById('restart-button');
  if (restartBtn) {
    // Neuer Button‑Text
    restartBtn.textContent = 'Weiter spielen';
    restartBtn.addEventListener('click', () => {
      document.getElementById('timed-training-ui').style.display = 'block';
      gameOverScreen.style.display = 'none';
      gameScreen.style.display     = 'block';
      // Start ohne Statreset
      resumeTrainingTimedColor();
    });
  }

  const goBackBtn = document.getElementById('gameover-back-button');
  if (goBackBtn) {
    goBackBtn.addEventListener('click', () => {
      cleanup();
      document.getElementById('timed-training-ui').style.display = 'none';
      gameScreen.style.display     = 'none';
      startScreen.style.display    = 'block';
    });
  }
}

// Trainingsmodus starten oder fortsetzen
export function startTrainingTimedColor(resetStats = true) {
  // State & UI Reset nur, wenn resetStats true
  if (resetStats) {
    resetTimedTraining();
    resetScore();
    resetMisses();
    if (trainingTimeDisplay) trainingTimeDisplay.textContent = '60s';
    if (trainLevelDisplay)   trainLevelDisplay.textContent   = 'Level 1';
    if (trainXPFill)         trainXPFill.style.width         = '0%';
    if (trainXPAmount)       trainXPAmount.textContent       = '0 XP';
  } else {
    // Tempo‑UI zurücksetzen, XP/Level behalten
    if (trainingTimeDisplay) trainingTimeDisplay.textContent = '60s';
  }

  // Screens einblenden
  startScreen.style.display    = 'none';
  gameScreen.style.display     = 'block';
  gameOverScreen.style.display = 'none';
  document.getElementById('timed-training-ui').style.display = 'block';

  // Back‑Button im laufenden Training binden
  const backBtn = document.getElementById('back-button');
  if (backBtn) {
    backBtn.onclick = () => {
      cleanup();
      clearInterval(countdown);
      clearInterval(spawnIntervalId);
      document.getElementById('timed-training-ui').style.display = 'none';
      gameScreen.style.display  = 'none';
      startScreen.style.display = 'block';
    };
  }

  // Eigener 60 s‑Countdown
  let remaining = 60;
  if (trainingTimeDisplay) trainingTimeDisplay.textContent = remaining + 's';
  const countdown = setInterval(() => {
    remaining--;
    if (trainingTimeDisplay) trainingTimeDisplay.textContent = remaining + 's';
    if (remaining <= 0) {
      clearInterval(countdown);
      clearInterval(spawnIntervalId);
      endTrainingTimedColor();
    }
  }, 1000);

  // Ball‑Spawn‑Loop starten
  startSpawnTimer();

  // Klick‑Listener setzen
  [circle, circle2, circle3, circle4].forEach(c =>
    c.addEventListener('click', handleBallClick)
  );
  gameArea.addEventListener('click', handleMissClick);
}

// Hilfsfunktion: Fortsetzen ohne Reset
function resumeTrainingTimedColor() {
  // Gleiche Logik wie startTrainingTimedColor(false)
  startTrainingTimedColor(false);
}

// Ende Datei
