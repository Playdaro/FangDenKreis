// visualCore.js — FINAL
// - Startet Visual-Run
// - Wertet aus
// - Bindet Result-Buttons korrekt (Retry / Menü)
// - Difficulty-Anzeige über formatDifficulty()

import { showScreen } from "../screens.js";
import {
  setText,
  formatDifficulty,
  bindResultButtons
} from "../result.js";

const now = () => performance.now();
let teardown = null;

export function stopVisual() {
  if (typeof teardown === "function") teardown();
  teardown = null;
}

export function startVisualCore(config) {
  stopVisual();

  const {
    diffKey = "easy",
    sessionMs = 30_000,
    hitWindowMs = 1_000,
    circleSize = 56,
    color = "#2ecc71",
  } = config || {};

  window.lastVisualDifficulty = diffKey;
  showScreen("visual");

  const scoreEl = document.getElementById("vs-score");
  const missEl  = document.getElementById("vs-misses");
  const timeEl  = document.getElementById("vs-time");
  const arena   = document.getElementById("vs-arena");
  const backBtn = document.getElementById("vs-back");

  if (!arena) {
    console.error("[visual] #vs-arena fehlt");
    return;
  }

  if (getComputedStyle(arena).position === "static") {
    arena.style.position = "relative";
  }

  arena.querySelectorAll(".ss-hint").forEach(el => el.remove());

  let running = true;
  let hits = 0;
  let wrongClicks = 0;
  let missedTargets = 0;
  const rts = [];

  let spawnT = 0;
  let deadlineT = 0;

  const endT = now() + sessionMs;

  if (scoreEl) scoreEl.textContent = "0";
  if (missEl) missEl.textContent = "0";
  if (timeEl) timeEl.textContent = String(Math.ceil(sessionMs / 1000));

  // =====================================
  // Ziel-Kreis
  // =====================================
  const circle = document.createElement("div");
  circle.className = "vs-circle";
  circle.style.position = "absolute";
  circle.style.width = `${circleSize}px`;
  circle.style.height = `${circleSize}px`;
  circle.style.borderRadius = "999px";
  circle.style.background = color;
  circle.style.cursor = "pointer";
  circle.style.zIndex = "10";
  circle.style.pointerEvents = "auto";
  circle.style.touchAction = "manipulation";
  arena.appendChild(circle);

  function updateHud() {
    if (scoreEl) scoreEl.textContent = String(hits);
    if (missEl) missEl.textContent = String(wrongClicks + missedTargets);

    const remain = Math.max(0, endT - now());
    if (timeEl) timeEl.textContent = String(Math.ceil(remain / 1000));
  }

  function moveCircle() {
    const rect = arena.getBoundingClientRect();
    const pad = 12;

    const maxX = Math.max(pad, rect.width  - circleSize - pad);
    const maxY = Math.max(pad, rect.height - circleSize - pad);

    const x = pad + Math.random() * Math.max(0, (maxX - pad));
    const y = pad + Math.random() * Math.max(0, (maxY - pad));

    circle.style.left = `${x}px`;
    circle.style.top  = `${y}px`;

    spawnT = now();
    deadlineT = spawnT + hitWindowMs;
  }

  // =====================================
  // Finish + Result
  // =====================================
  function finish(reason) {
    running = false;

    const avg =
      rts.length > 0
        ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length)
        : 0;

    setText("vs-res-diff", formatDifficulty(diffKey));
    setText("vs-res-steps", String(hits));
    setText("vs-res-avg", `${avg} ms`);
    setText("vs-res-misses", String(wrongClicks + missedTargets));
    setText("vs-res-endreason", reason);

    bindResultButtons({
      menuBtnId: "vs-res-menu",
      retryBtnId: "vs-res-retry",
      onRetry: () => {
        startVisualCore({
          diffKey,
          sessionMs,
          hitWindowMs,
          circleSize,
          color,
        });
      },
    });

    showScreen("visual-result");
  }

  // =====================================
  // Events
  // =====================================
  const onCircleDown = (e) => {
    if (!running) return;
    e.preventDefault?.();
    e.stopPropagation?.();

    rts.push(now() - spawnT);
    hits++;

    moveCircle();
    updateHud();
  };

  const onArenaDown = () => {
    if (!running) return;
    wrongClicks++;
    moveCircle();
    updateHud();
  };

  circle.addEventListener("pointerdown", onCircleDown);
  arena.addEventListener("pointerdown", onArenaDown);

  if (backBtn) {
    backBtn.onclick = () => {
      stopVisual();
      showScreen("menu");
    };
  }

  // =====================================
  // Loop
  // =====================================
  let raf = 0;
  function loop() {
    if (!running) return;

    if (now() >= endT) {
      finish("Zeit abgelaufen");
      return;
    }

    if (now() > deadlineT) {
      missedTargets++;
      moveCircle();
      updateHud();
    }

    raf = requestAnimationFrame(loop);
  }

  moveCircle();
  updateHud();
  raf = requestAnimationFrame(loop);

  teardown = () => {
    running = false;
    try { cancelAnimationFrame(raf); } catch {}
    try { arena.removeEventListener("pointerdown", onArenaDown); } catch {}
    try { circle.removeEventListener("pointerdown", onCircleDown); } catch {}
    try { if (circle.parentNode) circle.parentNode.removeChild(circle); } catch {}
    try { if (backBtn) backBtn.onclick = null; } catch {}
  };
}
