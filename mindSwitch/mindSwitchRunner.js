// mindSwitchRunner.js
console.log("[MindSwitchRunner] LOADED", import.meta.url);

import { openDifficultySelect } from "../difficultySelect.js";
import { showScreen } from "../screens.js";
import { bindResultButtons, showResult } from "../result.js";

import { startMindEasy } from "./mindSwitchEasy.js";
import { startMindMedium } from "./mindSwitchMedium.js";
import { startMindHard } from "./mindSwitchHard.js";

// ============================================================
// RESULT BUTTONS (Retry/Menu) – GLOBAL result.js
// (Optional: kann bleiben, ist aber redundant wenn finish() showResult nutzt)
// ============================================================
function bindMindResultOnce() {
  bindResultButtons({
    menuBtnId: "mind-res-menu",
    retryBtnId: "mind-res-retry",
    onRetry: async () => {
      const d = window.lastMindSwitchDifficulty || "easy";
      if (d === "easy") startMindEasy();
      else if (d === "medium") startMindMedium();
      else startMindHard();
    },
    menuKey: "menu",
  });
}
document.addEventListener("DOMContentLoaded", bindMindResultOnce);
bindMindResultOnce();

// ============================================================
// MENU → DifficultySelect
// ============================================================
document.getElementById("btn-mind")?.addEventListener("click", () => {
  openDifficultySelect({
    modeKey: "mind",   // 👈 DAS ist der einzige nötige Fix
    onStart: {
      easy: () => {
        window.lastMindSwitchDifficulty = "easy";
        showScreen("mind");
        startMindEasy();
      },
      medium: () => {
        window.lastMindSwitchDifficulty = "medium";
        showScreen("mind");
        startMindMedium();
      },
      hard: () => {
        window.lastMindSwitchDifficulty = "hard";
        showScreen("mind");
        startMindHard();
      },
    },
  });
});


// ============================================================
// EXPORT: START GAME (UI wie ShapeShift, Logik bleibt)
// ============================================================
export function runMindSwitch(config) {
  console.log("[MindSwitch] Start", config.modeLabel, config);

  showScreen("mind");

  const screen = document.getElementById("screen-mind");
  if (!screen) {
    console.error("[MindSwitch] #screen-mind fehlt in index.html");
    return;
  }

  // Nur fallback bauen, wenn HTML fehlt (sonst würde Master-HUD überschrieben)
  if (!document.getElementById("mind-playfield")) {
    screen.innerHTML = `
      <div class="hud">
        <span>
          Treffer <strong id="mind-hits">0</strong>
          <span style="opacity:.6;">·</span>
          Fehlklicks <strong id="mind-misses">0</strong>
          <span style="opacity:.6;">·</span>
          Serie <strong id="mind-streak">0</strong>
        </span>

        <span><strong id="mind-timer-val">0</strong>s</span>
      </div>

      <div id="mind-playfield" class="playfield mind-playfield">
        <button id="mind-left" class="mind-left" type="button" aria-label="Links"></button>
        <button id="mind-right" class="mind-right" type="button" aria-label="Rechts"></button>
        <div id="mind-hint" class="ms-hint">–</div>
      </div>

      <button id="mind-back" class="btn-back">Zurück zum Menü</button>
    `;
  }

  const hintEl = document.getElementById("mind-hint");
  const btnLeft = document.getElementById("mind-left");
  const btnRight = document.getElementById("mind-right");

  const hitsEl = document.getElementById("mind-hits");
  const missesEl = document.getElementById("mind-misses");
  const streakEl = document.getElementById("mind-streak");
  const timerEl = document.getElementById("mind-timer-val");

  if (!hintEl || !btnLeft || !btnRight || !timerEl || !hitsEl || !missesEl || !streakEl) {
    console.error("[MindSwitch] UI-Elemente fehlen (Runner DOM).");
    return;
  }

  let hits = 0;
  let misses = 0;
  let streak = 0;
  let bestStreak = 0;
  let stepTimes = [];

  let isRunning = true;
  let lastStartTime = performance.now();

  let remaining = Math.ceil((config.durationMs || 30000) / 1000);
  timerEl.textContent = String(remaining);

  let currentCorrectSide = null; // "left" | "right"
  let stepTimeoutId = null;

  const timerInterval = setInterval(() => {
    if (!isRunning) return;
    remaining--;
    timerEl.textContent = String(Math.max(0, remaining));
    if (remaining <= 0) finish("Zeit abgelaufen");
  }, 1000);

  function renderHud() {
    hitsEl.textContent = String(hits);
    missesEl.textContent = String(misses);
    streakEl.textContent = String(streak);
  }

  function nextPrompt() {
    if (!isRunning) return;

    if (stepTimeoutId) clearTimeout(stepTimeoutId);
    stepTimeoutId = null;

    const p = config.generatePrompt();

    if (p.correctSide === "links") currentCorrectSide = "left";
    else if (p.correctSide === "rechts") currentCorrectSide = "right";
    else currentCorrectSide = p.correctSide;

    // Hint dauerhaft sichtbar, mittig
    hintEl.innerHTML = `<span style="color:${p.color}">${p.promptText}</span>`;

    lastStartTime = performance.now();

    stepTimeoutId = setTimeout(() => {
      if (!isRunning) return;
      finish("Keine Reaktion");
    }, config.stepTimeoutMs || 4000);
  }

  function handle(side) {
    if (!isRunning) return;

    stepTimes.push(performance.now() - lastStartTime);

    if (side === currentCorrectSide) {
      hits++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      misses++;
      streak = 0;
    }

    renderHud();
    nextPrompt();
  }

  btnLeft.addEventListener("click", () => handle("left"));
  btnRight.addEventListener("click", () => handle("right"));

  document.getElementById("mind-back")?.addEventListener("click", () => {
    finish("Abgebrochen");
    showScreen("menu");
  });

  renderHud();
  nextPrompt();

  function finish(reason) {
    if (!isRunning) return;
    isRunning = false;

    clearInterval(timerInterval);
    if (stepTimeoutId) clearTimeout(stepTimeoutId);

    const avg = stepTimes.length
      ? Math.round(stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length)
      : 0;

    const acc =
      hits + misses === 0
        ? "0%"
        : Math.round((hits / (hits + misses)) * 100) + "%";

    showResult({
      resultScreenKey: "mind-result",
      fields: [
        ["mind-res-mode", config.modeLabel || "–"],
        ["mind-res-hits", hits],
        ["mind-res-misses", misses],
        ["mind-res-streak", bestStreak],
        ["mind-res-avg", `${avg} ms`],
        ["mind-res-acc", acc],
        ["mind-res-reason", reason],
      ],
      menuBtnId: "mind-res-menu",
      retryBtnId: "mind-res-retry",
      onRetry: async () => {
        const d = window.lastMindSwitchDifficulty || "easy";
        if (d === "easy") startMindEasy();
        else if (d === "medium") startMindMedium();
        else startMindHard();
      },
      menuKey: "menu",
    });
  }
}
