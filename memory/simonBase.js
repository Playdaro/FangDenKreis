// simonBase.js – Standalone "Simon Sagt" (3×3) auf #screen-memory / #memory-grid (Master-HUD kompatibel)

const GRID_SIZE = 3;
const $ = (id) => document.getElementById(id);
const getGrid = () => $("memory-grid");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randCell = () => Math.floor(Math.random() * GRID_SIZE * GRID_SIZE);

// HUD helper
function setText(id, val) {
  const el = $(id);
  if (el) el.textContent = String(val);
}

function setInputEnabled(enabled) {
  const grid = getGrid();
  if (!grid) return;
  grid.classList.toggle("simon-disabled", !enabled);
}

function setActive(idx, active) {
  const grid = getGrid();
  if (!grid) return;
  const cell = grid.querySelector(`[data-index="${idx}"]`);
  if (!cell) return;
  cell.classList.toggle("simon-active", active);
}

function buildGrid() {
  const grid = getGrid();
  if (!grid) return;

  grid.innerHTML = "";

  // Master: nutzt das gleiche Board-Layout wie Grid/GridTiming (100% vom playfield)
  grid.classList.add("grid-board");
  grid.classList.remove("grid-game");

  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "grid-cell simon-cell";
    cell.dataset.index = String(i);
    grid.appendChild(cell);
  }
}

let lastCleanup = null;

export function startSimon(options = {}) {
  const {
    durationSec = 30,
    startSeqLen = 1,
    showMsBase = 700,
    showMsDecay = 0.98,
    betweenMs = 250,
    difficulty = "easy",
    onError = "repeat",
  } = options;

  // Vorherigen Run beenden
  if (typeof lastCleanup === "function") {
    try { lastCleanup(); } catch {}
    lastCleanup = null;
  }

  const grid = getGrid();
  if (!grid) {
    console.warn("[Simon] #memory-grid nicht gefunden.");
    return;
  }

  buildGrid();

  // =====================
  // HUD (MASTER)
  // =====================
  let remaining = Number(durationSec) || 30;

  let score = 0;
  let misses = 0;
  let bestStreak = 0;
  let currentStreak = 0;

  setText("memory-score", score);
  setText("memory-misses", misses);
  setText("memory-beststreak", bestStreak);
  setText("memory-time", Math.ceil(remaining));

  // =====================
  // STATE
  // =====================
  let sequence = [];
  let userIndex = 0;

  let isShowing = false;
  let isFinished = false;

  let timerId = null;
  const startedAt = performance.now();

  // ---------------- TIMER ----------------
  function tick() {
    if (isFinished) return;

    remaining -= 0.1;

    if (remaining <= 0) {
      remaining = 0;
      setText("memory-time", 0);
      finish("timeup");
      return;
    }

    setText("memory-time", Math.ceil(remaining));
  }

  function startCountdown() {
    if (timerId !== null) return;
    timerId = setInterval(tick, 100);
  }

  function stopCountdown() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  // ---------------- SEQUENZEN ----------------
  function extendSequence(count = 1) {
    for (let i = 0; i < count; i++) sequence.push(randCell());
  }

  async function showSequence() {
    isShowing = true;
    stopCountdown(); // Timer pausieren während Anzeigen
    setInputEnabled(false);

    const len = sequence.length;
    const showMs = Math.max(260, Math.floor(showMsBase * Math.pow(showMsDecay, len)));

    for (let i = 0; i < len; i++) {
      const idx = sequence[i];
      setActive(idx, true);
      await sleep(showMs);
      setActive(idx, false);
      await sleep(betweenMs);
    }

    userIndex = 0;
    isShowing = false;
    setInputEnabled(true);
    startCountdown(); // Timer läuft weiter
  }

  function scheduleShow(delayMs = 400) {
    setTimeout(() => {
      if (!isFinished) showSequence();
    }, delayMs);
  }

  function applyErrorPolicy() {
    if (onError === "shrink" && sequence.length > 1) {
      sequence.pop();
    }
  }

  function handleCorrectSequence() {
    score += 1;
    currentStreak += 1;
    bestStreak = Math.max(bestStreak, currentStreak);

    setText("memory-score", score);
    setText("memory-beststreak", bestStreak);

    extendSequence(1);
    scheduleShow(600);
  }

  function handleMiss() {
    misses++;
    currentStreak = 0;

    setText("memory-misses", misses);
    setText("memory-beststreak", bestStreak);

    applyErrorPolicy();
    scheduleShow(600);
  }

  // ---------------- FINISH ----------------
  function finish(reason) {
    if (isFinished) return;
    isFinished = true;

    stopCountdown();
    setInputEnabled(false);

    const endedAt = performance.now();
    const durationPlayed = (endedAt - startedAt) / 1000;

    const detail = {
      reason,
      score,
      misses,
      bestStreak,
      difficulty,
      duration: durationPlayed,
      memoryMetrics: {
        itemsPerSec: durationPlayed > 0 ? score / durationPlayed : 0,
      },
    };

    document.dispatchEvent(new CustomEvent("memorymode:finished", { detail }));
  }

  // ---------------- INPUT ----------------
  const cells = Array.from(grid.querySelectorAll(".simon-cell"));
  const cellHandlers = [];

  function onCellClick(ev) {
    if (isFinished || isShowing) return;

    const idx = Number(ev.currentTarget.dataset.index);
    const expected = sequence[userIndex];

    if (idx === expected) {
      userIndex++;
      setActive(idx, true);
      setTimeout(() => setActive(idx, false), 150);

      if (userIndex >= sequence.length) {
        handleCorrectSequence();
      }
    } else {
      handleMiss();
    }
  }

  cells.forEach((cell) => {
    cell.addEventListener("click", onCellClick);
    cellHandlers.push([cell, "click", onCellClick]);
  });

  // Cleanup
  lastCleanup = () => {
    stopCountdown();
    cellHandlers.forEach(([el, type, fn]) => el.removeEventListener(type, fn));
  };

  // ================== START ==================
  extendSequence(startSeqLen);
  scheduleShow(400);
}
