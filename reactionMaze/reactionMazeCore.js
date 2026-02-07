// reactionMazeCore.js – FINAL (STABIL, GLOBAL-KONFORM, PLAYFIELD-SAFE)

import { showScreen } from "../screens.js";
import { endGame } from "../core.js";
import { setText } from "../result.js";

const now = () => performance.now();
const rndInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

// ======================================================
// MAZE GENERATION
// ======================================================
function buildGrid(cols, rows) {
  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push({ x, y, vis: false, wall: { N: 1, E: 1, S: 1, W: 1 } });
    }
  }

  const idx = (x, y) => y * cols + x;
  const neigh = (x, y) => ([
    { x, y: y - 1, d: "N" },
    { x: x + 1, y, d: "E" },
    { x, y: y + 1, d: "S" },
    { x: x - 1, y, d: "W" }
  ]).filter(n => n.x >= 0 && n.y >= 0 && n.x < cols && n.y < rows);

  const opp = { N: "S", S: "N", E: "W", W: "E" };

  const stack = [];
  const sx = rndInt(0, cols - 1);
  const sy = rndInt(0, rows - 1);
  stack.push({ x: sx, y: sy });
  cells[idx(sx, sy)].vis = true;

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const opts = neigh(cur.x, cur.y).filter(n => !cells[idx(n.x, n.y)].vis);
    if (!opts.length) { stack.pop(); continue; }

    const n = opts[rndInt(0, opts.length - 1)];
    cells[idx(cur.x, cur.y)].wall[n.d] = 0;
    cells[idx(n.x, n.y)].wall[opp[n.d]] = 0;
    cells[idx(n.x, n.y)].vis = true;
    stack.push({ x: n.x, y: n.y });
  }

  return { cells, idx, neigh, cols, rows };
}

function computeLongestPath(grid) {
  const start = { x: rndInt(0, grid.cols - 1), y: rndInt(0, grid.rows - 1) };

  const bfs = (s) => {
    const q = [s];
    const dist = Array(grid.cols * grid.rows).fill(-1);
    dist[grid.idx(s.x, s.y)] = 0;
    let last = s;

    while (q.length) {
      const c = q.shift();
      last = c;
      for (const n of grid.neigh(c.x, c.y)) {
        const w = grid.cells[grid.idx(c.x, c.y)].wall;
        const d = n.y < c.y ? "N" : n.y > c.y ? "S" : n.x > c.x ? "E" : "W";
        if (w[d] === 0 && dist[grid.idx(n.x, n.y)] === -1) {
          dist[grid.idx(n.x, n.y)] = dist[grid.idx(c.x, c.y)] + 1;
          q.push({ x: n.x, y: n.y });
        }
      }
    }
    return last;
  };

  const A = bfs(start);
  const B = bfs(A);

  const q = [A];
  const par = new Map();
  const seen = new Set([grid.idx(A.x, A.y)]);

  while (q.length) {
    const c = q.shift();
    if (c.x === B.x && c.y === B.y) break;
    for (const n of grid.neigh(c.x, c.y)) {
      const w = grid.cells[grid.idx(c.x, c.y)].wall;
      const d = n.y < c.y ? "N" : n.y > c.y ? "S" : n.x > c.x ? "E" : "W";
      if (w[d] === 0) {
        const k = grid.idx(n.x, n.y);
        if (!seen.has(k)) {
          seen.add(k);
          par.set(k, c);
          q.push({ x: n.x, y: n.y });
        }
      }
    }
  }

  const path = [B];
  let cur = B;
  while (!(cur.x === A.x && cur.y === A.y)) {
    cur = par.get(grid.idx(cur.x, cur.y));
    if (!cur) break;
    path.push(cur);
  }

  return path.reverse();
}

// ======================================================
// STOP HOOK
// ======================================================
let activeStop = null;
export function stopMaze(reason = "abort", record = false) {
  if (typeof activeStop === "function") activeStop(reason, record);
}

