// gridCore.js – FINAL (mit separaten "Fehlklicks" vs. "Verpasste Klicks")
// Pattern:
// - Core: setzt NUR Values + showScreen("grid-result")
// - Runner: bindet Buttons global (bindResultButtons)

import { showScreen } from "../screens.js";
import { endGame } from "../core.js";
import { setText } from "../result.js";

const TICK_MS = 100;

let state = {
  running: false,
  diffKey: null,
  label: "",
  durationSec: 30,
  remainingMs: 0,

  spawnMs: 0,
  minSpawnMs: 0,
  speedDecay: 1,

  allowedIndices: [],
  currentIndex: null,
  lastSpawnTime: 0,

  hits: 0,
  wrongClicks: 0,     // ❗ Fehlklicks (falsches Feld)
  missedTargets: 0,   // ❗ Verpasste Klicks (Ziel ausgelaufen)
  streak: 0,
  bestStreak: 0,

  rtSamples: [],
  tickTimer: null,
};

function getGridScreen() {
  const screen = document.getElementById("screen-grid");
  if (!screen) {
    console.warn("[grid] #screen-grid fehlt – bitte in index.html ergänzen");
    return null;
  }
  return screen;
}

function getBoard() {
  const screen = getGridScreen();
  if (!screen) return null;
  return screen.querySelector("#grid-game");
}

function getCells() {
  const board = getBoard();
  if (!board) return [];
  return Array.from(board.querySelectorAll(".grid-cell"));
}

function ensureGridUI() {
  const screen = getGridScreen();
  if (!screen) return null;

  const board = getBoard();
  if (!board) {
    console.error("[grid] #grid-game fehlt im HTML (screen-grid)");
    return null;
  }

  // 3×3-Felder sicherstellen
  if (board.querySelectorAll(".grid-cell").length !== 9) {
    board.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement("div");
      cell.className = "grid-cell";
      cell.dataset.index = String(i);
      cell.addEventListener("pointerdown", onCellClick);
      board.appendChild(cell);
    }
  }

  // Back Button: sauber stoppen + ins Menü
  const backBtn = document.getElementById("grid-back");
  if (backBtn) {
    backBtn.onclick = () => {
      stopGrid("abort", false);
      showScreen("menu");
    };
  }

  return { board };
}

function updateHud() {
  const scoreEl = document.getElementById("grid-score");
  const missEl = document.getElementById("grid-misses");
  const streakEl = document.getElementById("grid-streak");
  const timeEl = document.getElementById("grid-time");

  const missesTotal = (state.wrongClicks || 0) + (state.missedTargets || 0);

  if (scoreEl) scoreEl.textContent = String(state.hits);
  if (missEl) missEl.textContent = String(missesTotal);
  if (streakEl) streakEl.textContent = String(state.streak);
  if (timeEl) timeEl.textContent = String(Math.ceil(state.remainingMs / 1000));
}

function clearActive() {
  getCells().forEach((c) => c.classList.remove("active", "hit", "miss"));
}

function spawnNewTarget(excludeIdx = null) {
  const cells = getCells();
  if (!cells.length) return;

  clearActive();

  const candidates =
    state.allowedIndices && state.allowedIndices.length
      ? state.allowedIndices.slice()
      : [...Array(9).keys()];

  let idx = candidates[Math.floor(Math.random() * candidates.length)];
  if (candidates.length > 1 && excludeIdx != null) {
    let guard = 0;
    while (idx === excludeIdx && guard < 10) {
      idx = candidates[Math.floor(Math.random() * candidates.length)];
      guard++;
    }
  }

  state.currentIndex = idx;
  const cell = cells[idx];
  if (cell) cell.classList.add("active");
  state.lastSpawnTime = performance.now ? performance.now() : Date.now();
}

function registerReactionHit() {
  const t = performance.now ? performance.now() : Date.now();
  if (!state.lastSpawnTime) return;
  const rtSec = (t - state.lastSpawnTime) / 1000;
  if (rtSec >= 0 && rtSec < 10) state.rtSamples.push(rtSec);
}

function onCellClick(e) {
  if (!state.running) return;

  const idx = Number(e.currentTarget?.dataset?.index ?? -1);
  if (Number.isNaN(idx) || idx < 0 || idx > 8) return;

  const cells = getCells();
  const cell = cells[idx];
  if (!cell) return;

  const isHit = idx === state.currentIndex;

  if (isHit) {
    registerReactionHit();

    cell.classList.add("hit");
    setTimeout(() => cell.classList.remove("hit"), 140);

    state.hits++;
    state.streak++;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;

    // sanfte Beschleunigung
    state.spawnMs = Math.max(
      state.minSpawnMs,
      Math.round(state.spawnMs * state.speedDecay)
    );

    spawnNewTarget(idx);
    updateHud();
  } else {
    // ❗ Fehlklick
    state.wrongClicks++;
    state.streak = 0;

    cell.classList.add("miss");
    setTimeout(() => cell.classList.remove("miss"), 140);

    updateHud();
  }
}

