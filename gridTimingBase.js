// gridTimingBase.js – "Grid-Timing" Grund-Engine
// Regeln pro Start: 3x3 Grid, pro Ziel eine aktive Klickphase (windowSec).
// Während der aktiven Phase läuft der Rundentimer, sonst pausiert.
// Miss = falsches Feld ODER Timeout. Treffer = richtiges Feld innerhalb maxWaitSec.
// Nach X Treffern auf derselben Zelle wird eine andere (nicht gleiche) Zelle gewählt.
// Am Ende dispatchen wir 'gridtiming:finished' mit avgError (nur Hits).

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

export function startGridTiming({
  // feste Regeln aus deiner Beschreibung
  windowSec = 10,             // Länge einer aktiven Runde (nur hier läuft Timer)
  maxWaitSec = 5,             // maximale erlaubte Wartezeit bis Klick (innerhalb der 10s)
  changeAfterHits = 3,        // nach wie vielen korrekten Treffern wechselt die Zelle
  difficulty = 'easy',        // 'easy' | 'medium' | 'hard'
  modeId = 'grid-timing-easy' // für Stats
} = {}) {

  // --- Reset & HUD ---
  if (typeof resetGameState === 'function') resetGameState();

  const hudScore  = $('score');
  const hudStreak = $('streak');
  const hudTimer  = $('timer');
  const gameWrap  = $('game-screen');

  if (hudScore)  hudScore.textContent  = '0';
  if (hudStreak) hudStreak.textContent = '0';
  if (hudTimer)  hudTimer.textContent  = String(windowSec);

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
  let score = 0;
  let misses = 0;
  let bestStreak = 0;
  let currentStreak = 0;

  // timing & runden-steuerung
  let isActive = false;             // läuft gerade eine 10s-Runde?
  let roundLeftMs = windowSec * 1000;
  let roundTicker = null;

  // ziel & statistik
  let currentIdx = null;
  let hitsOnCurrent = 0;

  let roundStartTs = 0;   // Start der aktiven Runde
  let deadlineTs = 0;     // "spätester" erlaubter Klickzeitpunkt (roundStartTs + maxWaitSec)

  let totalErrorMs = 0;   // Summe der Abweichungen nur für Treffer
  let hitCount = 0;       // Anzahl gültiger Treffer für avgError

  function setHudTimer(ms) {
    if (!hudTimer) return;
    const s = Math.max(0, Math.ceil(ms / 1000));
    hudTimer.textContent = String(s);
  }

  function setActiveCell(idx, on) {
    const el = grid.querySelector(`[data-idx="${idx}"]`);
    if (el) {
      el.style.background = on ? '#2ecc71' : '#222';
      el.style.transform  = on ? 'scale(1.05)' : 'scale(1.0)';
    }
  }

  function lightOnly(idx) {
    grid.querySelectorAll('.grid-cell').forEach(el => {
      el.style.background = '#222';
      el.style.transform  = 'scale(1.0)';
    });
    setActiveCell(idx, true);
  }

  function wrongFeedback() {
    grid.querySelectorAll('.grid-cell').forEach(el => el.style.background = '#c0392b');
    setTimeout(() => grid.querySelectorAll('.grid-cell').forEach(el => el.style.background = '#222'), 150);
  }

  function updateBestStreak() {
    if (currentStreak > bestStreak) bestStreak = currentStreak;
  }

  // --- Rundensteuerung ---
  function startRound() {
    // ggf. Ziel wechseln?
    if (currentIdx == null || hitsOnCurrent >= changeAfterHits) {
      currentIdx = pickOtherIndex(currentIdx, GRID * GRID);
      hitsOnCurrent = 0;
    }

    // Ziel sichtbar machen
    lightOnly(currentIdx);

    // aktive Phase starten
    isActive = true;
    roundLeftMs = windowSec * 1000;
    roundStartTs = performance.now();
    deadlineTs = roundStartTs + Math.min(maxWaitSec, windowSec) * 1000; // Warte-Limit, aber nie > Fenster

    setHudTimer(roundLeftMs);

    // Ticker läuft NUR in aktiver Phase
    roundTicker = setInterval(() => {
      if (!isActive) return;
      const now = performance.now();
      roundLeftMs = Math.max(0, windowSec * 1000 - (now - roundStartTs));
      setHudTimer(roundLeftMs);

      // Timeout -> Miss
      if (now > deadlineTs) {
        endRound(false, null); // Miss (Timeout)
      }
    }, 50);
    if (typeof registerInterval === 'function') registerInterval(roundTicker);
  }

  function endRound(hit, clickTs) {
    // Stoppe aktive Phase
    isActive = false;
    clearInterval(roundTicker);
    roundTicker = null;

    // Auswertung
    if (hit) {
      const err = Math.abs(clickTs - deadlineTs);
      totalErrorMs += err;
      hitCount++;

      score++;
      currentStreak++;
      hitsOnCurrent++;
      updateBestStreak();
      if (hudScore)  hudScore.textContent  = String(score);
      if (hudStreak) hudStreak.textContent = String(currentStreak);
    } else {
      // Miss (falsches Feld oder Timeout)
      misses++;
      currentStreak = 0;
      if (hudStreak) hudStreak.textContent = String(currentStreak);
      wrongFeedback();
      // Bei Miss zählen wir nicht zu hitsOnCurrent; optional könnte man auch resetten:
      // hitsOnCurrent = 0;
    }

    // Zelle wieder "aus"
    grid.querySelectorAll('.grid-cell').forEach(el => {
      el.style.background = '#222';
      el.style.transform  = 'scale(1.0)';
    });

    // kurze Verschnaufpause (Timer pausiert!) und nächste Runde
    setTimeout(() => {
      startRound();
    }, 350);
  }

  // --- Input ---
  grid.addEventListener('pointerdown', (e) => {
    const target = e.target.closest('.grid-cell');
    if (!target) return;

    // nur in aktiver Phase werten
    if (!isActive) return;

    const idx = Number(target.dataset.idx);
    const now = performance.now();

    if (idx === currentIdx && now <= deadlineTs) {
      // gültiger Treffer
      endRound(true, now);
    } else {
      // falsches Feld ODER zu spät -> Miss
      endRound(false, null);
    }
  });

  // --- Back-Button beendet Session ---
  const backBtn = $('back-button');
  const abort = () => finish('aborted');
  if (backBtn && typeof addManagedListener === 'function') {
    addManagedListener(backBtn, 'click', abort);
  } else if (backBtn) {
    backBtn.addEventListener('click', abort);
  }

  function finish(reason = 'ended') {
    clearInterval(roundTicker);

    const avgError = hitCount > 0 ? (totalErrorMs / hitCount) : null;

    document.dispatchEvent(new CustomEvent('gridtiming:finished', {
      detail: {
        reason,
        score,
        misses,
        bestStreak,
        duration: windowSec,         // pro aktiver Runde – kann dein main.js ruhig so persistieren
        difficulty,
        modeId,
        avgError
      }
    }));
  }

  // --- Start: erste aktive Runde (Timer ist bis dahin "pausiert") ---
  // Minimale Verzögerung für Setup
  setTimeout(() => startRound(), 300);

  // Optional: du kannst eine feste Gesamtspielzeit definieren (z. B. 60 s netto aktiv)
  // und nach N Runden finish() rufen. Aktuell läuft es endlos, bis der Spieler zurückgeht.
}