// ======================================================
// MAIN
// ======================================================
export function startMaze(cfg) {
  showScreen("maze");

  // =========================
  // HUD
  // =========================
  const scoreEl = document.getElementById("maze-score");
  const missEl  = document.getElementById("maze-misses");
  const timeEl  = document.getElementById("maze-time");

  const screen = document.getElementById("screen-maze");
  const playfield = screen?.querySelector(".playfield");
  if (!playfield) throw new Error("Maze braucht .playfield");

  // =========================
  // PLAYFIELD / ROOT
  // =========================
  playfield.innerHTML = `
    <div id="maze-root">
      <div class="maze-grid"></div>
    </div>
  `;

  const root = playfield.querySelector("#maze-root");
  const gridEl = root.querySelector(".maze-grid");

  gridEl.style.display = "grid";
  gridEl.style.gridTemplateColumns = `repeat(${cfg.cols}, 1fr)`;
  gridEl.style.gridTemplateRows    = `repeat(${cfg.rows}, 1fr)`;
  gridEl.style.gap = "4px";

  // ⚠️ WICHTIG: Größe NACH Layout-Flush setzen
  requestAnimationFrame(() => {
    const rect = playfield.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height || rect.width);

    gridEl.style.width  = size + "px";
    gridEl.style.height = size + "px";
  });

  // =========================
  // GAME CONFIG
  // =========================
  const totalMs  = cfg.totalMs  ?? 30000;
  const goalHits = cfg.requiredHits ?? cfg.goalHits ?? 40;

  let score = 0;
  let misses = 0;
  const rtSamples = [];

  const startTs = performance.now();
  let endTs = startTs + totalMs;
  let grid, path, pos, stepIdx = 0;
  let cells = [];
  let rafId = null;

  // =========================
  // HUD UPDATE
  // =========================
  function updateHUD() {
    scoreEl && (scoreEl.textContent = score);
    missEl  && (missEl.textContent  = misses);
    timeEl  && (timeEl.textContent  =
      Math.ceil(Math.max(0, endTs - performance.now()) / 1000)
    );
  }

  // =========================
  // FINISH
  // =========================
  function finish(reason = "timeout", record = true) {
    if (rafId) cancelAnimationFrame(rafId);
    root.remove();
    activeStop = null;

    if (!record) return;

    const avgRt = rtSamples.length
      ? rtSamples.reduce((a, b) => a + b, 0) / rtSamples.length
      : 0;

    const accuracy = (score + misses)
      ? score / (score + misses)
      : 1;

    endGame({
      modeGroup: "maze",
      modeId: `maze-${cfg.label || "easy"}`,
      difficulty: cfg.label || "easy",
      score,
      hits: score,
      misses,
      avgRt: avgRt / 1000,
      accuracy,
      durationSec: totalMs / 1000,
      finishedAt: new Date().toISOString(),
    });

    setText("maze-res-diff", cfg.label || "–");
    setText("maze-res-steps", score);
    setText("maze-res-avg", `${Math.round(avgRt)} ms`);
    const reasonLabel =
      reason === "wrong" ? "Fehlklick" :
      reason === "timeout" ? "Zeit abgelaufen" :
      reason === "win" ? "Geschafft" :
      reason;

    setText("maze-res-endreason", reasonLabel);
    const playedSec = Math.round((performance.now() - startTs) / 1000);
    setText("maze-res-time", String(playedSec));


    showScreen("maze-result");
  }

  activeStop = (r = "abort", rec = false) => finish(r, rec);

  // =========================
  // BUILD MAZE
  // =========================
  function buildMaze() {
    gridEl.innerHTML = "";
    cells = [];

    grid = buildGrid(cfg.cols, cfg.rows);
    path = computeLongestPath(grid);

    // 🔒 ABSICHERUNG: Pfad MUSS ≥ 2
    if (!path || path.length < 2) {
      const x = Math.max(0, Math.min(cfg.cols - 2, 0));
      const y = Math.max(0, Math.min(cfg.rows - 1, 0));
      path = [
        { x, y },
        { x: x + 1, y }
      ];
    }

    pos = path[0];
    stepIdx = 0;

    for (let y = 0; y < cfg.rows; y++) {
      for (let x = 0; x < cfg.cols; x++) {
        const d = document.createElement("div");
        d.className = "maze-cell";
        d.dataset.x = x;
        d.dataset.y = y;
        gridEl.appendChild(d);
        cells.push(d);
      }
    }

    cellAt(pos).classList.add("maze-active");
  }

  const cellAt = (p) => cells[p.y * cfg.cols + p.x];

  function neighbors(p) {
    return [
      { x: p.x, y: p.y - 1 },
      { x: p.x + 1, y: p.y },
      { x: p.x, y: p.y + 1 },
      { x: p.x - 1, y: p.y }
    ].filter(n =>
      n.x >= 0 && n.y >= 0 &&
      n.x < cfg.cols && n.y < cfg.rows
    );
  }

  // =========================
  // STEP LOOP
  // =========================
  function stepLoop() {
    if (score >= goalHits) return finish("win", true);

    const next = path[stepIdx + 1];
    if (!next) {
      buildMaze();
      updateHUD();
      return stepLoop(); // 🔥 WICHTIG
    }


    const startT = performance.now();
    const target = cellAt(next);
    target.classList.add("maze-pulse");

    const onClick = (e) => {
      target.classList.remove("maze-pulse");

      const x = +e.currentTarget.dataset.x;
      const y = +e.currentTarget.dataset.y;

      if (x === next.x && y === next.y) {
        rtSamples.push(performance.now() - startT);

        // letzter Treffer → sofort beenden
        if (score + 1 >= goalHits) {
          score++;
          updateHUD();
          return finish("win", true);
        }

        cellAt(pos).classList.remove("maze-active");
        pos = next;
        cellAt(pos).classList.add("maze-active");

        score++;
        stepIdx++;
        updateHUD();
        stepLoop();
      } else {
        // ❌ FALSCHER KLICK → SOFORT GAME OVER
        misses++;
        updateHUD();
        return finish("wrong", true);
      }


    };

    neighbors(pos).forEach(n => {
      cellAt(n).onclick = onClick;
    });
  }

  // =========================
  // BACK BUTTON
  // =========================
  document.getElementById("maze-back")?.addEventListener("click", () => {
    stopMaze("abort", false);
    showScreen("menu");
  });

  // =========================
  // START
  // =========================
  buildMaze();
  updateHUD();
  stepLoop();

  function tick() {
    if (performance.now() >= endTs) return finish("timeout", true);
    updateHUD();
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);
}
