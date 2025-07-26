// core.js – zentrales Fundament (Refactor-Version)

// ---------- Imports (Highscore zentral genutzt im EndGame) ----------
import { saveModeScore, updateHighscoreUI } from './highscore.js';

// ---------- DOM-Referenzen ----------
export let circle, circle2, circle3, circle4;
export let gameArea, scoreDisplay, timerDisplay;
export let startScreen, nameScreen, infoScreen, gameScreen, gameOverScreen;
export let finalScore, finalReaction, finalAccuracy, finalMisses, playerNameFinal;
export let levelDisplay, xpFill, xpAmount, resetBtn;
export let streakBox, streakValue, finalBestStreak;

// NEU: Training-Endscreen
export let trainingEndScreen, trainingFinalLevel, trainingFinalHits, trainingFinalMisses, trainingFinalReaction;

// ---------- Status-Variablen ----------
export let difficulty = '';
export let score = 0;
export let misses = 0;
export let reactionTimes = [];
export let lastMoveTime = 0; // Nur Hauptkreis. TODO Mehrkreis: Map je Kreis.

export let interval = null;
export let countdownInterval = null;
export let circle2Interval = null;
export let circle3Interval = null;
export let circle4Interval = null;

export let playerName = '';

export let currentStreak = 0;
export let bestStreak = 0;

// Trainingsmodus
export let stats;
export let currentLevel;
export let xp;

// --- Audio-Training XP/Level (eigenständig) ---
export let audioTrainXP = 0;
export let audioTrainLevel = 0;
export const audioTrainLevels = [
  { colorsCount: 2, requiredHits: 10 },
  { colorsCount: 3, requiredHits: 12 },
  { colorsCount: 4, requiredHits: 15 },
  { colorsCount: 4, requiredHits: 20 }
];
export let audioTrainingLevelDisplay, audioTrainingXPFill, audioTrainingXPAmount;

// core.js (ganz oben)

// Trainings‑State
export let trainXP = 0;
export let trainLevel = 1;
export const XP_PER_LEVEL = 100;
export let trainingTime = 60;               // 60 s Gesamt
export let trainingTimerInterval = null;    // Ball‑Wechsel
export let trainingCountdownInterval = null;// Countdown‑Timer

// DOM‑Refs für das 60 s‑UI
export let trainingTimeDisplay;
export let trainLevelDisplay;
export let trainXPFill;
export let trainXPAmount;



// ---------- Modus-Konfiguration ----------
export const MODE_CONFIG = {
  easy:   { appearTime: 1800, durationSec: 30, maxMisses: 5 },
  medium: { appearTime: 1200, durationSec: 30, maxMisses: 4 },
  hard:   { appearTime: 600,  durationSec: 30, maxMisses: 3 }
};

// Laufzeitdaten des aktuellen Modus
export let currentRun = null;
export function initModeRun(mode) {
  const cfg = MODE_CONFIG[mode];
  currentRun = cfg ? {
    mode,
    appearTime: cfg.appearTime,
    durationSec: cfg.durationSec,
    maxMisses: cfg.maxMisses
  } : null;
}

// ---------- Setter / Mutatoren ----------
export function setDifficulty(m)    { difficulty = m; }
export function resetScore()        { score = 0; }
export function resetMisses()       { misses = 0; }
export function clearReactionTimes(){ reactionTimes = []; }
export function setMainInterval(fn, ms) {
  clearInterval(interval);
  interval = setInterval(fn, ms);
}
export function clearCircleIntervals() {
  clearInterval(circle2Interval);
  clearInterval(circle3Interval);
  clearInterval(circle4Interval);
}
export function setXP(v)            { xp = v; }
export function setCurrentLevel(v)  { currentLevel = v; }
export function setLastMoveTime(ts) { lastMoveTime = ts; }

export function incrementScore()  { score++; }
export function incrementMisses() { misses++; }
export function incrementXP() {
  xp++;
  stats.xp = xp;
  localStorage.setItem('trainingStats', JSON.stringify(stats));
}
export function triggerMissFlash() {
  if (!gameArea) return;
  gameArea.classList.remove('miss-flash'); // reset, falls noch aktiv
  // Force reflow, damit Animation bei schnellen Misses erneut abspielt
  // (Optional, nur wenn Animation manchmal nicht triggert)
  void gameArea.offsetWidth;
  gameArea.classList.add('miss-flash');
  setTimeout(() => gameArea && gameArea.classList.remove('miss-flash'), 160);
}
export function resetStreaks() {
  currentStreak = 0;
  // bestStreak NICHT zurücksetzen innerhalb einer Runde – nur beim Start eines Runs
  if (streakValue) streakValue.textContent = '0';
  if (streakBox) streakBox.classList.remove('streak-milestone');
}

