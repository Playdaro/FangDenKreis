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

// Trainings-State
export let trainXP = 0;
export let trainLevel = 1;
export const XP_PER_LEVEL = 100;
export let trainingTime = 60;               // 60 s Gesamt
export let trainingTimerInterval = null;    // Ball-Wechsel
export let trainingCountdownInterval = null;// Countdown-Timer

// DOM-Refs für das 60 s-UI
export let trainingTimeDisplay;
export let trainLevelDisplay;
export let trainXPFill;
export let trainXPAmount;

// === NEU: Restart-Callback für "Weiter spielen" ===
export let currentRestart = null;
export function setRestart(fn) {
  currentRestart = typeof fn === 'function' ? fn : null;
}

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
  void gameArea.offsetWidth;               // Force reflow
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

  finalScore.textContent      = score;
  finalReaction.textContent   = avg;
  finalAccuracy.textContent   = acc + "%";
  finalMisses.textContent     = misses;
  playerNameFinal.textContent = playerName || '-';
}

// ---------- EndGame-Override-Mechanismus ----------
let endGameFn = baseEndGame;
export function setEndGame(fn) { endGameFn = fn || baseEndGame; }

/**
 * endGame(runArg?)
 * - ohne runArg: altes Verhalten (baseEndGame oder Override)
 * - mit runArg (Objekt): speichert Runde in Statistik ("Jetzt", "Historie", "Bestwerte")
 */
export function endGame(runArg) {
  if (runArg && typeof runArg === 'object') {
    try { recordAndRenderRun(runArg); } catch (e) { console.error('[endGame] record error', e); }
    return;
  }
  endGameFn();
}

// ---------- Statistik: Persist & Render ----------
function recordAndRenderRun(run) {
  const key = 'brc_runs';
  let runs = [];
  try { runs = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}

  runs.unshift({
    ts: run.finishedAt || new Date().toISOString(),
    mode: run.modeId || run.mode || 'unknown',
    group: run.modeGroup || null,
    diff: run.difficulty || null,
    score: Number(run.score||0),
    hits: Number(run.hits||0),
    misses: Number(run.misses||0),
    total: Number(run.total|| (Number(run.hits||0)+Number(run.misses||0))),
    avgRt: Number(run.avgRt||0),            // Sekunden
    acc:  Number(run.accuracy||0),          // 0..1
    hpm:  Number(run.hpm||0),
    bestStreak: Number(run.bestStreak||0),
    duration: Number(run.durationSec||0)    // Sekunden
  });
  runs = runs.slice(0, 200);
  try { localStorage.setItem(key, JSON.stringify(runs)); } catch {}

  // --- Jetzt ---
  setText('s-last-mode', runs[0].mode);
  setText('s-score', String(runs[0].score));
  setText('s-acc', Math.round(runs[0].acc*100) + '%');
  setText('s-avg', runs[0].avgRt.toFixed(2) + ' s');
  setText('s-beststreak', String(runs[0].bestStreak));
  setText('s-hpm', runs[0].hpm.toFixed(1));
  setText('s-duration', String(runs[0].duration) + ' s');

  // --- Zeitberechnung ---
  const now = Date.now();
  let totalSec=0, daySec=0, weekSec=0;
  for (const r of runs) {
    totalSec += r.duration||0;
    const t = Date.parse(r.ts||0);
    if (isNaN(t)) continue;
    if (isSameDay(t, now)) daySec += r.duration||0;
    if (now - t <= 7*86400e3) weekSec += r.duration||0;
  }
  setText('s-today',  daySec + ' s');
  setText('s-7d',     weekSec + ' s');
  setText('s-total',  totalSec + ' s');

  // --- Bestwerte ---
  const best = {
    bestscore: Math.max(...runs.map(r=>r.score||0)),
    longest:   Math.max(...runs.map(r=>r.duration||0)),
    bestAvg:   Math.min(...runs.map(r=>r.avgRt>0 ? r.avgRt : Infinity)),
    bestAcc:   Math.max(...runs.map(r=>r.acc||0)),
    bestHpm:   Math.max(...runs.map(r=>r.hpm||0)),
    bestStk:   Math.max(...runs.map(r=>r.bestStreak||0))
  };
  setText('b-bestscore', String(best.bestscore));
  setText('b-longest',   best.longest + ' s');
  setText('b-avg',       isFinite(best.bestAvg) ? best.bestAvg.toFixed(2) + ' s' : '–');
  setText('b-acc',       isFinite(best.bestAcc) ? Math.round(best.bestAcc*100) + '%' : '–');
  setText('b-hpm',       best.bestHpm.toFixed(1));
  setText('b-streak',    String(best.bestStk));

  // --- Letzte 5 Runden ---
  renderRunsTable(runs.slice(0,5));
}

