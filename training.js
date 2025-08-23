// training.js – Visuelles Training (Level/XP) – 60s Countdown + normaler Game-Over-Screen
// Musik nur im Spiel aus: via Guard blocken/erlauben, kein Modul-Kreis (nutzt window.*)

import {
  // DOM & State
  circle,
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
  triggerMissFlash,
  setEndGame,
  baseEndGame,
  startCountdown,
  // vom Core gesetzte Timer-ID (nach startCountdown)
  countdownInterval
} from './core.js';

import {
  resetGameState,
  addManagedListener,
  registerInterval
} from './reset.js';

/** 60 Sekunden Gesamtdauer */
const DURATION_SEC = 60;

/** Level: XP-Schwellen + Erschein-Intervall (ms) */
const LEVELS = [
  { xp: 0,   appear: 900 },
  { xp: 10,  appear: 800 },
  { xp: 25,  appear: 700 },
  { xp: 45,  appear: 600 },
  { xp: 70,  appear: 520 },
  { xp: 100, appear: 450 },
];

let xp = 0;
let levelIdx = 0;
let appearTimer = null;

/* ---------- Musik-Helfer (nutzt window.* – keine Importe) ---------- */
function blockMusic() { try { window.fdkBlockStartMusic?.(); } catch {} }
function allowMusic() { try { window.fdkAllowStartMusic?.(); } catch {} }
function stopMusic()  { try { window.stopStartscreenMusic?.(); } catch {} }

/* ---------- UI-Helper ---------- */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(val);
}
function setWidth(id, val) {
  const el = document.getElementById(id);
  if (el) el.style.width = val;
}
function updateLevelUI() {
  const lvl = LEVELS[levelIdx];
  setText('levelDisplay', `Level ${levelIdx}`);
  setText('xpAmount', `${xp} XP`);
  const curXp  = xp - lvl.xp;
  const nextXp = (LEVELS[levelIdx + 1]?.xp ?? (lvl.xp + 1));
  const need   = Math.max(1, nextXp - lvl.xp);
  const pct    = Math.max(0, Math.min(100, Math.round((curXp / need) * 100)));
  setWidth('xpFill', `${pct}%`);
}

/* ---------- Level / Tempo ---------- */
function applyLevelSpeed() {
  if (appearTimer) {
    clearInterval(appearTimer);
    appearTimer = null;
  }
  const delay = LEVELS[levelIdx].appear;
  appearTimer = setInterval(() => {
    moveCircle();
    setLastMoveTime(Date.now());
  }, delay);
  registerInterval(appearTimer);
}

function tryLevelUp() {
  while (LEVELS[levelIdx + 1] && xp >= LEVELS[levelIdx + 1].xp) {
    levelIdx++;
  }
  updateLevelUI();
  applyLevelSpeed();
}

/* ---------- Events ---------- */
function handleHit() {
  reactionTimes.push((Date.now() - lastMoveTime) / 1000);
  incrementScore();
  scoreDisplay.textContent = String(+scoreDisplay.textContent + 1);
  xp += 1;
  tryLevelUp();
  moveCircle();
  setLastMoveTime(Date.now());
}

function handleMiss(e) {
  if (e.target === circle) return;
  incrementMisses();
  triggerMissFlash();
}

/* ---------- Ende → normaler Game-Over ---------- */
function endTrainingToGameOver() {
  // Auf dem Game-Over soll Musik erlaubt sein
  allowMusic();
  // Standardauswertung → zeigt „Spiel beendet!“-Screen mit allen Stats
  baseEndGame();
}

/* ---------- Externer Reset-Button (optional) ---------- */
function bindTrainingResetButton() {
  const btn = document.getElementById('training-reset');
  if (!btn) return;
  addManagedListener(btn, 'click', () => {
    // Fortschritt der Session resetten – Audio-Guard bleibt wie beim Start gesetzt
    resetGameState({ audio: false });
    startTraining();
  });
}

/* ---------- Start ---------- */
export function startTraining() {
  // 0) Wir gehen INS SPIEL → Musik blocken + sicher stoppen
  blockMusic();
  stopMusic();

  // 1) Clean start (Timer/Listener/UI resetten – Audio lassen wir in Ruhe)
  resetGameState({ audio: false });

  // 2) Session-Startwerte
  xp = 0;
  levelIdx = 0;
  updateLevelUI();

  resetScore();
  resetMisses();
  reactionTimes.length = 0;
  scoreDisplay.textContent = '0';

  // Timeranzeige auf 60 setzen (rückwärts via startCountdown)
  setText('timer', DURATION_SEC);

  // 3) End-Hook setzen + 60s Countdown starten (registrieren!)
  setEndGame(endTrainingToGameOver);
  startCountdown(DURATION_SEC);
  registerInterval(countdownInterval);

  // 4) Screens
  startScreen.style.display    = 'none';
  gameOverScreen.style.display = 'none';
  gameScreen.style.display     = 'block';

  // 5) Listener (managed) + Navigation
  if (circle) {
    circle.style.display = 'block';
    addManagedListener(circle, 'click', handleHit);
  }
  if (gameArea) {
    addManagedListener(gameArea, 'click', handleMiss);
  }
  bindTrainingResetButton();

  const backButton     = document.getElementById('back-button');
  const restartBtn     = document.getElementById('restart-button');       // „Weiter spielen“
  const goBackGameOver = document.getElementById('gameover-back-button');

  if (backButton) {
    addManagedListener(backButton, 'click', () => {
      // Zurück zum Start → Musik wieder erlauben (Startscreen darf spielen)
      allowMusic();
      resetGameState({ audio: false });
      gameScreen.style.display  = 'none';
      startScreen.style.display = 'block';
    });
  }
  if (restartBtn) {
    // „Weiter spielen“ → NOCH im Game-Over, Musik läuft evtl. → sofort blocken & stoppen
    addManagedListener(restartBtn, 'click', () => {
      blockMusic();  // ab jetzt darf Musik nicht mehr starten
      stopMusic();   // falls sie gerade spielt (Game-Over), sofort aus
      resetGameState({ audio: false });
      startTraining(); // neue Runde
    });
  }
  if (goBackGameOver) {
    addManagedListener(goBackGameOver, 'click', () => {
      // Zurück zum Start vom Game-Over → Musik wieder erlauben
      allowMusic();
      resetGameState({ audio: false });
      gameOverScreen.style.display = 'none';
      startScreen.style.display    = 'block';
    });
  }

  // 6) Erste Bewegung + Tempo nach aktuellem Level
  moveCircle();
  setLastMoveTime(Date.now());
  applyLevelSpeed(); // startet Intervall gemäß Level 0
}