export function startNewRunStreakReset() {
  currentStreak = 0;
  bestStreak = 0;
  if (streakValue) streakValue.textContent = '0';
  if (streakBox) {
    streakBox.classList.remove('streak-milestone');
  }
}

export function registerHitForStreak() {
  currentStreak++;
  if (currentStreak > bestStreak) bestStreak = currentStreak;

  if (streakValue) streakValue.textContent = currentStreak;

  // Animations-Reset
  if (streakBox) {
    streakBox.classList.remove('streak-pop');
    void streakBox.offsetWidth; // reflow
    streakBox.classList.add('streak-pop');

    // Milestones (5 / 10 / 20 …) – anpassbar
    if ([5,10,15,20,30].includes(currentStreak)) {
      streakBox.classList.add('streak-milestone');
      // Entferne Milestone-Hervorhebung nach kurzer Zeit
      setTimeout(() => streakBox && streakBox.classList.remove('streak-milestone'), 1200);
    }
  }
}

export function registerMissForStreak() {
  currentStreak = 0;
  if (streakValue) streakValue.textContent = '0';
  if (streakBox) streakBox.classList.remove('streak-milestone');
}

// ---------- Zentrale Auswertung (wird in baseEndGame genutzt) ----------
export function finalizeModeRun() {
  if (!currentRun || !['easy','medium','hard'].includes(difficulty)) return null;

  const { mode, appearTime, durationSec, maxMisses } = currentRun;
  const hits = score;
  const avgReaction = reactionTimes.length
    ? reactionTimes.reduce((a,b)=>a+b,0) / reactionTimes.length
    : 0;

  const modeScore = saveModeScore(mode, {
    hits,
    misses,
    avgReaction,
    appearTime,
    maxMisses,
    durationSec
  });

  updateHighscoreUI();
  return modeScore;
}

// ---------- EndGame-Override-Mechanismus ----------
export function baseEndGame() {
  // Falls normaler Modus: zentrale Highscore-Verarbeitung
  if (['easy','medium','hard'].includes(difficulty)) {
    finalizeModeRun();
  }

  clearInterval(countdownInterval);
  gameScreen.style.display     = "none";
  gameOverScreen.style.display = "block";

  const avg   = reactionTimes.length
    ? (reactionTimes.reduce((a,b)=>a+b)/reactionTimes.length).toFixed(2)
    : "0.00";
  const total = score + misses;
  const acc   = total > 0 ? ((score/total)*100).toFixed(1) : "100";

  finalScore.textContent    = score;
  finalReaction.textContent = avg;
  finalAccuracy.textContent = acc + "%";
  finalMisses.textContent   = misses;
  playerNameFinal.textContent = playerName || '-';
}

// EndGame-Override-Mechanismus
let endGameFn = baseEndGame;
export function setEndGame(fn) { endGameFn = fn || baseEndGame; }
export function endGame() { endGameFn(); }


// ---------- Initialisierung ----------
export function initCore() {
  circle   = document.getElementById("circle");
  circle2  = document.getElementById("circle2");
  circle3  = document.getElementById("circle3");
  circle4  = document.getElementById("circle4");

  gameArea     = document.getElementById("game");
  scoreDisplay = document.getElementById("score");
  timerDisplay = document.getElementById("timer");

  infoScreen     = document.getElementById("info-screen");
  nameScreen     = document.getElementById("name-screen");
  startScreen    = document.getElementById("start-screen");
  gameScreen     = document.getElementById("game-screen");
  gameOverScreen = document.getElementById("game-over-screen");

  finalScore      = document.getElementById("final-score");
  finalReaction   = document.getElementById("final-reaction");
  finalAccuracy   = document.getElementById("final-accuracy");
  finalMisses     = document.getElementById("final-misses");
  playerNameFinal = document.getElementById("player-name-final");

  streakBox   = document.getElementById('streak-box');
  streakValue = document.getElementById('streak');
  finalBestStreak = document.getElementById('final-best-streak'); // falls im HTML vorhanden

  // >>> NEU: Training-Endscreen Referenzen <<<
  trainingEndScreen     = document.getElementById('training-end-screen');
  trainingFinalLevel    = document.getElementById('training-final-level');
  trainingFinalHits     = document.getElementById('training-final-hits');
  trainingFinalMisses   = document.getElementById('training-final-misses');
  trainingFinalReaction = document.getElementById('training-final-reaction');
  // <<< ENDE NEU >>>
  audioTrainingLevelDisplay = document.getElementById('audio-training-levelDisplay');
  audioTrainingXPFill        = document.getElementById('audio-training-xpFill');
  audioTrainingXPAmount      = document.getElementById('audio-training-xpAmount');


  levelDisplay = document.getElementById("levelDisplay");
  xpFill       = document.getElementById("xpFill");
  xpAmount     = document.getElementById("xpAmount");
  resetBtn     = document.getElementById("training-reset");

    // Am Ende von initCore():
  trainingTimeDisplay = document.getElementById('training-time');
  trainLevelDisplay   = document.getElementById('train-level');
  trainXPFill         = document.getElementById('train-xp-fill');
  trainXPAmount       = document.getElementById('train-xp-amount');


  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem('trainingStats');
      stats = { bestLevel: 0, xp: 0 };
      currentLevel = 0;
      xp = 0;
      if (typeof startTraining === 'function') {
        startTraining();
      }
    });
  }

  stats = { bestLevel: 0, xp: 0 };
  currentLevel = 0;
  xp = 0;

  window.onload = () => {
    const seen  = localStorage.getItem("instructionsSeen");
    const saved = localStorage.getItem("lastPlayerName");

    if (seen) infoScreen.style.display = "none";

    if (seen && saved) {
      playerName = saved;
      nameScreen.style.display = "none";
      startScreen.style.display = "block";
    } else if (seen) {
      nameScreen.style.display = "block";
      startScreen.style.display = "none";
    } else {
      infoScreen.style.display = "block";
      nameScreen.style.display = "none";
    }

    gameScreen.style.display     = "none";
    gameOverScreen.style.display = "none";
  };
} // <--- Ende initCore

