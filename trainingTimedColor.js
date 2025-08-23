// trainingTimedColor.js – Timed Audio-Training (2 Bälle) – nutzt NUR den Game-Over-Screen
// Mit Persistenz (XP/Level) pro Spielername via localStorage

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
  playerName,            // ← für Nutzer-spezifische Speicherung
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
  // vom Core gesetzte Timer-ID
  countdownInterval
} from './core.js';

import {
  resetGameState,
  addManagedListener,
  registerInterval
} from './reset.js';

/** Dauer (Sekunden) */
const DURATION_SEC = 60;

// Farbpool (wie in Audio-Easy)
const COLORS = [
  { name: 'Rot',     code: '#e74c3c' },
  { name: 'Blau',    code: '#3498db' },
  { name: 'Grün',    code: '#2ecc71' },
  { name: 'Gelb',    code: '#f1c40f' },
  { name: 'Violett', code: '#9b59b6' }
];

/* ========= Persistenz (pro Spieler) ========= */
function keyXP()    { return `fdk:trainTimed:${playerName || 'anon'}:xp`; }
function keyLevel() { return `fdk:trainTimed:${playerName || 'anon'}:level`; }

function loadProgress() {
  const xp    = Number(localStorage.getItem(keyXP())    || 0);
  const level = Number(localStorage.getItem(keyLevel()) || 1);
  return { xp: isNaN(xp) ? 0 : xp, level: isNaN(level) ? 1 : level };
}
function saveProgress(xp, level) {
  localStorage.setItem(keyXP(),    String(xp));
  localStorage.setItem(keyLevel(), String(level));
}
function clearProgress() {
  localStorage.removeItem(keyXP());
  localStorage.removeItem(keyLevel());
}

/* ========= Trainings-Status ========= */
let correctColor = null;
let trainXP = 0;
let trainLevel = 1;

/* ========= UI-Helfer ========= */
function setTrainUI(initial = false) {
  const timeEl   = document.getElementById('training-time');
  const lvlEl    = document.getElementById('train-level');
  const xpFillEl = document.getElementById('train-xp-fill');
  const xpAmtEl  = document.getElementById('train-xp-amount');
  if (lvlEl)    lvlEl.textContent = `Level ${trainLevel}`;
  if (xpAmtEl)  xpAmtEl.textContent = `${trainXP} XP`;
  if (xpFillEl) xpFillEl.style.width = `${Math.min(100, (trainXP % 20) * 5)}%`; // 20 XP → Level-Up
  if (initial && timeEl) timeEl.textContent = `${DURATION_SEC}s`;
}

function levelIfNeeded() {
  const newLevel = Math.floor(trainXP / 20) + 1;
  if (newLevel !== trainLevel) {
    trainLevel = newLevel;
  }
  // Immer UI aktualisieren + speichern
  const xpFillEl = document.getElementById('train-xp-fill');
  if (xpFillEl) xpFillEl.style.width = `${Math.min(100, (trainXP % 20) * 5)}%`;
  const xpAmtEl = document.getElementById('train-xp-amount');
  if (xpAmtEl) xpAmtEl.textContent = `${trainXP} XP`;
  const lvlEl = document.getElementById('train-level');
  if (lvlEl) lvlEl.textContent = `Level ${trainLevel}`;

  saveProgress(trainXP, trainLevel);
}

/* ========= TTS ========= */
function speak(text) {
  if ('speechSynthesis' in window) {
    const msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
  }
}

/* ========= Runden-Logik ========= */
function spawnRound() {
  const [a, b] = [...COLORS].sort(() => 0.5 - Math.random()).slice(0, 2);

  circle.dataset.color  = a.name;
  circle2.dataset.color = b.name;

  circle.style.background  = a.code;
  circle2.style.background = b.code;

  circle.style.display  = 'block';
  circle2.style.display = 'block';

  moveCircle();
  moveCircleSafely(circle2);

  setLastMoveTime(Date.now());

  correctColor = Math.random() < 0.5 ? a.name : b.name;
  speak(correctColor);
}

