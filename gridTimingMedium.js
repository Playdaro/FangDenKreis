// gridTimingMedium.js – Ampel-Variante mit 10.000 ms Gesamtzeitbank
// Die 10 s laufen NUR, während die Zielzelle grün ist. Nach Klick pausiert der Timer,
// beim nächsten Grün läuft er weiter. Bei 0 ms -> Session-Ende.

import { resetGameState, addManagedListener, registerInterval } from './reset.js';

const GRID = 3;
const $ = (id) => document.getElementById(id);
const getGrid = () => $('grid-game');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function pickOtherIndex(prev, max) {
  if (prev == null) return Math.floor(Math.random() * max);
  let idx;
  do { idx = Math.floor(Math.random() * max); } while (idx === prev);
  return idx;
}
function fmtSec3(ms) {
  const s = Math.max(0, ms) / 1000;
  return s.toLocaleString('de-DE', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' s';
}

export function startGridTimingMedium() {
  // --- Medium-Parameter ---
  const sessionBudgetMs = 10_000; // 10.000 ms = 10 s (läuft nur bei Grün)
  const maxWaitSec      = 7.5;    // spätestes Umschalten zu Grün
  const greenWindowMs   = 600;    // kürzeres Klickfenster als Easy
  const changeAfterHits = 2;      // nach 2 Treffern neues Feld
  const difficulty = 'medium';
  const modeId     = 'grid-timing-medium';

  // Reset & HUD
  if (typeof resetGameState === 'function') resetGameState();
  const hudScore  = $('score');
  const hudStreak = $('streak');
  const hudTimer  = $('timer');
  if (hudScore)  hudScore.textContent  = '0';
  if (hudStreak) hudStreak.textContent = '0';

  // Grid
  const grid = getGrid();
  grid.style.display = 'grid';
  grid.innerHTML = '';
  Object.assign(grid.style, {
    display: 'grid',
    gridTemplateColumns: `repeat(${GRID}, 1fr)`,
    gridTemplateRows: `repeat(${GRID}, 1fr)`,
    gap: '6px',
    width: 'min(90vw, 480px)',
    height: 'min(90vw, 480px)',
    margin: '12px auto'
  });
  for (let i = 0; i < GRID * GRID; i++) {
    const b = document.createElement('button');
    b.className = 'grid-cell';
    b.dataset.idx = String(i);
    Object.assign(b.style, {
      border: '2px solid #444', borderRadius: '12px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '1.1rem', userSelect: 'none', padding: '0',
      aspectRatio: '1/1', background: '#222', color: '#ddd',
      transition: 'transform 80ms ease, background 80ms ease'
    });
    grid.appendChild(b);
  }

  // --- State ---
  let score = 0, misses = 0, currentStreak = 0, bestStreak = 0;
  let currentIdx = null, hitsOnCurrent = 0;

  let isActive = false; // aktuell in einer Runde
  let isGreen  = false; // klickbar?

  // >>> Gesamt-Zeitbank (läuft nur bei Grün)
  let remainingMs = sessionBudgetMs;
  if (hudTimer) hudTimer.textContent = fmtSec3(remainingMs);

  let greenStartTs = 0;
  let lastTickTs   = 0;

  let ticker = null;
  let greenWindowTimeout = null;

  // (optional) Metriken
  let totalErrorMs = 0;
  let hitCount     = 0;

  function lightCell(idx, color) {
    const el = grid.querySelector(`[data-idx="${idx}"]`);
    if (!el) return;
    const map = { red: '#c0392b', green: '#2ecc71', off: '#222' };
    el.style.background = map[color] || '#222';
    el.style.transform  = color === 'off' ? 'scale(1.0)' : 'scale(1.05)';
  }
  function clearCells() {
    grid.querySelectorAll('.grid-cell').forEach(el => {
      el.style.background = '#222';
      el.style.transform  = 'scale(1.0)';
    });
  }
  function wrongFeedback() {
    grid.querySelectorAll('.grid-cell').forEach(el => el.style.background = '#e74c3c');
    setTimeout(() => clearCells(), 150);
  }
  function setHudTimer(ms) {
    if (hudTimer) hudTimer.textContent = fmtSec3(ms);
  }
  function updateBestStreak() {
    if (currentStreak > bestStreak) bestStreak = currentStreak;
  }
  function clearTimers() {
    if (ticker) { clearInterval(ticker); ticker = null; }
    if (greenWindowTimeout) { clearTimeout(greenWindowTimeout); greenWindowTimeout = null; }
  }

  async function runRound() {
    if (remainingMs <= 0) return finish('timeup');

    if (currentIdx == null || hitsOnCurrent >= changeAfterHits) {
      currentIdx = pickOtherIndex(currentIdx, GRID * GRID);
      hitsOnCurrent = 0;
    }

    isActive = true;
    isGreen  = false;

    clearCells();
    lightCell(currentIdx, 'red');

    // zufälliger Delay bis Grün: 0.5s .. maxWaitSec
    const switchDelayMs = Math.floor(500 + Math.random() * (maxWaitSec * 1000 - 500));
    const plannedGreenTs = performance.now() + switchDelayMs;

    ticker = setInterval(() => {
      const now = performance.now();

      // Umschalten zu Grün zum geplanten Zeitpunkt
      if (!isGreen && now >= plannedGreenTs) {
        isGreen = true;
        greenStartTs = now;
        lastTickTs   = now; // ab hier zählt die Bank runter
        lightCell(currentIdx, 'green');

        // kurzes Klickfenster (verpassen => Miss)
        greenWindowTimeout = setTimeout(() => {
          if (isActive && isGreen) endRound(false, null); // Fenster verpasst
        }, greenWindowMs);
      }

      // >>> Nur bei Grün die Gesamtzeit herunterzählen
      if (isGreen) {
        const delta = now - lastTickTs;
        lastTickTs = now;
        remainingMs = Math.max(0, remainingMs - delta);
        setHudTimer(remainingMs);

        if (remainingMs <= 0) {
          endRound(false, null); // Budget leer ⇒ Miss registrieren + Ende
          finish('timeup');
        }
      }
    }, 16);
    if (typeof registerInterval === 'function') registerInterval(ticker);
  }

  function endRound(hit, clickTime) {
    if (!isActive) return;
    isActive = false;

    clearTimers();

    if (hit) {
      const err = Math.max(0, clickTime - greenStartTs); // Reaktionszeit innerhalb Grün
      totalErrorMs += err;
      hitCount++;

      score++;
      currentStreak++;
      hitsOnCurrent++;
      updateBestStreak();
      if (hudScore)  hudScore.textContent  = String(score);
      if (hudStreak) hudStreak.textContent = String(currentStreak);
    } else {
      misses++;
      currentStreak = 0;
      if (hudStreak) hudStreak.textContent = String(currentStreak);
      wrongFeedback();
    }

    clearCells();
    if (remainingMs > 0) {
      setTimeout(() => runRound(), 320); // kleine Verschnaufpause; Budget pausiert (nicht grün)
    }
  }

  // Eingabe
  grid.addEventListener('pointerdown', (e) => {
    if (!isActive) return;
    const target = e.target.closest('.grid-cell');
    if (!target) return;
    const idx = Number(target.dataset.idx);
    const now = performance.now();

    // gültig nur: richtige Zelle + grün
    if (idx === currentIdx && isGreen) {
      endRound(true, now);
    } else {
      endRound(false, null);
    }
  });

  // Back beendet Session
  const backBtn = $('back-button');
  const abort = () => finish('aborted');
  if (backBtn && typeof addManagedListener === 'function') {
    addManagedListener(backBtn, 'click', abort);
  } else if (backBtn) {
    backBtn.addEventListener('click', abort);
  }

  function finish(reason = 'ended') {
    clearTimers();
    const avgError = hitCount > 0 ? (totalErrorMs / hitCount) : null;

    document.dispatchEvent(new CustomEvent('gridtiming:finished', {
      detail: {
        reason,
        score,
        misses,
        bestStreak,
        duration: sessionBudgetMs / 1000, // 10.000 ms Budget (nur Grün-Zeit)
        difficulty,
        modeId,
        avgError
      }
    }));
  }

  // Start
  setTimeout(() => runRound(), 300);
}