function tick() {
  if (!state.running) return;

  state.remainingMs -= TICK_MS;
  if (state.remainingMs <= 0) {
    finishGrid("timeup", true);
    return;
  }

  const t = performance.now ? performance.now() : Date.now();
  if (state.currentIndex != null && state.spawnMs > 0) {
    if (t - state.lastSpawnTime >= state.spawnMs) {
      // ❗ Ziel ausgelaufen → Verpasst
      state.missedTargets++;
      state.streak = 0;

      const cells = getCells();
      const cur = cells[state.currentIndex];
      if (cur) {
        cur.classList.remove("active");
        cur.classList.add("miss");
        setTimeout(() => cur.classList.remove("miss"), 140);
      }

      spawnNewTarget(state.currentIndex);
    }
  }

  updateHud();
}

function calcAvgRt() {
  if (!state.rtSamples.length) return 0;
  const sum = state.rtSamples.reduce((a, b) => a + b, 0);
  return sum / state.rtSamples.length; // Sekunden
}

function finishGrid(endReason = "timeup", record = true) {
  if (!state.running && !state.tickTimer) return;

  state.running = false;
  if (state.tickTimer) {
    clearInterval(state.tickTimer);
    state.tickTimer = null;
  }

  clearActive();

  if (!record) return;

  const hits = state.hits;
  const wrong = state.wrongClicks || 0;
  const missed = state.missedTargets || 0;
  const misses = wrong + missed;
  const total = hits + misses;

  const avgRt = calcAvgRt(); // Sekunden
  const acc = total > 0 ? hits / total : 1;
  const hpm = state.durationSec > 0 ? hits / (state.durationSec / 60) : 0;

  try {
    endGame({
      modeId: `grid-${state.diffKey || "unknown"}`,
      modeGroup: "grid",
      difficulty: state.diffKey,
      score: hits,
      hits,
      misses,
      wrongClicks: wrong,
      missedTargets: missed,
      avgRt,
      accuracy: acc,
      hpm,
      bestStreak: state.bestStreak,
      durationSec: state.durationSec,
      finishedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[grid] endGame() error", e);
  }

  let reasonText = "–";
  switch (endReason) {
    case "timeup":
      reasonText = "Zeit abgelaufen";
      break;
    case "abort":
      reasonText = "Abgebrochen";
      break;
    default:
      reasonText = String(endReason);
      break;
  }

  // ✅ IDs wie im HTML:
  // - Fehlklicks: grid-res-misses
  // - Verpasste Klicks: grid-res-missed (musst du im HTML ergänzen)
  setText("grid-res-diff", state.label || state.diffKey || "–");
  setText("grid-res-score", String(hits));
  setText("grid-res-avg", `${Math.round(avgRt * 1000)} ms`);
  setText("grid-res-misses", String(wrong));
  setText("grid-res-missed", String(missed));
  setText("grid-res-endreason", reasonText);

  showScreen("grid-result");
}

export function stopGrid(endReason = "abort", record = false) {
  finishGrid(endReason, record);
}

export function startGridGame(config) {
  const screen = getGridScreen();
  if (!screen) return;

  ensureGridUI();

  if (state.tickTimer) {
    clearInterval(state.tickTimer);
    state.tickTimer = null;
  }

  state = {
    running: true,
    diffKey: config.diffKey,
    label: config.label || config.diffKey || "",
    durationSec: config.durationSec || 30,
    remainingMs: (config.durationSec || 30) * 1000,

    spawnMs: config.spawnMsStart || 1000,
    minSpawnMs: config.spawnMsMin || 600,
    speedDecay: config.speedDecay || 1,

    allowedIndices: (config.allowedIndices || []).slice(),
    currentIndex: null,
    lastSpawnTime: 0,

    hits: 0,
    wrongClicks: 0,
    missedTargets: 0,
    streak: 0,
    bestStreak: 0,

    rtSamples: [],
    tickTimer: null,
  };

  updateHud();
  spawnNewTarget(null);

  state.tickTimer = setInterval(tick, TICK_MS);

  window.lastGridDifficulty = state.diffKey;

  showScreen("grid");
}

export function getLastGridDifficulty() {
  return window.lastGridDifficulty || state.diffKey || "easy";
}