function handleCircleClick(e) {
  const chosen = e.target.dataset.color;
  if (!chosen) return;

  if (chosen === correctColor) {
    reactionTimes.push((Date.now() - lastMoveTime) / 1000);
    incrementScore();
    scoreDisplay.textContent = String(+scoreDisplay.textContent + 1);

    // XP erhöhen + Level-Check + speichern
    trainXP += 1;
    levelIfNeeded();

    spawnRound();
  } else {
    incrementMisses();
    triggerMissFlash();
  }
}

function handleMissClick(e) {
  if (e.target === circle || e.target === circle2) return;
  incrementMisses();
  triggerMissFlash();
}

/* ========= Ende → nur normaler Game-Over ========= */
function endTimedTrainingToGameOver() {
  // Timed-UI ausblenden (kosmetisch)
  const timedUI = document.getElementById('timed-training-ui');
  if (timedUI) timedUI.style.display = 'none';

  // Sicherheit: aktuellen Stand speichern
  saveProgress(trainXP, trainLevel);

  // Normale Auswertung + Anzeige des Game-Over-Screens
  baseEndGame();
}

/* ========= Externer Reset-Button (Training zurücksetzen) ========= */
function bindTrainingResetButton() {
  const btn = document.getElementById('training-reset');
  if (!btn) return;
  addManagedListener(btn, 'click', () => {
    // Fortschritt wirklich löschen
    clearProgress();
    resetGameState();
    startTrainingTimedColor();
  });
}

/* ========= Start ========= */
export function startTrainingTimedColor() {
  // 0) Clean start (Timer/Listener killen, UI/HUD resetten)
  resetGameState();

  // 1) Persistenten Fortschritt laden
  const loaded = loadProgress();
  trainXP = loaded.xp;
  trainLevel = Math.max(1, loaded.level);
  setTrainUI(true); // initial: Time setzen, Level/XP anzeigen

  // 2) Runde-Stats (Session) zurücksetzen
  resetScore();
  resetMisses();
  reactionTimes.length = 0;
  scoreDisplay.textContent = '0';

  // 3) UI: Timed-Training-Bereich einblenden
  const timedUI = document.getElementById('timed-training-ui');
  if (timedUI) timedUI.style.display = 'block';

  // 4) Screens
  startScreen.style.display    = 'none';
  gameOverScreen.style.display = 'none';
  gameScreen.style.display     = 'block';

  // 5) Listener (managed)
  if (circle)  addManagedListener(circle,  'click', handleCircleClick);
  if (circle2) addManagedListener(circle2, 'click', handleCircleClick);
  if (gameArea) addManagedListener(gameArea, 'click', handleMissClick);

  // Back/Restart/GameOver (managed + Reset)
  const backButton     = document.getElementById('back-button');
  const restartBtn     = document.getElementById('restart-button');
  const goBackGameOver = document.getElementById('gameover-back-button');

  if (backButton) {
    addManagedListener(backButton, 'click', () => {
      // Vor Verlassen speichern (zur Sicherheit)
      saveProgress(trainXP, trainLevel);
      resetGameState();
      gameScreen.style.display  = 'none';
      startScreen.style.display = 'block';
    });
  }
  if (restartBtn) {
    addManagedListener(restartBtn, 'click', () => {
      // Neustart Training: Fortschritt bleibt erhalten
      saveProgress(trainXP, trainLevel);
      resetGameState();
      startTrainingTimedColor();
    });
  }
  if (goBackGameOver) {
    addManagedListener(goBackGameOver, 'click', () => {
      resetGameState();
      gameOverScreen.style.display = 'none';
      startScreen.style.display    = 'block';
    });
  }

  // 6) Countdown starten + End-Hook registrieren
  setEndGame(endTimedTrainingToGameOver); // zeigt NUR den normalen Game-Over
  startCountdown(DURATION_SEC);
  registerInterval(countdownInterval);

  // 7) Erste Runde
  spawnRound();
}