// ---- Helpers für UI (einmalig, keine Duplikate!) ----
function setText(id, txt){ const el=document.getElementById(id); if(el) el.textContent=txt; }
function isSameDay(a,b){ const da=new Date(a),db=new Date(b);return da.getFullYear()===db.getFullYear()&&da.getMonth()===db.getMonth()&&da.getDate()===db.getDate(); }
function renderRunsTable(rows){
  const tbody=document.querySelector('#runs-table tbody');
  if(!tbody) return;
  tbody.innerHTML='';
  for(const r of rows){
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${fmtTs(r.ts)}</td>
      <td>${r.mode}</td>
      <td>${r.score}</td>
      <td>${isFinite(r.avgRt)?r.avgRt.toFixed(2)+' s':'–'}</td>
      <td>${isFinite(r.acc)?Math.round(r.acc*100)+'%':'–'}</td>
      <td>${r.duration||0} s</td>`;
    tbody.appendChild(tr);
  }
}
function bestMin(...vals){ const m = Math.min(...vals); return isFinite(m) ? m : Infinity; }
function bestMax(...vals){ const m = Math.max(...vals); return isFinite(m) ? m : -1; }
function fmtTs(ts){
  try{
    const d = new Date(ts);
    const p = n => String(n).padStart(2,'0');
    return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }catch{ return ts || '–'; }
}

// --- Optionaler UI-Refresh für Stats (aus Storage) ---
export function refreshStatsUI() {
  const key = 'brc_runs';
  let runs = [];
  try { runs = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
  if (!runs.length) return;

  // "Jetzt"
  setText('s-last-mode', runs[0].mode);
  setText('s-score', String(runs[0].score));
  setText('s-acc', Math.round((runs[0].acc||0)*100) + '%');
  setText('s-avg', isFinite(runs[0].avgRt) ? runs[0].avgRt.toFixed(2) + ' s' : '–');
  setText('s-beststreak', String(runs[0].bestStreak||0));
  setText('s-hpm', isFinite(runs[0].hpm) ? runs[0].hpm.toFixed(1) : '–');
  setText('s-duration', String(runs[0].duration||0) + ' s');

  // Zeiten
  const now = Date.now();
  let totalSec=0, daySec=0, weekSec=0;
  for (const r of runs) {
    totalSec += r.duration||0;
    const t = Date.parse(r.ts||0);
    if (isNaN(t)) continue;
    if (isSameDay(t, now)) daySec += r.duration||0;
    if (now - t <= 7*86400e3) weekSec += r.duration||0;
  }
  setText('s-today',  daySec + ' s');
  setText('s-7d',     weekSec + ' s');
  setText('s-total',  totalSec + ' s');

  // Bestwerte
  const best = {
    bestscore: Math.max(...runs.map(r=>r.score||0)),
    longest:   Math.max(...runs.map(r=>r.duration||0)),
    bestAvg:   Math.min(...runs.map(r=>r.avgRt>0 ? r.avgRt : Infinity)),
    bestAcc:   Math.max(...runs.map(r=>r.acc||0)),
    bestHpm:   Math.max(...runs.map(r=>r.hpm||0)),
    bestStk:   Math.max(...runs.map(r=>r.bestStreak||0))
  };
  setText('b-bestscore', String(best.bestscore));
  setText('b-longest',   best.longest + ' s');
  setText('b-avg',       isFinite(best.bestAvg) ? best.bestAvg.toFixed(2) + ' s' : '–');
  setText('b-acc',       isFinite(best.bestAcc) ? Math.round(best.bestAcc*100) + '%' : '–');
  setText('b-hpm',       best.bestHpm.toFixed(1));
  setText('b-streak',    String(best.bestStk));

  // Historie (5)
  renderRunsTable(runs.slice(0,5));
}



export function ensureFrontMelody() {
  if (window.frontMelody) return window.frontMelody;
  try {
    const a = new Audio('Frontmelodie.wav'); // falls Datei fehlt: catch in startFrontMelody()
    a.loop = true;
    window.frontMelody = a;
  } catch {
    window.frontMelody = null;
  }
  return window.frontMelody;
}

export function startFrontMelody() {
  try {
    const off = localStorage.getItem('musicOff') === '1';
    if (off) return;
    const a = ensureFrontMelody();
    if (!a) return;
    if (a.paused) a.play().catch(()=>{ /* Autoplay-Blocker */ });
  } catch {}
}

/**
 * Zentraler Re-Entry für „Zurück zum Start“
 * - Blendet Screens korrekt um
 * - Re-initialisiert Musik & Toggle
 * - Aktualisiert Stats unten/Modal
 */
export function showStart() {
  // Alle Screens aus
  const ids = ['info-screen','name-screen','game-screen','mind-switch','game-over-screen'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // Start-Screen an
  const start = document.getElementById('start-screen');
  if (start) start.style.display = 'block';

  // Footer/Audio/Stats
  try { startFrontMelody(); } catch {}
  try { refreshStatsUI(); } catch {}

  console.log('[Core] Reinit Startscreen ausgeführt.');
}

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

    // >>> NEU: Footer/Audio/Stats beim ersten Einstieg initialisieren
    try { startFrontMelody(); } catch {}
    try { refreshStatsUI(); } catch {}
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
  
  const btnContinue = document.getElementById('training-continue');
  const btnBack     = document.getElementById('training-back');

  if (btnContinue) {
    btnContinue.onclick = () => {
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
  if (audioTrainingLevelDisplay) audioTrainingLevelDisplay.textContent = 'Level 0';
  if (audioTrainingXPFill)       audioTrainingXPFill.style.width = '0%';
  if (audioTrainingXPAmount)     audioTrainingXPAmount.textContent = '0 XP';
}

export function incrementAudioTrainingXP() {
  const lvlCfg = audioTrainLevels[audioTrainLevel];
  audioTrainXP++;
  // Level-Up prüfen
  if (audioTrainXP >= lvlCfg.requiredHits && audioTrainLevel < audioTrainLevels.length - 1) {
    audioTrainXP = 0;
    audioTrainLevel++;
    if (audioTrainingLevelDisplay) audioTrainingLevelDisplay.textContent = 'Level ' + audioTrainLevel;
  }
  // UI updaten
  const pct = Math.min(100, (audioTrainXP / audioTrainLevels[audioTrainLevel].requiredHits) * 100);
  if (audioTrainingXPFill)   audioTrainingXPFill.style.width   = pct + '%';
  if (audioTrainingXPAmount) audioTrainingXPAmount.textContent = audioTrainXP + ' XP';
}

export function resetTimedTraining() {
  trainXP = 0;
  trainLevel = 1;
  trainingTime = 60;
  if (trainLevelDisplay)   trainLevelDisplay.textContent   = 'Level 1';
  if (trainXPFill)         trainXPFill.style.width         = '0%';
  if (trainXPAmount)       trainXPAmount.textContent       = '0 XP';
  if (trainingTimeDisplay) trainingTimeDisplay.textContent = '60s';
}

export function incrementTrainXP(amount = 1) {
  trainXP += amount;
  if (trainXP >= XP_PER_LEVEL) {
    trainXP -= XP_PER_LEVEL;
    trainLevel++;
    if (trainLevelDisplay) trainLevelDisplay.textContent = 'Level ' + trainLevel;
  }
  const pct = Math.min(100, (trainXP / XP_PER_LEVEL) * 100);
  if (trainXPFill)   trainXPFill.style.width     = pct + '%';
  if (trainXPAmount) trainXPAmount.textContent   = trainXP + ' XP';
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

// Endet das Training und zeigt den Game-Over-Screen
export function endTimedTraining() {
  clearInterval(trainingTimerInterval);
  baseEndGame();
}

// === Game-Over Buttons einmalig und robust verdrahten ===
(function wireGameOverButtonsOnce() {
  const over = document.getElementById('game-over-screen');
  if (!over || over.__wired) return;
  over.__wired = true;

  let restartBtn = document.getElementById('restart-button');
  let backBtn    = document.getElementById('gameover-back-button');

  // 1) Alle alten Listener entsorgen (Button klonen)
  if (restartBtn) {
    const clone = restartBtn.cloneNode(true);
    restartBtn.parentNode.replaceChild(clone, restartBtn);
    restartBtn = clone;
  }
  if (backBtn) {
    const clone = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(clone, backBtn);
    backBtn = clone;
  }

  // ---------- Funktionen ----------
  function showGame() {
    document.getElementById('game-over-screen')?.setAttribute('style', 'display:none; text-align:center;');
    document.getElementById('game-screen')?.setAttribute('style', '');
    document.getElementById('start-screen')?.setAttribute('style', 'display:none;');
  }

function showStart() {
  // Screens umschalten
  document.getElementById('game-over-screen')?.setAttribute('style', 'display:none; text-align:center;');
  document.getElementById('game-screen')?.setAttribute('style', 'display:none;');
  const start = document.getElementById('start-screen');
  if (start) start.style.display = 'block';

  // Musik wieder erlauben (kein direkter Start-Aufruf hier)
  try { window.fdkAllowStartMusic?.(); } catch {}

  // 📊/🔈 Buttons wieder EINBLENDEN
  const statsBtn = document.getElementById('stats-toggle');
  if (statsBtn) statsBtn.style.display = 'block';
  const audioBtn = document.getElementById('start-audio-toggle');
  if (audioBtn) audioBtn.style.display = 'block';

  // Stats-UI auffrischen (Jetzt/Bestwerte/Letzte 5)
  try { refreshStatsUI?.(); } catch {}

  console.log('[Core] Startscreen neu geladen (+ Buttons sichtbar).');
}


  // ---------- Restart & Back ----------
  if (restartBtn) {
    restartBtn.addEventListener('click', (e) => {
      e.stopImmediatePropagation(); // falls anderswo noch was hängt
      showGame();
      try {
        const t = document.getElementById('timer');
        if (t) t.textContent = '30';
        if (typeof currentRestart === 'function') {
          currentRestart();
        } else {
          // Fallback, wenn kein Restart-Callback gesetzt ist
          showStart();
        }
      } catch (err) {
        console.error('[Restart] Fehler beim Neustart:', err);
        showStart();
      }
    });
  }

  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      showStart();   // nutzt jetzt die neue Version oben
    });
  }
})(); // <--- Ende wireGameOverButtonsOnce
