// gridHard.js – Hard = alle 9 Zellen [0..8]
// - Startdauer 1000ms
// - aggressiveres Ramp-up (~1.2% pro Hit) + Bonus-Boost bei Streak 10/25/40
// - Minimum 600ms
// - Ziel bleibt nur begrenzte Zeit sichtbar (roundMs), dann Miss + Wechsel
// - Nach Hit sofort neues Ziel, NIE die gleiche Zelle wie vorher
// - Kurzes visuelles Hit-Feedback (.hit)
// - Reset-sicher: nutzt resetGameState, addManagedListener, registerInterval
// - Reaktionszeit: misst Spawn→Treffer und füllt reactionTimes (für Game-Over-Ø)

import { reactionTimes, lastMoveTime, setLastMoveTime } from './core.js';
import { resetGameState, addManagedListener, registerInterval } from './reset.js';

const START_MS    = 1000;  // Startdauer je Ziel
const MIN_MS      = 600;   // nie schneller als 0.6s
const SPEED_DECAY = 0.988; // ~1.2% schneller pro Treffer

let state = {
  running: false,
  allowIndices: [],
  targetIndex: null,
  roundMs: START_MS,
  minRoundMs: MIN_MS,
  switchTimer: null,    // wechselt Ziel nach Ablauf der Zeit
  countdownTimer: null, // Spielzeit (30s)
  score: 0,
  misses: 0,
  bestStreak: 0,
  streak: 0,
  remaining: 30,
};

const ALLOW = [0,1,2,3,4,5,6,7,8]; // alle Felder

export function startGridHard() {
  const container  = document.getElementById('grid-game');
  const gameScreen = document.getElementById('game-screen');
  if (!container || !gameScreen) return;

  // Global sauber machen (killt alte Timer/Listener, versteckt Kreise/Grid)
  resetGameState();

  // Reaktionszeiten für diese Session leeren
  reactionTimes.length = 0;

  // UI vorbereiten
  hideCircles();
  container.style.display = 'grid';
  gameScreen.style.display = 'block';

  // State initialisieren
  state.running      = true;
  state.roundMs      = START_MS;
  state.minRoundMs   = MIN_MS;
  state.score        = 0;
  state.misses       = 0;
  state.streak       = 0;
  state.bestStreak   = 0;
  state.remaining    = 30;
  state.allowIndices = ALLOW.slice();
  state.targetIndex  = null;

  // Grid bauen
  container.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const div = document.createElement('div');
    div.className = 'grid-cell';
    div.dataset.index = String(i);
    // managed Listener → wird beim nächsten Reset automatisch entfernt
    addManagedListener(div, 'pointerdown', onCellClick);
    container.appendChild(div);
  }
  // Keyboard (managed)
  addManagedListener(window, 'keydown', onKey);

  setText('#score', '0');
  setText('#streak', '0');
  setText('#timer', String(state.remaining));

  // Erste Runde + Auto-Wechsel
  nextRound(null);     // excludeSameAs = null
  startSwitchTimer();

  // 30s Spielzeit (registrieren für Reset)
  state.countdownTimer = setInterval(() => {
    state.remaining -= 1;
    setText('#timer', String(state.remaining));
    if (state.remaining <= 0) finish('timeup');
  }, 1000);
  registerInterval(state.countdownTimer);
}

export function stopGridHard() {
  if (state.switchTimer)    clearInterval(state.switchTimer);
  if (state.countdownTimer) clearInterval(state.countdownTimer);
  state.switchTimer = null;
  state.countdownTimer = null;

  // explizit Key-Listener entfernen (managed räumt ohnehin auf; doppelt schadet nicht)
  window.removeEventListener('keydown', onKey);

  const container = document.getElementById('grid-game');
  if (container) {
    // Event-Listener sauber entfernen
    for (const c of [...container.children]) c.replaceWith(c.cloneNode(true));
    container.style.display = 'none';
    container.innerHTML = '';
  }
  state.running = false;
}

