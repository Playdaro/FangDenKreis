// gridTimingCore.js – Master HUD + Master Playfield (3×3)
import { showScreen } from "../screens.js";
import { endGame } from "../core.js";

const GRID_SIZE = 3;
const TICK_MS = 16;

let state = {
  running: false,
  diffKey: null,
  label: "",
  sessionBudgetMs: 0,
  remainingMs: 0,
  maxWaitSec: 0,
  greenWindowMs: 0,
  changeAfterHits: 0,
  modeId: "",

  score: 0,
  misses: 0,
  streak: 0,
  bestStreak: 0,

  currentIdx: null,
  hitsOnCurrent: 0,

  isActive: false,
  isGreen: false,
  greenStartTs: 0,
  lastTickTs: 0,

  ticker: null,
  greenWindowTimeout: null,

  totalErrorMs: 0,
  hitCount: 0,
};

function q(id) { return document.getElementById(id); }

function fmtSec3(ms) {
  const s = Math.max(0, ms) / 1000;
  return s.toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function getScreen() {
  const s = q("screen-gridtiming");
  if (!s) console.warn("[gridTimingCore] #screen-gridtiming fehlt.");
  return s;
}

function ensureUI() {
  const screen = getScreen();
  if (!screen) return null;

  const board = q("gridtiming-board");
  if (!board) {
    console.error("[gridTimingCore] #gridtiming-board fehlt im HTML.");
    return null;
  }

  // 9 Buttons sicherstellen
  if (board.querySelectorAll(".gridtiming-cell").length !== 9) {
    board.innerHTML = "";
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "gridtiming-cell";
      b.dataset.idx = String(i);
      b.addEventListener("pointerdown", onCellClick);
      board.appendChild(b);
    }
  }

  // Back Button
  q("gridtiming-back")?.addEventListener("click", () => {
    stopGridTiming("abort", false);
    showScreen("menu");
  }, { once: true });

  return { board };
}

function updateHud() {
  const sEl = q("gridtiming-score");
  const mEl = q("gridtiming-misses");
  const stEl = q("gridtiming-streak");
  const tEl = q("gridtiming-time");

  if (sEl) sEl.textContent = String(state.score);
  if (mEl) mEl.textContent = String(state.misses);
  if (stEl) stEl.textContent = String(state.streak);
  if (tEl) tEl.textContent = fmtSec3(state.remainingMs);
}

function clearCells() {
  const board = q("gridtiming-board");
  if (!board) return;
  board.querySelectorAll(".gridtiming-cell").forEach((el) => {
    el.classList.remove("is-red", "is-green", "is-wrong");
  });
}

function lightCell(idx, mode) {
  const board = q("gridtiming-board");
  if (!board) return;
  const el = board.querySelector(`[data-idx="${idx}"]`);
  if (!el) return;

  el.classList.remove("is-red", "is-green", "is-wrong");
  if (mode === "red") el.classList.add("is-red");
  if (mode === "green") el.classList.add("is-green");
}

function wrongFeedback() {
  const board = q("gridtiming-board");
  if (!board) return;

  board.querySelectorAll(".gridtiming-cell").forEach((el) => {
    el.classList.add("is-wrong");
  });

  setTimeout(() => clearCells(), 150);
}

function pickOtherIndex(prev, max) {
  if (prev == null) return Math.floor(Math.random() * max);
  let idx;
  do { idx = Math.floor(Math.random() * max); } while (idx === prev);
  return idx;
}

function clearTimers() {
  if (state.ticker) { clearInterval(state.ticker); state.ticker = null; }
  if (state.greenWindowTimeout) { clearTimeout(state.greenWindowTimeout); state.greenWindowTimeout = null; }
}

