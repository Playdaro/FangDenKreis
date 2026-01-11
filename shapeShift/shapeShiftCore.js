// shapeShiftCore.js
import { showScreen } from '../screens.js';

export const SHAPES = ['circle', 'square', 'triangle', 'star'];
export const COLORS = ['red', 'green', 'blue', 'yellow'];

let spawnTimer = null;
let hudTimer = null;

let hits = 0;
let wrongClicks = 0;     // echte Fehlklicks
let missedTargets = 0;   // Ziel war da, aber nicht geklickt
let startAt = 0;

let current = null; // { isTarget:boolean, handled:boolean }

export function startShapeShift(config) {
  stopShapeShift();

  hits = 0;
  wrongClicks = 0;
  missedTargets = 0;

  // ✅ Clean-Screen-Key
  showScreen('shapeShift');

  const playfield = document.getElementById('shapeShift-playfield');
  if (!playfield) {
    console.error('[ShapeShift] #shapeShift-playfield fehlt in index.html');
    return;
  }

  // HUD-Elemente (IDs wie bei dir aktuell)
  const modeEl   = document.getElementById('shapeShift-mode'); // optional
  const scoreEl  = document.getElementById('shapeShift-score');
  const missEl   = document.getElementById('shapeShift-misses'); // Fehlklicks
  const missedEl = document.getElementById('shapeShift-missedTargets'); // Verpasst
  const timerEl  = document.getElementById('shapeShift-timer');

  // Hint (transparent im Playfield)
  const hintEl = document.getElementById('shapeShift-hint');

  if (modeEl) modeEl.textContent = config.label || '–';

  // ---------- Target Handling ----------
  // Target ist ein Objekt: { mode: 'color'|'shape', value: string }
  function pickTarget() {
    if (config.targetMode === 'mixed') {
      const mode = Math.random() < 0.5 ? 'shape' : 'color';
      const value = mode === 'color' ? randomOf(config.colors) : randomOf(config.shapes);
      return { mode, value };
    }

    if (config.targetMode === 'color') {
      return { mode: 'color', value: randomOf(config.colors) };
    }

    // default: shape
    return { mode: 'shape', value: randomOf(config.shapes) };
  }

  function renderHint(t) {
    if (!hintEl) return;
    hintEl.textContent =
      t.mode === 'color'
        ? `Ziel: ${prettyColor(t.value)}`
        : `Ziel: ${prettyShape(t.value)}`;
  }

  let target = pickTarget();
  renderHint(target);

  // ---------- Timer (COUNT UP) ----------
  startAt = Date.now();

  // HUD initial
  if (scoreEl)  scoreEl.textContent  = String(hits);
  if (missEl)   missEl.textContent   = String(wrongClicks);
  if (missedEl) missedEl.textContent = String(missedTargets);
  if (timerEl)  timerEl.textContent  = '0';

  // HUD tick
  hudTimer = setInterval(() => {
    const elapsedSec = Math.floor((Date.now() - startAt) / 1000);
    if (timerEl)  timerEl.textContent  = String(elapsedSec);
    if (scoreEl)  scoreEl.textContent  = String(hits);
    if (missEl)   missEl.textContent   = String(wrongClicks);
    if (missedEl) missedEl.textContent = String(missedTargets);
  }, 200);

  function spawnNext() {
    // ✅ Ende nach X Zielen (Option C)
    if (config.goalHits && hits >= config.goalHits) {
      endGame(config, target);
      return;
    }

    // Ziel verpasst => "verpasst" (nur wenn das letzte Objekt ein Ziel war)
    if (current && current.isTarget && !current.handled) {
      missedTargets++;
    }

    // Spielfeld leeren, aber Hint behalten
    playfield.querySelectorAll('.shape-shift-item').forEach(n => n.remove());

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'shape-shift-item';

    // Zufällig ziehen (als let, weil wir ggf. Ziel erzwingen)
    let shape = randomOf(config.shapes);
    let color = randomOf(config.colors);

    // ✅ Option A: Target-Chance erzwingen (z.B. 0.35)
    const chance = Number(config.targetChance ?? 0);
    if (chance > 0 && Math.random() < chance) {
      if (target.mode === 'color') color = target.value;
      else shape = target.value;
    }

    const size = 84;
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.background = color;
    el.style.position = 'absolute';

    // Form
    if (shape === 'circle') {
      el.style.borderRadius = '50%';
      el.style.clipPath = '';
    } else if (shape === 'triangle') {
      el.style.borderRadius = '0';
      el.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
    } else if (shape === 'star') {
      el.style.borderRadius = '0';
      el.style.clipPath =
        'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
    } else {
      // square
      el.style.borderRadius = '0';
      el.style.clipPath = '';
    }

    // Ziel?
    const isTarget =
      target.mode === 'color'
        ? color === target.value
        : shape === target.value;

    current = { isTarget, handled: false };

    // Position im Playfield
    const rect = playfield.getBoundingClientRect();
    const pad = 10;
    const maxX = Math.max(pad, rect.width - size - pad);
    const maxY = Math.max(pad, rect.height - size - pad);

    el.style.left = (pad + Math.random() * (maxX - pad)) + 'px';
    el.style.top  = (pad + Math.random() * (maxY - pad)) + 'px';

    el.addEventListener('click', () => {
      if (!current || current.handled) return;
      current.handled = true;

      if (isTarget) {
        hits++;

        // Ziel wechselt nach jedem Treffer
        if (config.switchOnHit) {
          target = pickTarget();
          renderHint(target);
        }
      } else {
        wrongClicks++;
      }

      clearTimeout(spawnTimer);
      spawnTimer = setTimeout(spawnNext, 40);
    });

    playfield.appendChild(el);

    const delayMs = (randomBetween(config.speedMin, config.speedMax) || 1) * 1000;
    clearTimeout(spawnTimer);
    spawnTimer = setTimeout(spawnNext, delayMs);
  }

  spawnNext();
}

