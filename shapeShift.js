// shapeShift.js – strikt N Formen + N Farben; HUD oben rechts; kein TTS
import { endGame } from './core.js';

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

  // harte Regel: genau N Formen + N Farben
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

  clearShapes(game);

  // HUD oben rechts
  const hud = ensureHud(screen);
  hud.style.display = 'block';

  let score = 0;
  const scoreEl = document.getElementById('score'); // UI-Span
    if (scoreEl) scoreEl.textContent = '0';
  let misses = 0;
  let running = true;
  let rafId = null;
  let lastTarget = null; // {shape, color}

  const bounds = () => game.getBoundingClientRect();

  // Anfangsbelegung: N eindeutige Paare
  const forms = shuffle([...shapes]).slice(0, count);
  const cols  = shuffle([...colors]).slice(0, count);

  // Merker für aktuell belegte (Form,Farbe)-Kombis
  const usedPairs = new Set(); // key: "shape|#hex"

  const objs = [];
  for (let i = 0; i < count; i++) {
    const s = forms[i];
    const c = cols[i];
    const key = pairKey(s, c);
    usedPairs.add(key);

    const el = document.createElement('div');
    el.className = `ss-shape ${s.cls}`;
    el.style.background = c.hex;
    el.setAttribute('data-shape', s.cls);
    el.setAttribute('data-color', c.hex);
    game.appendChild(el);

    const g = bounds();
    const size = rand(36, 56);
    let x = rand(0, Math.max(1, g.width  - size));
    let y = rand(0, Math.max(1, g.height - size));
    el.style.width  = `${size}px`;
    el.style.height = `${size}px`;
    el.style.transform = `translate(${x}px, ${y}px)`;

    let vx = rand(speedMin, speedMax) * (Math.random() < 0.5 ? -1 : 1);
    let vy = rand(speedMin, speedMax) * (Math.random() < 0.5 ? -1 : 1);

    const obj = { el, x, y, vx, vy, size };
    objs.push(obj);
  }

  // Start-Target: existierende Kombi aus den Objekten wählen
  let currentTarget = pickInitialTarget(objs);
  updateHud(hud, currentTarget);

  // Klick-Handling für alle Objekte
  objs.forEach(obj => {
    obj.el.addEventListener('click', () => {
      if (!running) return;

    const okShape = obj.el.classList.contains(currentTarget.shape.cls);
    const elColor = (obj.el.getAttribute('data-color') || '').toLowerCase();
    const okColor = elColor === currentTarget.color.hex.toLowerCase();

    if (!okShape || !okColor) {
    misses++;
    flashMiss(hud);
    return;
    }


      // Treffer
      score++;
      lastTarget = currentTarget;

      // alte Kombi aus usedPairs entfernen
      usedPairs.delete(pairKey(
        { cls: obj.el.getAttribute('data-shape') },
        { hex: obj.el.getAttribute('data-color') }
      ));

      // NEUE Kombi wählen:
      //  - Form ≠ lastTarget.shape
      //  - Farbe ≠ lastTarget.color
      //  - Kombination aktuell nicht vorhanden (usedPairs)
      const next = pickNextPair(forms, cols, lastTarget, usedPairs);

      // auf dasselbe Element anwenden (wirkt wie “neu spawnen”)
      applyPairToElement(obj.el, next);
      usedPairs.add(pairKey(next.shape, next.color));

      // Neues Ziel ist genau diese neue Kombi
      currentTarget = next;
      updateHud(hud, currentTarget);

      // minimal beschleunigen
      objs.forEach(o => { o.vx *= 1.02; o.vy *= 1.02; });
    });
  });

  // Animationsloop
  function loop() {
    const g = bounds();

    // Bewegung + Wände
    for (const o of objs) {
      o.x += o.vx; o.y += o.vy;

      if (o.x <= 0)               { o.x = 0;               o.vx = Math.abs(o.vx); }
      if (o.x + o.size >= g.width){ o.x = g.width - o.size; o.vx = -Math.abs(o.vx); }
      if (o.y <= 0)               { o.y = 0;               o.vy = Math.abs(o.vy); }
      if (o.y + o.size >= g.height){o.y = g.height - o.size; o.vy = -Math.abs(o.vy); }

      o.el.style.transform = `translate(${o.x}px, ${o.y}px)`;
    }

    // einfache AABB-Kollisionen (Velocity-Tausch)
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

  // optionaler Timer (z. B. 30s)
  let timeoutId = null;
  if (typeof limitMs === 'number' && limitMs > 0) {
    timeoutId = setTimeout(stop, limitMs);
  }

  function stop() {
    if (!running) return;
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (timeoutId) clearTimeout(timeoutId);
    hud.style.display = 'none';
    endGame({
      score,
      misses,
      mode: 'Shape Shift',
      extra: { target: { shape: currentTarget.shape.name, color: currentTarget.color.name } }
    });
  }

  // Back-Button beendet die Session
  document.getElementById('back-button')?.addEventListener('click', stop, { once: true });

  // Los
  loop();
  return { stop };
}

