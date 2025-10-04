// shapeShift.js – N Formen + N Farben; Ziel ist ENTWEDER Farbe ODER Form; HUD unter Streak
import { endGame, startCountdown, setRestart } from './core.js';

const rand = (min, max) => Math.random() * (max - min) + min;

// 5 feste Farben (HEX) + deutsche Namen
export const COLORS = [
  { hex: '#e74c3c', name: 'Rot'   },
  { hex: '#27ae60', name: 'Grün'  },
  { hex: '#2980b9', name: 'Blau'  },
  { hex: '#f1c40f', name: 'Gelb'  },
  { hex: '#9b59b6', name: 'Lila'  },
];

// 9 Formen (per CSS-Klasse; Styles in style.css via clip-path)
export const SHAPES = [
  { cls: 'circle',   name: 'Kreis'   },
  { cls: 'square',   name: 'Viereck' },
  { cls: 'triangle', name: 'Dreieck' },
  { cls: 'diamond',  name: 'Raute'   },
  { cls: 'pentagon', name: 'Fünfeck' },
  { cls: 'hexagon',  name: 'Sechseck'},
  { cls: 'star',     name: 'Stern'   },
  { cls: 'heart',    name: 'Herz'    },
  { cls: 'octagon',  name: 'Achteck' },
];

/**
 * Startet den Shape-Shift-Modus
 * @param {{count:number, speedMin:number, speedMax:number, shapes:Array, colors:Array, limitMs?:number}} config
 */