function hideCircles() {
  ['circle','circle2','circle3','circle4'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function onCellClick(e) {
  if (!state.running) return;
  const idx = Number(e.currentTarget?.dataset?.index ?? -1);
  handleSelection(idx);
}

function onKey(e) {
  if (!state.running) return;
  // Numpad-Layout auf 3x3 abbilden + QWE/ASD/ZXC als Alternative
  const map = {
    'Numpad7':0, 'Numpad8':1, 'Numpad9':2,
    'Numpad4':3, 'Numpad5':4, 'Numpad6':5,
    'Numpad1':6, 'Numpad2':7, 'Numpad3':8,
    'KeyQ':0, 'KeyW':1, 'KeyE':2,
    'KeyA':3, 'KeyS':4, 'KeyD':5,
    'KeyZ':6, 'KeyX':7, 'KeyC':8
  };
  if (map[e.code] !== undefined) {
    handleSelection(map[e.code]);
    e.preventDefault();
  }
}

function handleSelection(idx) {
  const cells = document.querySelectorAll('#grid-game .grid-cell');
  const cell = cells[idx];
  if (!cell) return;

  const wasTarget = (idx === state.targetIndex);

  if (wasTarget) {
    // === Reaktionszeit registrieren ===
    if (lastMoveTime) {
      const rtSec = (Date.now() - lastMoveTime) / 1000;
      if (rtSec >= 0 && rtSec < 10) reactionTimes.push(rtSec);
    }

    // Hit-Feedback kurz sichtbar
    cell.classList.add('hit');
    setTimeout(() => cell.classList.remove('hit'), 140);

    state.score++;
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);

    // Basis-Beschleunigung
    state.roundMs = Math.max(state.minRoundMs, Math.round(state.roundMs * SPEED_DECAY));

    // Bonus-Boosts bei Streak-Meilensteinen
    if (state.streak === 10 || state.streak === 25 || state.streak === 40) {
      state.roundMs = Math.max(state.minRoundMs, Math.round(state.roundMs * 0.98)); // -2% extra
    }

    restartSwitchTimer();

    // Neues Ziel, garantiert != vorherigem
    const prev = state.targetIndex;
    nextRound(prev);
  } else {
    // Fehlklick
    cell.classList.add('miss');
    setTimeout(() => cell.classList.remove('miss'), 160);
    registerMiss();
  }

  setText('#score', String(state.score));
  setText('#streak', String(state.streak));
}

function registerMiss() {
  if (!state.running) return;
  state.misses++;
  state.streak = 0;
  setText('#streak', '0');

  // altes Ziel optisch deaktivieren
  const cells = document.querySelectorAll('#grid-game .grid-cell');
  if (state.targetIndex !== null && cells[state.targetIndex]) {
    cells[state.targetIndex].classList.remove('active');
  }
}

function nextRound(excludeIndex) {
  const cells = document.querySelectorAll('#grid-game .grid-cell');

  // altes Ziel deaktivieren
  if (state.targetIndex !== null && cells[state.targetIndex]) {
    cells[state.targetIndex].classList.remove('active');
  }

  // Kandidaten: alle Indizes, aber NICHT der zuletzt aktive
  let pool = state.allowIndices;
  if (excludeIndex !== null && excludeIndex !== undefined) {
    pool = pool.filter(i => i !== excludeIndex);
  }
  if (pool.length === 0) pool = state.allowIndices.slice(); // Sicherheitsnetz

  // neues Ziel wählen
  const rnd = Math.floor(Math.random() * pool.length);
  state.targetIndex = pool[rnd];

  // aktiv markieren
  const targetCell = cells[state.targetIndex];
  if (targetCell) {
    targetCell.classList.add('active');
  }

  // === Spawn-Zeit für Reaktionsmessung setzen ===
  setLastMoveTime(Date.now());
}

function startSwitchTimer() {
  // Wechselt das Ziel nach Ablauf (Zeitfenster), zählt als Miss
  state.switchTimer = setInterval(() => {
    registerMiss();
    const prev = state.targetIndex;
    nextRound(prev); // nie gleiche Zelle wie vorher
  }, state.roundMs);
  registerInterval(state.switchTimer);
}

function restartSwitchTimer() {
  if (state.switchTimer) clearInterval(state.switchTimer);
  startSwitchTimer();
}

function setText(sel, txt) {
  const el = document.querySelector(sel);
  if (el) el.textContent = txt;
}

function finish(reason) {
  if (!state.running) return;
  stopGridHard();
  window.dispatchEvent(new CustomEvent('gridmode:finished', {
    detail: {
      reason,
      score: state.score,
      misses: state.misses,
      bestStreak: state.bestStreak,
      duration: 30,
      difficulty: 'hard'
      // Reaktionszeiten liegen global in core.reactionTimes – Game-Over nutzt sie für Ø.
    }
  }));
}