export function stopShapeShift() {
  if (spawnTimer) clearTimeout(spawnTimer);
  spawnTimer = null;

  if (hudTimer) clearInterval(hudTimer);
  hudTimer = null;

  current = null;
}

function endGame(config, target) {
  stopShapeShift();

  const modeEl   = document.getElementById('shapeShift-result-mode');
  const scoreEl  = document.getElementById('shapeShift-result-score');
  const missEl   = document.getElementById('shapeShift-result-misses');
  const targetEl = document.getElementById('shapeShift-result-target');

  // optional: falls du im Result auch "verpasst" anzeigen willst
  const missedEl =
    document.getElementById('shapeShift-result-missedTargets') ||
    document.getElementById('shapeShift-result-missed');

  if (modeEl)  modeEl.textContent  = config.label || '–';
  if (scoreEl) scoreEl.textContent = String(hits);
  if (missEl)  missEl.textContent  = String(wrongClicks);
  if (missedEl) missedEl.textContent = String(missedTargets);

  if (targetEl && target && target.mode) {
    targetEl.textContent =
      target.mode === 'color'
        ? `Letztes Ziel: ${prettyColor(target.value)}`
        : `Letztes Ziel: ${prettyShape(target.value)}`;
  }

  showScreen('shapeShift-result');
}

function randomOf(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  const a = Number(min ?? 0.6);
  const b = Number(max ?? 1.2);
  return Math.random() * (b - a) + a;
}

function prettyShape(s) {
  if (s === 'circle') return 'Kreis';
  if (s === 'square') return 'Quadrat';
  if (s === 'triangle') return 'Dreieck';
  if (s === 'star') return 'Stern';
  return s;
}

function prettyColor(c) {
  if (c === 'red') return 'Rot';
  if (c === 'green') return 'Grün';
  if (c === 'blue') return 'Blau';
  if (c === 'yellow') return 'Gelb';
  return c;
}