function finish(reason = "ended", record = true) {
  state.running = false;
  clearTimers();
  clearCells();

  if (!record) return;

  const avgErrorMs = state.hitCount > 0 ? (state.totalErrorMs / state.hitCount) : null;

  const set = (id, val) => {
    const el = q(id);
    if (el) el.textContent = val;
  };

  set("gridtiming-res-diff", state.label || state.diffKey || "–");
  set("gridtiming-res-score", String(state.score));
  set("gridtiming-res-misses", String(state.misses));
  set("gridtiming-res-best", String(state.bestStreak));
  set("gridtiming-res-avgerr", avgErrorMs == null ? "–" : Math.round(avgErrorMs) + " ms");

  let reasonText = "Runde beendet";
  if (reason === "timeup") reasonText = "Zeitbank leer";
  if (reason === "abort") reasonText = "Abgebrochen";
  set("gridtiming-res-endreason", reasonText);

  try {
    endGame({
      modeId: state.modeId || "grid-timing",
      modeGroup: "gridtiming",
      difficulty: state.diffKey,
      score: state.score,
      hits: state.score,
      misses: state.misses,
      bestStreak: state.bestStreak,
      durationSec: state.sessionBudgetMs / 1000,
      avgErrorMs,
      finishedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[gridTimingCore] endGame() error", e);
  }

  showScreen("gridtiming-result");
}

async function runRound() {
  if (!state.running) return;
  if (state.remainingMs <= 0) { finish("timeup"); return; }

  const maxIndex = GRID_SIZE * GRID_SIZE;

  if (state.currentIdx == null || state.hitsOnCurrent >= state.changeAfterHits) {
    state.currentIdx = pickOtherIndex(state.currentIdx, maxIndex);
    state.hitsOnCurrent = 0;
  }

  state.isActive = true;
  state.isGreen = false;

  clearCells();
  lightCell(state.currentIdx, "red");

  const switchDelayMs = Math.floor(500 + Math.random() * (state.maxWaitSec * 1000 - 500));
  const plannedGreenTs = performance.now() + switchDelayMs;

  state.ticker = setInterval(() => {
    const now = performance.now();

    if (!state.isGreen && now >= plannedGreenTs) {
      state.isGreen = true;
      state.greenStartTs = now;
      state.lastTickTs = now;
      lightCell(state.currentIdx, "green");

      state.greenWindowTimeout = setTimeout(() => {
        if (state.isActive && state.isGreen) endRound(false, null);
      }, state.greenWindowMs);
    }

    if (state.isGreen) {
      const delta = now - state.lastTickTs;
      state.lastTickTs = now;
      state.remainingMs = Math.max(0, state.remainingMs - delta);
      updateHud();

      if (state.remainingMs <= 0) {
        endRound(false, null);
        finish("timeup");
      }
    }
  }, TICK_MS);
}

function endRound(hit, clickTime) {
  if (!state.isActive) return;
  state.isActive = false;

  clearTimers();

  if (hit) {
    const err = Math.max(0, clickTime - state.greenStartTs);
    state.totalErrorMs += err;
    state.hitCount++;

    state.score++;
    state.streak++;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    state.hitsOnCurrent++;
  } else {
    state.misses++;
    state.streak = 0;
    wrongFeedback();
  }

  updateHud();

  if (state.remainingMs > 0 && state.running) {
    setTimeout(() => { runRound(); }, 320);
  }
}

function onCellClick(e) {
  if (!state.running || !state.isActive) return;
  const idx = Number(e.currentTarget?.dataset?.idx);
  const now = performance.now();

  if (idx === state.currentIdx && state.isGreen) {
    endRound(true, now);
  } else {
    endRound(false, null);
  }
}

export function startGridTiming(config) {
  const screen = getScreen();
  if (!screen) return;

  ensureUI();

  clearTimers();
  state = {
    ...state,
    running: true,
    diffKey: config.diffKey,
    label: config.label || config.diffKey || "",
    sessionBudgetMs: config.sessionBudgetMs || 10_000,
    remainingMs: config.sessionBudgetMs || 10_000,
    maxWaitSec: config.maxWaitSec || 5,
    greenWindowMs: config.greenWindowMs || 700,
    changeAfterHits: config.changeAfterHits || 3,
    modeId: config.modeId || "grid-timing",

    score: 0,
    misses: 0,
    streak: 0,
    bestStreak: 0,

    currentIdx: null,
    hitsOnCurrent: 0,

    isActive: false,
    isGreen: false,
    greenStartTs: 0,
    lastTickTs: 0,

    ticker: null,
    greenWindowTimeout: null,

    totalErrorMs: 0,
    hitCount: 0,
  };

  updateHud();

  window.lastGridTimingDifficulty = state.diffKey;

  setTimeout(() => {
    if (state.running) runRound();
  }, 300);

  showScreen("gridtiming");
}

export function stopGridTiming(reason = "abort", record = false) {
  if (!state.running) return;
  if (!record) { state.running = false; clearTimers(); clearCells(); return; }
  finish(reason, record);
}
