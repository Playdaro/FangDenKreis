// reactionMazeCore.js
import { showScreen } from '../screens.js';

const rndInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const now = () => performance.now();

function buildGrid(cols, rows) {
  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push({ x, y, vis: false, wall: { N: 1, E: 1, S: 1, W: 1 } });
    }
  }
  const idx = (x, y) => y * cols + x;
  const neigh = (x, y) => ([
    { x, y: y - 1, d: 'N' },
    { x: x + 1, y, d: 'E' },
    { x, y: y + 1, d: 'S' },
    { x: x - 1, y, d: 'W' }
  ]).filter(n => n.x >= 0 && n.y >= 0 && n.x < cols && n.y < rows);
  const opposite = { N: 'S', S: 'N', E: 'W', W: 'E' };

  const stack = [];
  const startX = rndInt(0, cols - 1), startY = rndInt(0, rows - 1);
  stack.push({ x: startX, y: startY });
  cells[idx(startX, startY)].vis = true;

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const opts = neigh(cur.x, cur.y).filter(n => !cells[idx(n.x, n.y)].vis);
    if (!opts.length) { stack.pop(); continue; }
    const n = opts[rndInt(0, opts.length - 1)];
    cells[idx(cur.x, cur.y)].wall[n.d] = 0;
    cells[idx(n.x, n.y)].wall[opposite[n.d]] = 0;
    cells[idx(n.x, n.y)].vis = true;
    stack.push({ x: n.x, y: n.y });
  }
  return { cells, idx, neigh, cols, rows };
}

function computeLongestPath(grid) {
  const start = { x: rndInt(0, grid.cols - 1), y: rndInt(0, grid.rows - 1) };

  const furthest = (s) => {
    const q = [s];
    const dist = Array(grid.cols * grid.rows).fill(-1);
    dist[grid.idx(s.x, s.y)] = 0;
    let last = s;
    while (q.length) {
      const c = q.shift(); last = c;
      for (const n of grid.neigh(c.x, c.y)) {
        const cw = grid.cells[grid.idx(c.x, c.y)].wall;
        const dir = n.y < c.y ? 'N' : n.y > c.y ? 'S' : n.x > c.x ? 'E' : 'W';
        if (cw[dir] === 0 && dist[grid.idx(n.x, n.y)] === -1) {
          dist[grid.idx(n.x, n.y)] = dist[grid.idx(c.x, c.y)] + 1;
          q.push({ x: n.x, y: n.y });
        }
      }
    }
    return last;
  };

  const A = furthest(start);
  const B = furthest(A);

  // Parent-map für Pfad A->B
  const q = [A];
  const par = new Map();
  const seen = new Set([grid.idx(A.x, A.y)]);
  while (q.length) {
    const c = q.shift();
    if (c.x === B.x && c.y === B.y) break;
    for (const n of grid.neigh(c.x, c.y)) {
      const cw = grid.cells[grid.idx(c.x, c.y)].wall;
      const dir = n.y < c.y ? 'N' : n.y > c.y ? 'S' : n.x > c.x ? 'E' : 'W';
      if (cw[dir] === 0) {
        const key = grid.idx(n.x, n.y);
        if (!seen.has(key)) { seen.add(key); par.set(key, c); q.push({ x: n.x, y: n.y }); }
      }
    }
  }

  const path = [B];
  let cur = B;
  const key = (p) => grid.idx(p.x, p.y);
  while (!(cur.x === A.x && cur.y === A.y)) {
    cur = par.get(key(cur));
    if (!cur) break;
    path.push(cur);
  }
  path.reverse();
  return path;
}

function styleOnce() {
  if (document.getElementById('maze-style')) return;
  const s = document.createElement('style');
  s.id = 'maze-style';
  s.textContent = `
    #maze-stage { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; height:100%; position:relative; inset:0; }
    .maze-hud { width:100%; max-width:620px; display:flex; justify-content:space-between; font-weight:700; z-index:2; pointer-events:none; color:#fff; }
    .maze-grid { display:grid; gap:3px; width:min(92vw,620px); aspect-ratio:1/1; touch-action:manipulation; user-select:none; z-index:1; }
    .maze-cell { background:#111; border-radius:8px; position:relative; }
    .maze-cell.maze-pulse::after { content:""; position:absolute; inset:0; border-radius:8px; outline:3px solid rgba(255,255,255,.9); animation:pop .45s ease-in-out infinite alternate; }
    @keyframes pop { from { outline-offset:6px; opacity:.9; } to { outline-offset:-2px; opacity:.4; } }
    .maze-cell.maze-active { background:#2a2; }
    .maze-cell.maze-wrong  { background:#a22; }
    #maze-overlay { position:absolute; inset:0; }
    .maze-footer { width:100%; display:flex; justify-content:center; }
    #maze-back { min-width: 220px; padding: 10px 16px; border-radius: 10px; color: #fff; }
  `;
  document.head.appendChild(s);
}