export function startShapeShift(config) {
  const { count, speedMin, speedMax, shapes, colors, limitMs } = config;

  // Regel: genau N Formen + N Farben
  if (shapes.length !== count || colors.length !== count) {
    throw new Error(
      `ShapeShift: shapes.length (${shapes.length}) und colors.length (${colors.length}) müssen == count (${count}) sein.`
    );
  }

  const game = document.getElementById('game');
  const screen = document.getElementById('game-screen');
  if (!game || !screen) {
    console.error('[ShapeShift] Spielfläche fehlt (#game / #game-screen).');
    return;
  }

  // Sichtbarkeit hart setzen
  screen.style.display = 'block';
  const start = document.getElementById('start-screen');
  if (start) start.style.display = 'none';
  const over = document.getElementById('game-over-screen');
  if (over)  over.style.display  = 'none';

  clearShapes(game);

  // Legacy-Kreise der Speed-Modi im Shape-Shift hart verstecken
  ['circle','circle2','circle3','circle4'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // Grid-Container sicherheitshalber auch zu
  const grid = document.getElementById('grid-game');
  if (grid) grid.style.display = 'none';

  // --- Center-Target einmalig anlegen ---
  let centerRoot = game.querySelector('#ss-center-target');
  if (!centerRoot) {
    centerRoot = document.createElement('div');
    centerRoot.id = 'ss-center-target';
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = '';
    centerRoot.appendChild(label);
    game.appendChild(centerRoot);
  }
  const centerLabel = centerRoot.querySelector('.label');

  // Helper zum Aktualisieren des Center-Labels
  function updateCenterTarget(target) {
    centerRoot.classList.remove('color');
    centerLabel.classList.remove('pop');

    if (!target) {
      centerLabel.textContent = '';
      centerLabel.style.color = '#fff';
      return;
    }

    centerLabel.textContent = `Fang: ${target.name}`;

    if (target.kind === 'color' && target.colorHex) {
      centerRoot.classList.add('color');
      centerLabel.style.color = target.colorHex;
    } else {
      centerLabel.style.color = '#ffffff';
    }

    // Pop-Animation neu triggern
    // eslint-disable-next-line no-unused-expressions
    centerLabel.offsetWidth;
    centerLabel.classList.add('pop');
  }

  // HUD (unter dem Streak)
  const hud = ensureHud(screen);
  hud.style.display = 'inline-block';

  let score = 0;
  const scoreEl = document.getElementById('score');
  if (scoreEl) scoreEl.textContent = '0';
  let misses = 0;
  let running = true;
  let rafId = null;

  const bounds = () => game.getBoundingClientRect();

  // Anfangsbelegung: N eindeutige Paare
  const forms = shuffle([...shapes]).slice(0, count);
  const cols  = shuffle([...colors]).slice(0, count);

  // ---------- NEU: deterministische Startpositionen (Ecken/Mitte) ----------
  const objs = [];
  const g = bounds();

  // Hilfsfunktionen für Corner/Mitte-Spawn
  const PADDING = 14;           // etwas Abstand zu Rand
  const CORNER_ZONE = 24;       // kleine Streuung in der Ecke
  function cornerPos(which, size) {
    switch (which) {
      case 'TL': return {
        x: PADDING + Math.random() * CORNER_ZONE,
        y: PADDING + Math.random() * CORNER_ZONE
      };
      case 'TR': return {
        x: Math.max(PADDING, g.width - size - PADDING - Math.random() * CORNER_ZONE),
        y: PADDING + Math.random() * CORNER_ZONE
      };
      case 'BL': return {
        x: PADDING + Math.random() * CORNER_ZONE,
        y: Math.max(PADDING, g.height - size - PADDING - Math.random() * CORNER_ZONE)
      };
      case 'BR': return {
        x: Math.max(PADDING, g.width - size - PADDING - Math.random() * CORNER_ZONE),
        y: Math.max(PADDING, g.height - size - PADDING - Math.random() * CORNER_ZONE)
      };
      default: // center
        return {
          x: Math.max(PADDING, (g.width - size) / 2 + (Math.random() * 20 - 10)),
          y: Math.max(PADDING, (g.height - size) / 2 + (Math.random() * 20 - 10))
        };
    }
  }

  function initialVelocityFromAnchor(anchor, speedMin, speedMax) {
    // bewegt von der Ecke leicht nach innen
    const speed = rand(speedMin, speedMax);
    let vx = 0, vy = 0;
    switch (anchor) {
      case 'TL': vx = +speed; vy = +speed; break;
      case 'TR': vx = -speed; vy = +speed; break;
      case 'BL': vx = +speed; vy = -speed; break;
      case 'BR': vx = -speed; vy = -speed; break;
      default:   // center → random
        vx = (Math.random() < 0.5 ? -1 : 1) * speed;
        vy = (Math.random() < 0.5 ? -1 : 1) * speed;
    }
    return { vx, vy };
  }

  // Ankerreihenfolge je count
  // Easy: 3 Ecken (TL, TR, BL)
  // Medium: 4 Ecken (TL, TR, BL, BR)
  // Hard: 4 Ecken + Mitte
  const anchors =
    count >= 5 ? ['TL','TR','BL','BR','C'] :
    count === 4 ? ['TL','TR','BL','BR'] :
    /* count === 3 */ ['TL','TR','BL'];

  for (let i = 0; i < count; i++) {
    const s = forms[i];
    const c = cols[i];

    const el = document.createElement('div');
    el.className = `ss-shape ${s.cls}`;
    el.style.background = c.hex;
    el.setAttribute('data-shape', s.cls);
    el.setAttribute('data-color', c.hex);
    game.appendChild(el);

    // Größe festlegen
    const size = rand(36, 56);
    el.style.width  = `${size}px`;
    el.style.height = `${size}px`;

    // Position anhand des Ankers
    const anchor = anchors[i] || 'C';
    const { x, y } = cornerPos(anchor, size);
    el.style.transform = `translate(${x}px, ${y}px)`;

    // Start-Velocity „nach innen“
    const { vx, vy } = initialVelocityFromAnchor(anchor, speedMin, speedMax);

    const obj = { el, x, y, vx, vy, size };
    objs.push(obj);
  }
  // ---------- ENDE NEU ----------

  // --- Ziel: ENTWEDER Farbe ODER Form ---
  let currentTarget = pickInitialSingleTarget(forms, cols);
  updateHudSingle(hud, currentTarget);
  updateCenterTarget(
    currentTarget.type === 'color'
      ? { kind: 'color', name: currentTarget.value.name, colorHex: currentTarget.value.hex }
      : { kind: 'shape', name: currentTarget.value.name }
  );

  // Klick-Handling für alle Objekte
  objs.forEach(obj => {
    obj.el.addEventListener('click', () => {
      if (!running) return;

      const shape = obj.el.getAttribute('data-shape');
      const color = (obj.el.getAttribute('data-color') || '').toLowerCase();

      let hit = false;
      if (currentTarget.type === 'shape') {
        hit = shape === currentTarget.value.cls;
      } else {
        hit = color === currentTarget.value.hex.toLowerCase();
      }

      if (!hit) {
        misses++;
        hud.classList.add('miss');
        setTimeout(() => hud.classList.remove('miss'), 250);
        return;
      }

      // ✅ Treffer
      score++;
      if (scoreEl) scoreEl.textContent = String(score);

      currentTarget = pickNextSingleTarget(forms, cols, currentTarget);
      updateHudSingle(hud, currentTarget);
      updateCenterTarget(
        currentTarget.type === 'color'
          ? { kind: 'color', name: currentTarget.value.name, colorHex: currentTarget.value.hex }
          : { kind: 'shape', name: currentTarget.value.name }
      );

      objs.forEach(o => { o.vx *= 1.02; o.vy *= 1.02; });
    });
  });

  // Animationsloop
  function loop() {
    const g = bounds();

    for (const o of objs) {
      o.x += o.vx; o.y += o.vy;

      if (o.x <= 0)                { o.x = 0;                o.vx = Math.abs(o.vx); }
      if (o.x + o.size >= g.width) { o.x = g.width - o.size; o.vx = -Math.abs(o.vx); }
      if (o.y <= 0)                { o.y = 0;                o.vy = Math.abs(o.vy); }
      if (o.y + o.size >= g.height){ o.y = g.height - o.size;o.vy = -Math.abs(o.vy); }

      o.el.style.transform = `translate(${o.x}px, ${o.y}px)`;
    }

    // einfache AABB-Kollisionen
    for (let i = 0; i < objs.length; i++) {
      for (let j = i + 1; j < objs.length; j++) {
        const a = objs[i], b = objs[j];
        if (a.x < b.x + b.size && a.x + a.size > b.x && a.y < b.y + b.size && a.y + a.size > b.y) {
          const tvx = a.vx; a.vx = b.vx; b.vx = tvx;
          const tvy = a.vy; a.vy = b.vy; b.vy = tvy;
          a.x += a.vx; a.y += a.vy;
          b.x += b.vx; b.y += b.vy;
        }
      }
    }

    if (running) rafId = requestAnimationFrame(loop);
  }

  // optionaler Timer
  let timeoutId = null;
  if (typeof limitMs === 'number' && limitMs > 0) {
    timeoutId = setTimeout(stop, limitMs);
  }
  if (typeof limitMs === 'number' && limitMs > 0) {
    startCountdown(Math.floor(limitMs / 1000));
  } else {
    startCountdown(30);
  }

  function stop() {
    if (!running) return;
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (timeoutId) clearTimeout(timeoutId);

    if (centerLabel) centerLabel.textContent = '';

    hud.style.display = 'none';
    endGame({
      score,
      misses,
      mode: 'Shape Shift (Einzelziel)',
      extra: { target: currentTarget }
    });
  }

  document.getElementById('back-button')?.addEventListener('click', stop, { once: true });

  loop();
  setRestart(() => startShapeShift(config));
  return { stop };
}

// ---------- Helpers ----------
function ensureHud(screen) {
  const streakBox = document.getElementById('streak-box');
  let hud = document.getElementById('shape-shift-hud');

  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'shape-shift-hud';
    hud.className = 'ss-hud under-streak';
  }

  if (streakBox && hud.parentElement !== streakBox.parentElement) {
    streakBox.insertAdjacentElement('afterend', hud);
  } else if (!streakBox && hud.parentElement !== screen) {
    screen.appendChild(hud);
  }
  return hud;
}

function updateHudSingle(hud, target) {
  hud.textContent = `Fang: ${target.value.name}`;
}

function pickInitialSingleTarget(forms, cols) {
  const type = Math.random() < 0.5 ? 'shape' : 'color';
  if (type === 'shape') {
    const s = forms[Math.floor(Math.random() * forms.length)];
    return { type, value: s };
  } else {
    const c = cols[Math.floor(Math.random() * cols.length)];
    return { type, value: c };
  }
}

function pickNextSingleTarget(forms, cols, last) {
  const switchType = Math.random() < 0.5;
  let type = last.type;
  if (switchType) type = (last.type === 'shape') ? 'color' : 'shape';

  if (type === 'shape') {
    const choices = forms.filter(s => last.type !== 'shape' || s.cls !== last.value.cls);
    return { type: 'shape', value: choices[Math.floor(Math.random() * choices.length)] || forms[0] };
  } else {
    const choices = cols.filter(c => last.type !== 'color' || c.hex.toLowerCase() !== last.value.hex.toLowerCase());
    return { type: 'color', value: choices[Math.floor(Math.random() * choices.length)] || cols[0] };
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function clearShapes(parent) {
  [...parent.querySelectorAll('.ss-shape')].forEach(e => e.remove());
}
