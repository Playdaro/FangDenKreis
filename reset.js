// reset.js
const _intervals = new Set();
const _listeners = [];

/** Merker für Intervals/Timeouts */
export function registerInterval(id) {
  if (id) _intervals.add(id);
}

/** Bequemer Wrapper: fügt Listener hinzu und merkt ihn sich automatisch */
export function addManagedListener(target, type, fn, options) {
  if (!target || !type || !fn) return;
  target.addEventListener(type, fn, options);
  _listeners.push({ target, type, fn, options });
}

/** Entfernt ALLE bekannten Timer, Listener, versteckt Kreise, leert Grid, setzt HUD */
export function resetGameState({ ui = true, state = true, audio = true } = {}) {
  // 1) Timer/Timeouts killen
  _intervals.forEach(id => { clearInterval(id); clearTimeout(id); });
  _intervals.clear();

  // 2) Event-Listener entfernen
  for (const { target, type, fn, options } of _listeners) {
    target.removeEventListener(type, fn, options);
  }
  _listeners.length = 0;

  // 3) UI aufräumen
  if (ui) {
    ['circle', 'circle2', 'circle3', 'circle4'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const grid = document.getElementById('grid-game');
    if (grid) { grid.innerHTML = ''; grid.style.display = 'none'; }

    // HUD auf Standardwerte
    setText('score', 0);
    setText('streak', 0);
    setText('timer', 30);
    setText('levelDisplay', 'Level 0');
    setText('xpAmount', '0 XP');
    setWidth('xpFill', '0%');

    // optional: spezielle Trainingsanzeigen zurücksetzen
    setText('audio-training-levelDisplay', 'Level 0');
    setText('audio-training-xpAmount', '0 XP');
    setWidth('audio-training-xpFill', '0%');
    setText('train-level', 'Level 1');
    setText('train-xp-amount', '0 XP');
    setWidth('train-xp-fill', '0%');
  }

  // 4) State zurücksetzen (nur, wenn du globalen State nutzt)
  if (state && window.gameState) {
    Object.assign(window.gameState, {
      running: false,
      mode: null,
      score: 0,
      streak: 0,
      hits: 0,
      misses: 0,
      startTime: null,
    });
  }

  // 5) Audio anhalten (falls Startscreen-Musik o. ä.)
  if (audio && typeof window.stopStartscreenMusic === 'function') {
    window.stopStartscreenMusic();
  }
}

// kleine Hilfsfunktionen
function setText(id, val) {
  const el = document.getElementById(id);
  if (el !== null) el.textContent = String(val);
}
function setWidth(id, val) {
  const el = document.getElementById(id);
  if (el !== null) el.style.width = val;
}
