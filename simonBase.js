// simonBase.js – Basis für "Simon Sagt" (3×3)
// startSimon({ durationSec, startSeqLen, showMsBase, showMsDecay, betweenMs, difficulty, modeId, onError: 'repeat'|'shrink' })

import { resetGameState, addManagedListener, registerInterval } from './reset.js';

const GRID_SIZE = 3;
const $ = (id) => document.getElementById(id);
const getGrid = () => $('grid-game');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const randCell = () => Math.floor(Math.random() * GRID_SIZE * GRID_SIZE);

// kleine Helper für HUD
function setText(id, val) {
  const el = $(id);
  if (el) el.textContent = String(val);
}

export function startSimon(cfg) {
  const {
    durationSec = 60,
    startSeqLen = 1,
    showMsBase = 650,
    showMsDecay = 0.972,
    betweenMs = 250,
    difficulty = 'medium',
    modeId = 'memory-simon',
    onError = 'repeat', // 'repeat' | 'shrink'
  } = cfg || {};

  // sauberes Reset
  if (typeof resetGameState === 'function') resetGameState();

  // HUD init
  setText('score', 0);
  setText('streak', 0);
  setText('timer', durationSec);

  // Grid aufbauen
  const c = getGrid();
  c.style.display = 'grid';
  c.innerHTML = '';
  Object.assign(c.style, {
    display: 'grid',
    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
    gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
    gap: '6px',
    width: 'min(90vw, 480px)',
    height: 'min(90vw, 480px)',
    margin: '12px auto'
  });

  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const cell = document.createElement('button');
    cell.className = 'grid-cell';
    cell.dataset.idx = String(i);
    Object.assign(cell.style, {
      border: '2px solid #444', borderRadius: '12px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.1rem', userSelect: 'none', padding: '0',
      aspectRatio: '1/1', background: '#222', color: '#ddd',
      transition: 'transform 80ms ease, background 80ms ease'
    });
    c.appendChild(cell);
  }

  // --- State ---
  let sequence = [];
  let inputIndex = 0;
  let score = 0;
  let misses = 0;
  let bestStreak = 0;
  let currentStreak = 0;

  // Timer
  let timer = durationSec;
  let countdownInterval = null;

  // Phasen-Flags & Zeitmarken
  let isShowing = false;         // Anzeige-/„Merken“-Phase aktiv?
  let lastHighlightTime = 0;     // Ende der Anzeige
  let recallStart = null;        // Zeitpunkt des 1. Eingabeklicks der Runde
  let roundInputCount = 0;       // Klicks in aktueller Eingabephase

  // Memory-Metriken (für Statistik)
  let sumRecallPerItem = 0;      // Summe Ø Eingabezeit/Item über alle korrekt beendeten Runden
  let roundsDone = 0;            // Anzahl korrekt abgeschlossener Runden

  function setInputEnabled(on) {
    c.style.pointerEvents = on ? 'auto' : 'none';
  }

  function setActive(idx, on) {
    const cell = c.querySelector(`[data-idx="${idx}"]`);
    if (!cell) return;
    cell.style.background = on ? '#2ecc71' : '#222';
    cell.style.transform = on ? 'scale(1.05)' : 'scale(1.0)';
  }

  function extendSequence(n = 1) {
    for (let k = 0; k < n; k++) sequence.push(randCell());
  }

  function resetRoundInput() {
    inputIndex = 0;
    recallStart = null;
    roundInputCount = 0;
  }

  function wrongFeedback() {
    c.querySelectorAll('.grid-cell').forEach(el => el.style.background = '#c0392b');
    setTimeout(() => c.querySelectorAll('.grid-cell').forEach(el => el.style.background = '#222'), 150);
  }

  function rightFeedback(idx) {
    setActive(idx, true); setTimeout(() => setActive(idx, false), 120);
  }

  // Sequenz zeigen → währenddessen: Eingabe sperren + Timer pausiert
  async function showSequence() {
    isShowing = true;
    setInputEnabled(false);

    const len = sequence.length;
    const showMs = Math.max(260, Math.floor(showMsBase * Math.pow(showMsDecay, len)));

    for (let i = 0; i < len; i++) {
      const idx = sequence[i];
      setActive(idx, true);
      await sleep(showMs);
      setActive(idx, false);
      await sleep(betweenMs);
    }

    // Ende der Anzeige → ab jetzt dürfen Klicks zählen
    lastHighlightTime = performance.now();

    isShowing = false;
    setInputEnabled(true);
  }

  // Anzeige nach Delay planen – inkl. sofortiger Sperre
  async function scheduleShow(delayMs) {
    isShowing = true;
    setInputEnabled(false);
    await sleep(delayMs);
    await showSequence(); // schaltet am Ende wieder frei
  }

  // Countdown: tickt nur, wenn NICHT isShowing (→ pausiert während Anzeige)
  function startCountdown(onEnd) {
    countdownInterval = setInterval(() => {
      if (isShowing) return;
      timer--;
      setText('timer', timer);
      if (timer <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        onEnd && onEnd();
      }
    }, 1000);
    if (typeof registerInterval === 'function') registerInterval(countdownInterval);
  }

  function finish(reason = 'ended') {
    if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }

    const recallAvgPerItemSec = roundsDone > 0 ? (sumRecallPerItem / roundsDone) : 0;
    const itemsPerSec = recallAvgPerItemSec > 0 ? (1 / recallAvgPerItemSec) : 0;

    const detail = {
      reason, score, misses, bestStreak,
      duration: durationSec,
      difficulty,
      modeId,
      reactionTimes: [], // bewusst leer: Reflex-RT hier nicht sinnvoll
      memoryMetrics: { recallAvgPerItemSec, itemsPerSec }
    };
    document.dispatchEvent(new CustomEvent('memorymode:finished', { detail }));
  }

  // Eingabe – nur wenn nicht isShowing
  c.addEventListener('pointerdown', (e) => {
    if (isShowing) return; // während „Merken“ strikt blocken

    const target = e.target.closest('.grid-cell');
    if (!target) return;
    const idx = Number(target.dataset.idx);

    const now = performance.now();

    // Start der Eingabephase dieser Runde beim allerersten Klick
    if (recallStart === null) {
      recallStart = now;
    }
    roundInputCount++;

    const expected = sequence[inputIndex];
    if (idx === expected) {
      rightFeedback(idx);
      inputIndex++;

      if (inputIndex === sequence.length) {
        // Runde korrekt abgeschlossen → Recall-Tempo berechnen
        const roundDurationSec = (now - recallStart) / 1000;
        const perItem = roundDurationSec / sequence.length;
        sumRecallPerItem += perItem;
        roundsDone++;

        score++;
        currentStreak++;
        if (currentStreak > bestStreak) bestStreak = currentStreak;

        extendSequence(1);
        resetRoundInput();

        // vor nächster Anzeige kurz warten & dabei blocken
        scheduleShow(350);
      }
    } else {
      // Fehler
      misses++;
      currentStreak = 0;
      wrongFeedback();

      if (onError === 'shrink' && sequence.length > 1) {
        sequence.pop(); // macht die aktuelle Sequenz 1 kürzer
      }
      resetRoundInput();

      // neue Anzeige, ebenfalls mit kurzer Pause & Block
      scheduleShow(420);
    }

    setText('score', score);
    setText('streak', currentStreak);
  });

  // Back beendet sauber
  const backBtn = $('back-button');
  if (backBtn && typeof addManagedListener === 'function') {
    addManagedListener(backBtn, 'click', () => finish('aborted'));
  } else if (backBtn) {
    backBtn.addEventListener('click', () => finish('aborted'));
  }

  // Start
  extendSequence(startSeqLen);
  setText('timer', durationSec);
  startCountdown(() => finish('ended'));
  // Erste Anzeige: sofort sperren, dann zeigen
  scheduleShow(400);
}
