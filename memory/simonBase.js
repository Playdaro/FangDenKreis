// simonBase.js – Simon sagt (GLOBAL-KONFORM)
// - nutzt endGame() + showScreen()
// - KEINE CustomEvents
// - Result-Buttons kommen aus result.js (bindResultButtons im Runner)

import { showScreen } from "../screens.js";
import { endGame } from "../core.js";
import { setText } from "../result.js";

const GRID_SIZE = 3;
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randCell = () => Math.floor(Math.random() * GRID_SIZE * GRID_SIZE);

let cleanupFn = null;
let finishFn = null;

// ======================================================
// PUBLIC API
// ======================================================
export function stopSimon(reason = "abort", record = false) {
  if (typeof finishFn === "function") {
    finishFn(reason, record);
  } else if (cleanupFn) {
    cleanupFn();
  }
}

export function startSimon(options = {}) {
  stopSimon("abort", false);

  const {
    diffKey = "easy",
    label = "–",
    durationSec = 30,
    startSeqLen = 1,
    showMsBase = 700,
    showMsDecay = 0.98,
    betweenMs = 250,
    modeId = `memory-simon-${diffKey}`,
    onError = "repeat", // repeat | shrink
  } = options;

  const grid = $("memory-grid");
  if (!grid) {
    console.warn("[Simon] #memory-grid fehlt");
    return;
  }

  buildGrid(grid);

  // ======================================================
  // STATE / HUD
  // ======================================================
  let remainingMs = durationSec * 1000;
  let score = 0;
  let misses = 0;
  let streak = 0;
  let bestStreak = 0;

  let sequence = [];
  let userIndex = 0;
  let isShowing = false;
  let finished = false;

  const rtSamples = [];
  let lastClickTs = 0;
  let timerId = null;
  const startedAt = performance.now();

  function updateHUD() {
    $("memory-score").textContent = String(score);
    $("memory-misses").textContent = String(misses);
    $("memory-beststreak").textContent = String(bestStreak);
    $("memory-time").textContent = String(
      Math.ceil(remainingMs / 1000)
    );
  }

  updateHUD();

  // ======================================================
  // TIMER
  // ======================================================
  function tick() {
    if (finished) return;
    remainingMs -= 100;

    if (remainingMs <= 0) {
      remainingMs = 0;
      updateHUD();
      finish("timeup", true);
      return;
    }
    updateHUD();
  }

  function startTimer() {
    if (!timerId) timerId = setInterval(tick, 100);
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  // ======================================================
  // SEQUENCE
  // ======================================================
  function extendSequence(n = 1) {
    for (let i = 0; i < n; i++) sequence.push(randCell());
  }

  async function showSequence() {
    isShowing = true;
    stopTimer();
    setInput(false);

    const len = sequence.length;
    const showMs = Math.max(
      260,
      Math.floor(showMsBase * Math.pow(showMsDecay, len))
    );

    for (const idx of sequence) {
      flash(idx, true);
      await sleep(showMs);
      flash(idx, false);
      await sleep(betweenMs);
    }

    userIndex = 0;
    isShowing = false;
    setInput(true);
    lastClickTs = performance.now();
    startTimer();
  }

  function onCorrect() {
    score++;
    streak++;
    bestStreak = Math.max(bestStreak, streak);
    updateHUD();

    extendSequence(1);
    setTimeout(showSequence, 500);
  }

  function onMiss() {
    misses++;
    streak = 0;
    updateHUD();

    if (onError === "shrink" && sequence.length > 1) {
      sequence.pop();
    }
    setTimeout(showSequence, 500);
  }

  // ======================================================
  // FINISH
  // ======================================================
  function finish(reason = "timeup", record = true) {
    if (finished) return;
    finished = true;

    stopTimer();
    setInput(false);

    cleanup();
    finishFn = null;

    if (!record) return;

    const avgRt =
      rtSamples.length > 0
        ? rtSamples.reduce((a, b) => a + b, 0) / rtSamples.length
        : 0;

    const accuracy =
      score + misses > 0 ? score / (score + misses) : 1;

    endGame({
      modeGroup: "memory",
      modeId,
      difficulty: diffKey,

      score,
      hits: score,
      misses,
      bestStreak,
      avgRt,
      accuracy,
      durationSec,
      finishedAt: new Date().toISOString(),
    });

    // RESULT UI
    setText("mem-res-diff", label);
    setText("mem-res-score", String(score));
    setText("mem-res-misses", String(misses));
    setText("mem-res-streak", String(bestStreak));
    setText("mem-res-accuracy", `${Math.round(accuracy * 100)}%`);

    showScreen("memory-result");
  }

  finishFn = finish;

  // ======================================================
  // INPUT
  // ======================================================
  const handlers = [];

  grid.querySelectorAll(".simon-cell").forEach((cell) => {
    const fn = () => {
      if (finished || isShowing) return;

      const idx = Number(cell.dataset.index);
      const expected = sequence[userIndex];

      const now = performance.now();
      if (lastClickTs) {
        const rt = (now - lastClickTs) / 1000;
        if (rt > 0 && rt < 10) rtSamples.push(rt);
      }
      lastClickTs = now;

      flash(idx, true);
      setTimeout(() => flash(idx, false), 120);

      if (idx === expected) {
        userIndex++;
        if (userIndex >= sequence.length) onCorrect();
      } else {
        onMiss();
      }
    };

    cell.addEventListener("click", fn);
    handlers.push([cell, fn]);
  });

  function cleanup() {
    handlers.forEach(([el, fn]) =>
      el.removeEventListener("click", fn)
    );
    stopTimer();
  }

  cleanupFn = cleanup;

  // ======================================================
  // START
  // ======================================================
  extendSequence(startSeqLen);
  setTimeout(showSequence, 400);
  window.lastMemoryDifficulty = diffKey;
}

// ======================================================
// HELPERS
// ======================================================
function buildGrid(grid) {
  grid.innerHTML = "";
  grid.classList.add("grid-board");

  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "grid-cell simon-cell";
    btn.dataset.index = String(i);
    grid.appendChild(btn);
  }
}

function flash(idx, on) {
  const el = document.querySelector(
    `#memory-grid [data-index="${idx}"]`
  );
  if (el) el.classList.toggle("simon-active", on);
}

function setInput(enabled) {
  $("memory-grid")?.classList.toggle(
    "simon-disabled",
    !enabled
  );
}
