// simonRunner.js – FINAL (Grid-Pattern)
import { openDifficultySelect } from "../difficultySelect.js";
import { showScreen } from "../screens.js";
import { bindResultButtons } from "../result.js";

import { startSimonEasy } from "./simonEasy.js";
import { startSimonMedium } from "./simonMedium.js";
import { startSimonHard } from "./simonHard.js";
import { stopSimon } from "./simonBase.js";

// ============================================================
// RESULT BUTTONS (GLOBAL)
// ============================================================
function bindMemoryResultOnce() {
  bindResultButtons({
    menuBtnId: "mem-res-menu",
    retryBtnId: "mem-res-retry",
    onRetry: () => {
      const diff = window.lastMemoryDifficulty || "easy";
      showScreen("memory");

      if (diff === "easy") startSimonEasy();
      else if (diff === "medium") startSimonMedium();
      else startSimonHard();
    },
    menuKey: "menu",
  });
}

document.addEventListener("DOMContentLoaded", bindMemoryResultOnce);

// ============================
// MENU → DIFFICULTY
// ============================
document.getElementById("btn-memory")?.addEventListener("click", () => {
  openDifficultySelect({
    modeKey: "memory",
    onStart: {
      easy: () => {
        window.lastMemoryDifficulty = "easy";
        showScreen("memory");
        startSimonEasy();
      },
      medium: () => {
        window.lastMemoryDifficulty = "medium";
        showScreen("memory");
        startSimonMedium();
      },
      hard: () => {
        window.lastMemoryDifficulty = "hard";
        showScreen("memory");
        startSimonHard();
      },
    },
  });
});


// ============================
// INGAME BACK
// ============================
document.getElementById("memory-back")?.addEventListener("click", () => {
  stopSimon("abort", false);
  showScreen("menu");
});