// ==== Persistenter Best-Streak ====
export function loadPersistedBestStreak() {
  if (!playerName) return 0;
  return +localStorage.getItem(`bestStreak_${playerName}`) || 0;
}

export function updateBestStreakDisplay() {
  const el = document.getElementById('best-streak-display');
  if (!el || !playerName) return;
  el.textContent = 'Bester Streak: ' + loadPersistedBestStreak();
}

// ---------- Bewegungen ----------
export function moveCircle() {
  if (!gameArea || !circle) return;
  const maxX = gameArea.clientWidth - circle.clientWidth;
  const maxY = gameArea.clientHeight - circle.clientHeight;
  circle.style.left = `${Math.random() * maxX}px`;
  circle.style.top  = `${Math.random() * maxY}px`;
  lastMoveTime = Date.now();
}

export function moveCircleSafely(el) {
  if (!gameArea || !el) return;
  const maxX = gameArea.clientWidth - el.clientWidth;
  const maxY = gameArea.clientHeight - el.clientHeight;
  let x, y, overlap;
  do {
    x = Math.random() * maxX;
    y = Math.random() * maxY;
    overlap = [circle, circle2, circle3, circle4]
      .filter(o => o && o !== el && o.style.display !== "none")
      .some(o => {
        const r = o.getBoundingClientRect();
        return !(x + el.clientWidth < r.left || x > r.right || y + el.clientHeight < r.top || y > r.bottom);
      });
  } while (overlap);
  el.style.left = `${x}px`;
  el.style.top  = `${y}px`;
  // HINWEIS: lastMoveTime nur für Hauptkreis aktualisiert.
}

// Zusatzkreise (vorbereitet – noch ungenutzt)
export function startCircle2() {
  moveCircleSafely(circle2);
  clearInterval(circle2Interval);
  circle2Interval = setInterval(() => moveCircleSafely(circle2), 2500);
}
export function startCircle3() {
  moveCircleSafely(circle3);
  clearInterval(circle3Interval);
  circle3Interval = setInterval(() => moveCircleSafely(circle3), 2200);
}
export function startCircle4() {
  moveCircleSafely(circle4);
  clearInterval(circle4Interval);
  circle4Interval = setInterval(() => moveCircleSafely(circle4), 1800);
}

// ---------- Countdown ----------
export function startCountdown(sec = 30) {
  clearInterval(countdownInterval);
  let t = sec;
  timerDisplay.textContent = t;
  countdownInterval = setInterval(() => {
    if (--t <= 0) {
      clearInterval(countdownInterval);
      return (difficulty === "training") ? endTraining() : endGame();
    }
    timerDisplay.textContent = t;
  }, 1000);
}

// ---------- Trainingslevel ----------
export const levels = Array.from({ length: 21 }, (_, lvl) => ({
  circles:      1 + Math.min(4, Math.floor(lvl / 5)),
  appearTime:   Math.max(200, 2000 - lvl * 100),
  maxMisses:    lvl < 5 ? 3 : lvl < 10 ? 2 : 1,
  requiredHits: 10 + lvl * 5
}));

