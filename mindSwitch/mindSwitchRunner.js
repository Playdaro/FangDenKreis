// mindSwitchRunner.js
console.log("[MindSwitchRunner] LOADED", import.meta.url);

import { openDifficultySelect } from "../difficultySelect.js";
import { showScreen } from "../screens.js";

import { startMindEasy } from "./mindSwitchEasy.js";
import { startMindMedium } from "./mindSwitchMedium.js";
import { startMindHard } from "./mindSwitchHard.js";

document.getElementById("btn-mind")?.addEventListener("click", () => {
  openDifficultySelect({
    title: "Mind Switch",
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
        <button id="mind-left" class="mind-half mind-left" type="button" aria-label="Links"></button>
        <button id="mind-right" class="mind-half mind-right" type="button" aria-label="Rechts"></button>
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

  if (!hintEl || !btnLeft || !btnRight || !timerEl) {
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

    // Bei dir ist correctSide vermutlich "links"/"rechts"
    if (p.correctSide === "links") currentCorrectSide = "left";
    else if (p.correctSide === "rechts") currentCorrectSide = "right";
    else currentCorrectSide = p.correctSide; // falls schon left/right kommt

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

    document.getElementById("mind-res-mode").textContent = config.modeLabel || "–";
    document.getElementById("mind-res-hits").textContent = String(hits);
    document.getElementById("mind-res-misses").textContent = String(misses);
    document.getElementById("mind-res-streak").textContent = String(bestStreak);
    document.getElementById("mind-res-avg").textContent = avg + " ms";
    document.getElementById("mind-res-acc").textContent =
      hits + misses === 0 ? "0%" : Math.round((hits / (hits + misses)) * 100) + "%";
    document.getElementById("mind-res-reason").textContent = reason;

    showScreen("mind-result");
  }
}
// ============================================================
// RESULT BUTTONS (Retry/Menu) – ROBUST BINDING
// ============================================================

function bindMindResultButtons() {
  const menuBtn  = document.getElementById("mind-res-menu");
  const retryBtn = document.getElementById("mind-res-retry");

  if (menuBtn) {
    menuBtn.onclick = () => {
      showScreen("menu");
    };
  }

  if (retryBtn) {
    retryBtn.onclick = async () => {
      const d = window.lastMindSwitchDifficulty || "easy";
      try {
        if (d === "easy") (await import("./mindSwitchEasy.js")).startMindEasy();
        else if (d === "medium") (await import("./mindSwitchMedium.js")).startMindMedium();
        else (await import("./mindSwitchHard.js")).startMindHard();
      } catch (err) {
        console.error("[MindSwitch] Retry fehlgeschlagen:", err);
      }
    };
  }
}

// DOM ready + Fallback (für Live Server / Reloads)
document.addEventListener("DOMContentLoaded", bindMindResultButtons);
bindMindResultButtons();