function requiredHitsFromCfg(cfg) {
  if (typeof cfg.requiredHits === 'number') return cfg.requiredHits;

  // fallback nach label
  const l = String(cfg.label || '').toLowerCase();
  if (l.includes('hard')) return 60;
  if (l.includes('medium')) return 50;
  if (l.includes('easy')) return 40;
  // wenn label nur "hard/medium/easy" ist:
  if (l === 'hard') return 60;
  if (l === 'medium') return 50;
  if (l === 'easy') return 40;

  return 20;
}

export function startMaze(cfg) {
  styleOnce();

  const totalMs = typeof cfg.totalMs === 'number' ? cfg.totalMs : 30000;
  const requiredHits = requiredHitsFromCfg(cfg);

  const screen = document.getElementById('screen-maze');
  if (!screen) throw new Error('#screen-maze fehlt');

  let overlay = screen.querySelector('#maze-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'maze-overlay';
    screen.appendChild(overlay);
  }
  overlay.innerHTML = '';

  const host = document.createElement('div');
  host.id = 'maze-stage';
  overlay.appendChild(host);

  host.innerHTML = `
    <div class="maze-hud">
      <div class="maze-left">
        Treffer <span id="maze-score">0</span>/<span id="maze-goal">${requiredHits}</span>
      </div>
      
      <div class="maze-right">
        <span id="maze-timer">30</span>s
      </div>
    </div>
    <div class="maze-grid"></div>
    <div class="maze-footer">
      <button id="maze-back" class="btn-back" type="button">Zurück zum Menü</button>
    </div>
  `;

  const gridEl = host.querySelector('.maze-grid');
  gridEl.style.gridTemplateColumns = `repeat(${cfg.cols}, 1fr)`;
  gridEl.style.gridTemplateRows    = `repeat(${cfg.rows}, 1fr)`;
  gridEl.style.pointerEvents = 'auto';

  // State
  let score = 0;
  let misses = 0;           // Fehlklicks (bei deinem Regelwerk max 1)
  const reactions = [];
  let startTime = 0;
  let grid = null;
  let path = [];
  let pos = null;
  let stepIdx = 0;
  let stepActive = false;

  let roundDeadline = now() + totalMs;
  let roundRAF = null;

  const clearAllPulses = () => host.querySelectorAll('.maze-cell.maze-pulse').forEach(el => el.classList.remove('maze-pulse'));
  const clearAllActives = () => host.querySelectorAll('.maze-cell.maze-active').forEach(el => el.classList.remove('maze-active'));

  // DOM cells
  let cells = [];
  const id = (x, y) => cells[y * cfg.cols + x];

  const neighbors = (p) => ([
    { x: p.x, y: p.y - 1 },
    { x: p.x + 1, y: p.y },
    { x: p.x, y: p.y + 1 },
    { x: p.x - 1, y: p.y }
  ]).filter(n => n.x >= 0 && n.y >= 0 && n.x < cfg.cols && n.y < cfg.rows);

  const updateHUD = () => {
    const sEl = host.querySelector('#maze-score');
    if (sEl) sEl.textContent = String(score);

    const tEl = host.querySelector('#maze-timer');
    if (tEl) {
      const remainMs = Math.max(0, roundDeadline - now());
      tEl.textContent = String(Math.ceil(remainMs / 1000));
    }
  };

  const END_TEXT = {
    wrong:   '❌ Fehlklick',
    timeout: '⏱️ Zeit abgelaufen',
    win:     '✅ Gewonnen'
  };

  const writeResultScreen = (reason) => {
  const screenRes = document.getElementById('screen-maze-result');
  if (!screenRes) return;

  const avg = reactions.length
    ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length)
    : 0;

  const q = (sel) => screenRes.querySelector(sel);

  // Basis-Ergebnisse
  q('#maze-res-diff')      && (q('#maze-res-diff').textContent      = cfg.label || 'unknown');
  q('#maze-res-steps')     && (q('#maze-res-steps').textContent     = String(score)); // Treffer
  q('#maze-res-avg')       && (q('#maze-res-avg').textContent       = `${avg} ms`);
  q('#maze-res-endreason') && (q('#maze-res-endreason').textContent = END_TEXT[reason] || '—');

  // ⏱️ Benötigte Zeit (nur bei Gewinn)
  const timeEl = q('#maze-res-time');
  if (timeEl) {
    if (reason === 'win') {
      const usedMs = now() - startTime;
      const usedSec = (usedMs / 1000).toFixed(2);
      timeEl.textContent = usedSec;
    } else {
      timeEl.textContent = '–';
    }
  }
};


  const teardownAll = () => {
    overlay && (overlay.innerHTML = '');
  };

  const finish = (reason) => {
  if (roundRAF) { cancelAnimationFrame(roundRAF); roundRAF = null; }

  writeResultScreen(reason);
  teardownAll();
  showScreen('maze-result');

  

  // ✅ Result-Buttons verdrahten (einfach & robust)
  const btnRetry = document.getElementById('maze-res-retry');
  const btnMenu  = document.getElementById('maze-res-menu');

  if (btnRetry) {
    btnRetry.onclick = () => {
      // ggf. Reste stoppen
      try { if (typeof window.stopMaze === 'function') window.stopMaze(); } catch {}
      // neu starten mit der gleichen Config
      showScreen('maze');
      startMaze(cfg);
    };
  }

  if (btnMenu) {
    btnMenu.onclick = () => {
      try { if (typeof window.stopMaze === 'function') window.stopMaze(); } catch {}
      const overlay = document.getElementById('maze-overlay');
      if (overlay) overlay.innerHTML = '';
      showScreen('menu');
    };
  }
};


  const buildNewMaze = () => {
    gridEl.innerHTML = '';
    cells = [];

    grid = buildGrid(cfg.cols, cfg.rows);
    const fullPath = computeLongestPath(grid);
    let p = fullPath.slice(0, Math.min(cfg.pathLen || fullPath.length, fullPath.length));
    if (!p.length) p = fullPath;

    // Sicherheitsnetz: mindestens 2 Punkte
    if (p.length < 2) {
      const p0 = p[0] || fullPath[0];
      const neighs = [
        { x: p0.x,     y: p0.y - 1 },
        { x: p0.x + 1, y: p0.y     },
        { x: p0.x,     y: p0.y + 1 },
        { x: p0.x - 1, y: p0.y     },
      ].filter(n => n.x >= 0 && n.y >= 0 && n.x < cfg.cols && n.y < cfg.rows);
      if (neighs.length) p = [p0, neighs[0]];
    }

    path = p;
    pos = path[0];
    stepIdx = 0;

    for (let y = 0; y < cfg.rows; y++) {
      for (let x = 0; x < cfg.cols; x++) {
        const div = document.createElement('div');
        div.className = 'maze-cell';
        div.dataset.x = x;
        div.dataset.y = y;
        gridEl.appendChild(div);
        cells.push(div);
      }
    }

    clearAllActives();
    id(pos.x, pos.y)?.classList.add('maze-active');
    clearAllPulses();
    updateHUD();
  };

  // Global timer tick
  const roundTick = () => {
    const remain = Math.max(0, roundDeadline - now());
    updateHUD();
    if (remain <= 0) return finish('timeout');
    roundRAF = requestAnimationFrame(roundTick);
  };

  // Step loop (ohne Step-Timeout!)
  function stepLoop() {
    if (score >= requiredHits) return finish('win');

    // Pfad zu Ende → einfach neuen Zielschritt vom aktuellen Punkt aus
    if (stepIdx >= path.length - 1) {
      stepIdx = 0;
      path = computeLongestPath(grid);
      pos = path[0];
    }


    // Ziel ist das nächste Feld im Pfad
    stepActive = true;
    clearAllPulses();

    const startT = now();
    const next = path[stepIdx + 1];
    const targetEl = id(next.x, next.y);
    if (!targetEl) {
      buildNewMaze();
      return stepLoop();
    }
    targetEl.classList.add('maze-pulse');

    const binders = [];
    const addHandler = (el, fn) => {
      if (!el) return;
      const type = ('onpointerup' in window) ? 'pointerup' : 'click';
      el.addEventListener(type, fn, { passive: false });
      binders.push([el, type, fn]);
    };

    function teardown() { binders.forEach(([el, type, fn]) => el.removeEventListener(type, fn)); }

    const onTap = (ev) => {
      if (!stepActive) return;
      ev.preventDefault?.();

      const el = ev.currentTarget;
      const x = +el.dataset.x, y = +el.dataset.y;
      const rt = now() - startT;

      // richtig?
      if (x === next.x && y === next.y) {
        stepActive = false;
        clearAllPulses();
        clearAllActives();

        pos = { x, y };
        id(pos.x, pos.y)?.classList.add('maze-active');

        score++;
        reactions.push(rt);
        stepIdx++;

        teardown();
        updateHUD();

        if (score >= requiredHits) return finish('win');
        stepLoop();
        return;
      }

      // falsch -> sofort Game Over (dein Regelwerk)
      stepActive = false;
      misses++;

      el.classList.add('maze-wrong');
      teardown();

      setTimeout(() => {
        el.classList.remove('maze-wrong');
        clearAllPulses();
        finish('wrong');
      }, 160);
    };

    // nur Nachbarn klickbar machen (wie vorher)
    const neighs = neighbors(pos);
    neighs.forEach(n => addHandler(id(n.x, n.y), onTap));
    // Sicherheitsnetz: falls Pfad mal nicht direkt Nachbar (sollte kaum passieren)
    if (!neighs.some(n => n.x === next.x && n.y === next.y)) addHandler(targetEl, onTap);
  }

  // Start
  startTime = now();
  buildNewMaze();
  roundTick();
  stepLoop();

  // Stop hook
  window.stopMaze = function() {
    try { if (roundRAF) cancelAnimationFrame(roundRAF); } catch {}
    roundRAF = null;
    try { overlay && (overlay.innerHTML = ''); } catch {}
  };

  // Back
  host.querySelector('#maze-back')?.addEventListener('click', () => {
    try { window.stopMaze && window.stopMaze(); } catch {}
    showScreen('menu');
  });
}