// ---------- Helpers ----------

function ensureHud(screen) {
  // HUD direkt NACH dem Streak-Block platzieren
  const streakBox = document.getElementById('streak-box');
  let hud = document.getElementById('shape-shift-hud');

  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'shape-shift-hud';
    hud.className = 'ss-hud under-streak'; // neue Klasse für Layout unter Streak
  }

  if (streakBox && hud.parentElement !== streakBox.parentElement) {
    // direkt hinter den Streak-Block hängen
    streakBox.insertAdjacentElement('afterend', hud);
  } else if (!streakBox && hud.parentElement !== screen) {
    // Fallback: in den game-screen hängen
    screen.appendChild(hud);
  }

  return hud;
}


function updateHud(hud, target) {
  hud.textContent = `Fang: ${target.color.name} | ${target.shape.name}`;
}

// --- Miss-Feedback (HUD kurz wackeln lassen) ---
function flashMiss(hud) {
  if (!hud) return;
  hud.classList.add('miss');
  setTimeout(() => hud.classList.remove('miss'), 250);
}

function applyPairToElement(el, pair) {
  // Form-Klasse umschalten
  const prevShape = el.getAttribute('data-shape') || '';
  if (!el.classList.contains(pair.shape.cls)) {
    if (prevShape) el.classList.remove(prevShape);
    el.classList.add(pair.shape.cls);
  }
  el.setAttribute('data-shape', pair.shape.cls);

  // Farbe setzen
  el.style.background = pair.color.hex;
  el.setAttribute('data-color', pair.color.hex);
}

function pickInitialTarget(objs) {
  const any = objs[Math.floor(Math.random() * objs.length)].el;
  const s = { cls: any.getAttribute('data-shape'), name: shapeName(any.getAttribute('data-shape')) };
  const c = { hex: any.getAttribute('data-color'), name: colorName(any.getAttribute('data-color')) };
  return { shape: s, color: c };
}

function pickNextPair(forms, cols, lastTarget, usedPairs) {
  // Kandidaten: Form ≠ letzte Form, Farbe ≠ letzte Farbe, Kombi noch nicht belegt
  const candidates = [];
  for (const s of forms) {
    if (s.cls === lastTarget.shape.cls) continue;
    for (const c of cols) {
      if (c.hex.toLowerCase() === lastTarget.color.hex.toLowerCase()) continue;
      const key = pairKey(s, c);
      if (!usedPairs.has(key)) candidates.push({ shape: s, color: c });
    }
  }

  if (candidates.length === 0) {
    // Fallback 1: alles ≠ letzte Form und ≠ letzte Farbe, unabhängig von usedPairs
    for (const s of forms) {
      if (s.cls === lastTarget.shape.cls) continue;
      for (const c of cols) {
        if (c.hex.toLowerCase() === lastTarget.color.hex.toLowerCase()) continue;
        return { shape: s, color: c };
      }
    }
    // Fallback 2: irgendwas ≠ exakt letzter Kombi
    for (const s of forms) {
      for (const c of cols) {
        if (!(s.cls === lastTarget.shape.cls && c.hex.toLowerCase() === lastTarget.color.hex.toLowerCase())) {
          return { shape: s, color: c };
        }
      }
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pairKey(s, c) {
  return `${s.cls}|${c.hex.toLowerCase()}`;
}

function shapeName(cls) {
  const f = SHAPES.find(x => x.cls === cls);
  return f?.name || cls;
}

function colorName(hex) {
  const c = COLORS.find(x => x.hex.toLowerCase() === (hex || '').toLowerCase());
  return c?.name || 'Farbe';
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
