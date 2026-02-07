// overloadControlCore.js

import { endGame } from "../core.js";
import { showScreen } from "../screens.js";

const TICK_MS = 100;

const $ = (id) => document.getElementById(id);
const setText = (id, val) => {
  const el = $(id);
  if (el) el.textContent = String(val);
};

let state = {
  running: false,

  modeKey: "overload",
  diffKey: null,

  durationSec: 30,
  remainingMs: 0,

  penaltyMs: 0,          // 👈 NEU: Zeitstrafe pro Schwierigkeit

  shouldClick: false,
  tickTimer: null,

  // Stats
  decisions: 0,
  correct: 0,
  wrong: 0,

  clicks: 0,
  falseClicks: 0,
  missedClicks: 0,

  inhibitionCorrect: 0,
  inhibitionWrong: 0,

  streak: 0,
  bestStreak: 0,
};

function resetState(config) {
  Object.assign(state, {
    running: false,

    diffKey: config.diffKey,
    durationSec: config.durationSec ?? 30,
    remainingMs: 0,

    penaltyMs: config.penaltyMs ?? 0,   // 👈 hier übernommen

    shouldClick: false,
    tickTimer: null,

    decisions: 0,
    correct: 0,
    wrong: 0,

    clicks: 0,
    falseClicks: 0,
    missedClicks: 0,

    inhibitionCorrect: 0,
    inhibitionWrong: 0,

    streak: 0,
    bestStreak: 0,
  });
}

export function setShouldClick(val) {
  state.shouldClick = !!val;
}

export function startOverloadControl(config) {
  resetState(config);

  state.running = true;
  state.remainingMs = state.durationSec * 1000;

  updateHUD();
  state.tickTimer = setInterval(tick, TICK_MS);
}

function tick() {
  if (!state.running) return;

  state.remainingMs -= TICK_MS;
  if (state.remainingMs < 0) state.remainingMs = 0;

  updateHUD();

  if (state.remainingMs <= 0) {
    finishGame();
  }
}

// =====================
// Entscheidungsauswertung
// =====================

export function registerClick() {
  if (!state.running) return false;

  state.decisions++;
  state.clicks++;

  let ok;

  if (state.shouldClick) {
    ok = true;
    state.correct++;
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
  } else {
    ok = false;
    state.wrong++;
    state.falseClicks++;
    state.streak = 0;
    applyPenalty();          // 👈 Zeitstrafe bei falschem Klick
  }

  updateHUD();
  return ok;
}

export function registerNoClick() {
  if (!state.running) return false;

  state.decisions++;

  let ok;

  if (!state.shouldClick) {
    ok = true;
    state.correct++;
    state.inhibitionCorrect++;
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
  } else {
    ok = false;
    state.wrong++;
    state.missedClicks++;
    state.inhibitionWrong++;
    state.streak = 0;
    // ❗ bewusst KEINE Zeitstrafe hier
  }

  updateHUD();
  return ok;
}

// =====================
// Zeitstrafe
// =====================

function applyPenalty() {
  if (state.penaltyMs <= 0) return;

  state.remainingMs -= state.penaltyMs;
  if (state.remainingMs < 0) state.remainingMs = 0;
}

// =====================
// HUD
// =====================

function updateHUD() {
  setText("overload-time", Math.ceil(state.remainingMs / 1000));
  setText("overload-decisions", state.decisions);
  setText("overload-wrong", state.wrong);
  setText("overload-streak", state.streak);
}

// =====================
// Game Over + Result
// =====================

function finishGame() {
  clearInterval(state.tickTimer);
  state.running = false;

  const accuracy = state.decisions
    ? Math.round((state.correct / state.decisions) * 100)
    : 0;

  setText("overload-res-diff", state.diffKey || "–");
  setText("overload-res-decisions", state.decisions);
  setText("overload-res-correct", state.correct);
  setText("overload-res-wrong", state.wrong);
  setText("overload-res-inhibit", state.inhibitionCorrect);
  setText("overload-res-best", state.bestStreak);
  setText("overload-res-acc", `${accuracy}%`);

  endGame({
    modeGroup: "mind",
    modeKey: state.modeKey,
    diffKey: state.diffKey,
    stats: {
      decisions: state.decisions,
      correct: state.correct,
      wrong: state.wrong,
      clicks: state.clicks,
      falseClicks: state.falseClicks,
      missedClicks: state.missedClicks,
      inhibitionCorrect: state.inhibitionCorrect,
      inhibitionWrong: state.inhibitionWrong,
      bestStreak: state.bestStreak,
      accuracy,
    },
  });

  showScreen("overload-result");
}