export function endTraining() {
  clearInterval(interval);
  clearInterval(countdownInterval);
  if (resetBtn) resetBtn.style.display = 'none';

  // Stats berechnen (analog baseEndGame)
  const hits = score;
  const avgReaction = reactionTimes.length
    ? (reactionTimes.reduce((a,b)=>a+b,0) / reactionTimes.length).toFixed(2)
    : "0.00";

  // Screens umschalten
  gameScreen.style.display       = "none";
  if (trainingEndScreen) trainingEndScreen.style.display = "block";

  // Werte füllen
  if (trainingFinalLevel)   trainingFinalLevel.textContent   = currentLevel;
  if (trainingFinalHits)    trainingFinalHits.textContent    = hits;
  if (trainingFinalMisses)  trainingFinalMisses.textContent  = misses;
  if (trainingFinalReaction)trainingFinalReaction.textContent= avgReaction;
  
  // Buttons binden (einmalig beim ersten Ende wäre besser, einfache Variante hier):
  const btnContinue = document.getElementById('training-continue');
  const btnBack     = document.getElementById('training-back');

  if (btnContinue) {
    btnContinue.onclick = () => {
      // Weiter spielen = Training erneut starten (entweder gleiches Level oder hoch?)
      // Angenommen: du willst einfach weitermachen auf aktuellem Level (kein Reset)
      // Falls du bei Levelaufstieg schon erhöht hast, lassen wir currentLevel so.
      if (trainingEndScreen) trainingEndScreen.style.display = "none";
      startTraining(); // Funktion aus training.js
    };
  }
  if (btnBack) {
    btnBack.onclick = () => {
      if (trainingEndScreen) trainingEndScreen.style.display = "none";
      startScreen.style.display = "block";
    };
  }
}
export function resetAudioTraining() {
  audioTrainXP = 0;
  audioTrainLevel = 0;
  if (audioTrainingLevelDisplay) audioTrainingLevelDisplay.textContent = 'Level 0';
  if (audioTrainingXPFill)       audioTrainingXPFill.style.width = '0%';
  if (audioTrainingXPAmount)     audioTrainingXPAmount.textContent = '0 XP';
}

export function incrementAudioTrainingXP() {
  const lvlCfg = audioTrainLevels[audioTrainLevel];
  audioTrainXP++;
  // Level-Up prüfen
  if (audioTrainXP >= lvlCfg.requiredHits && audioTrainLevel < audioTrainLevels.length - 1) {
    audioTrainXP = 0;
    audioTrainLevel++;
    if (audioTrainingLevelDisplay) audioTrainingLevelDisplay.textContent = 'Level ' + audioTrainLevel;
  }
  // UI updaten
  const pct = Math.min(100, (audioTrainXP / audioTrainLevels[audioTrainLevel].requiredHits) * 100);
  if (audioTrainingXPFill)   audioTrainingXPFill.style.width   = pct + '%';
  if (audioTrainingXPAmount) audioTrainingXPAmount.textContent = audioTrainXP + ' XP';
}
export function resetTimedTraining() {
  trainXP = 0;
  trainLevel = 1;
  trainingTime = 60;
  if (trainLevelDisplay)   trainLevelDisplay.textContent   = 'Level 1';
  if (trainXPFill)         trainXPFill.style.width         = '0%';
  if (trainXPAmount)       trainXPAmount.textContent       = '0 XP';
  if (trainingTimeDisplay) trainingTimeDisplay.textContent = '60s';
}

export function incrementTrainXP(amount = 1) {
  trainXP += amount;
  if (trainXP >= XP_PER_LEVEL) {
    trainXP -= XP_PER_LEVEL;
    trainLevel++;
    if (trainLevelDisplay) trainLevelDisplay.textContent = 'Level ' + trainLevel;
    
  }
  const pct = Math.min(100, (trainXP / XP_PER_LEVEL) * 100);
  if (trainXPFill)   trainXPFill.style.width     = pct + '%';
  if (trainXPAmount) trainXPAmount.textContent   = trainXP + ' XP';
}

export function startTrainingTimer() {
  clearInterval(trainingCountdownInterval);
  trainingCountdownInterval = setInterval(() => {
    trainingTime--;
    if (trainingTimeDisplay) trainingTimeDisplay.textContent = trainingTime + 's';
    if (trainingTime <= 0) {
      clearInterval(trainingCountdownInterval);
      clearInterval(trainingTimerInterval);
      endTimedTraining();   // s.u.
    }
  }, 1000);
}

// Endet das Training und zeigt den Game‑Over‑Screen
export function endTimedTraining() {
  clearInterval(trainingTimerInterval);
  baseEndGame();
}
