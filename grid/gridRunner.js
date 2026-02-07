// gridRunner.js
import { openDifficultySelect } from "../difficultySelect.js";
import { showScreen } from "../screens.js";
import { bindResultButtons } from "../result.js";

import { startGridEasy } from "./gridEasy.js";
import { startGridMedium } from "./gridMedium.js";
import { startGridHard } from "./gridHard.js";

// ============================================================
// RESULT BUTTONS (Retry/Menu) – GLOBAL result.js
// ============================================================
function bindGridResultOnce() {
  bindResultButtons({
    menuBtnId: "grid-res-menu",
    retryBtnId: "grid-res-retry",
    onRetry: () => {
      const diff = window.lastGridDifficulty || "easy";
      showScreen("grid");

      if (diff === "easy") startGridEasy();
      else if (diff === "medium") startGridMedium();
      else startGridHard();
    },
    menuKey: "menu",
  });
}

document.addEventListener("DOMContentLoaded", bindGridResultOnce);
bindGridResultOnce();

// ============================
// MENÜ → DIFFICULTY-SCREEN
// ============================
document.getElementById("btn-grid")?.addEventListener("click", () => {
  openDifficultySelect({
    modeKey: "grid",   // 👈 DAS ist der entscheidende Teil
    onStart: {
      easy: () => {
        window.lastGridDifficulty = "easy";
        showScreen("grid");
        startGridEasy();
      },
      medium: () => {
        window.lastGridDifficulty = "medium";
        showScreen("grid");
        startGridMedium();
      },
      hard: () => {
        window.lastGridDifficulty = "hard";
        showScreen("grid");
        startGridHard();
      },
    },
  });
});

