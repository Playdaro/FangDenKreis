// gridMedium.js – Medium = Kanten + Mitte [1,3,5,7,4]
// - Startdauer 1200ms
// - etwas schnelleres Ramp-up als Easy (0,5% pro Hit) + Bonus-Boost bei Streak 10 & 25
// - Minimum 800ms
// - Ziel bleibt nur begrenzte Zeit sichtbar (roundMs), dann Miss + Wechsel
// - Nach Hit sofort neues Ziel, NIE die gleiche Zelle wie vorher
// - Kurzes visuelles Hit-Feedback (.hit)

const START_MS    = 1200;   // Startdauer je Ziel
const MIN_MS      = 750;    // nie schneller als 0.8s
const SPEED_DECAY = 0.993;  // ~0,5% schneller pro Treffer

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

const ALLOW = [1, 3, 5, 7, 4]; // Kanten + Mitte

export function startGridMedium() {
  const container = document.getElementById('grid-game');
  const gameScreen = document.getElementById('game-screen');
  if (!container || !gameScreen) return;

  stopGridMedium(); // Reset

  // UI vorbereiten
  hideCircles();
  container.style.display = 'grid';
  gameScreen.style.display = 'block';

  // State initialisieren
  state.running = true;
  state.roundMs = START_MS;
  state.minRoundMs = MIN_MS;
  state.score = 0;
  state.misses = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.remaining = 30;
  state.allowIndices = ALLOW.slice();
  state.targetIndex = null;

  // Grid bauen
  container.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const div = document.createElement('div');
    div.className = 'grid-cell';
    div.dataset.index = String(i);
    div.addEventListener('pointerdown', onCellClick, { passive: true });
    container.appendChild(div);
  }
  window.addEventListener('keydown', onKey);

  setText('#score', '0');
  setText('#streak', '0');
  setText('#timer', String(state.remaining));

  // Erste Runde + Auto-Wechsel
  nextRound(null);     // excludeSameAs = null
  startSwitchTimer();

  // 30s Spielzeit
  state.countdownTimer = setInterval(() => {
    state.remaining -= 1;
    setText('#timer', String(state.remaining));
    if (state.remaining <= 0) finish('timeup');
  }, 1000);
}

export function stopGridMedium() {
  if (state.switchTimer)    clearInterval(state.switchTimer);
  if (state.countdownTimer) clearInterval(state.countdownTimer);
  state.switchTimer = null;
  state.countdownTimer = null;

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
  // Kanten + Mitte
  const map = {
    'ArrowUp'   : 1,
    'ArrowLeft' : 3,
    'ArrowRight': 5,
    'ArrowDown' : 7,
    'Enter'     : 4,
    ' '         : 4,
    'Numpad8':1, 'Numpad4':3, 'Numpad6':5, 'Numpad2':7, 'Numpad5':4
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
    // Hit-Feedback kurz sichtbar
    cell.classList.add('hit');
    setTimeout(() => cell.classList.remove('hit'), 140);

    state.score++;
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);

    // Basis-Beschleunigung
    state.roundMs = Math.max(state.minRoundMs, Math.round(state.roundMs * SPEED_DECAY));

    // Bonus-Boost bei Streak-Meilensteinen (macht's spürbar schneller)
    if (state.streak === 10 || state.streak === 25) {
      state.roundMs = Math.max(state.minRoundMs, Math.round(state.roundMs * 0.985)); // -1.5% extra
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

  // Kandidaten: erlaubte Indizes, aber NICHT der zuletzt aktive
  let pool = state.allowIndices;
  if (excludeIndex !== null && excludeIndex !== undefined) {
    pool = pool.filter(i => i !== excludeIndex);
  }
  if (pool.length === 0) pool = state.allowIndices.slice(); // Sicherheitsnetz

  // neues Ziel wählen
  const rnd = Math.floor(Math.random() * pool.length);
  state.targetIndex = pool[rnd];

  // aktiv markieren
  cells[state.targetIndex]?.classList.add('active');
}

function startSwitchTimer() {
  // Wechselt das Ziel nach Ablauf (Zeitfenster), zählt als Miss
  state.switchTimer = setInterval(() => {
    registerMiss();
    const prev = state.targetIndex;
    nextRound(prev); // nie gleiche Zelle wie vorher
  }, state.roundMs);
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
  stopGridMedium();
  window.dispatchEvent(new CustomEvent('gridmode:finished', {
    detail: {
      reason,
      score: state.score,
      misses: state.misses,
      bestStreak: state.bestStreak,
      duration: 30,
      difficulty: 'medium'
    }
  }));
}
