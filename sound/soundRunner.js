// soundRunner.js – GLOBAL-KONFORM

import { openDifficultySelect } from "../difficultySelect.js";
import { showScreen } from "../screens.js";
import { bindResultButtons } from "../result.js";

import { startSoundEasy } from "./soundEasy.js";
import { startSoundMedium } from "./soundMedium.js";
import { startSoundHard } from "./soundHard.js";

// ============================================================
// RESULT BUTTONS (GLOBAL)
// ============================================================
function bindSoundResultOnce() {
  bindResultButtons({
    menuBtnId: "sound-res-menu",
    retryBtnId: "sound-res-retry",
    onRetry: () => {
      const diff = window.lastSoundDifficulty || "easy";
      showScreen("sound");

      if (diff === "easy") startSoundEasy();
      else if (diff === "medium") startSoundMedium();
      else startSoundHard();
    },
    menuKey: "menu",
  });
}

document.addEventListener("DOMContentLoaded", bindSoundResultOnce);

// ============================
// MENU → DIFFICULTY
// ============================
document.getElementById("btn-audio")?.addEventListener("click", () => {
  openDifficultySelect({
    modeKey: "sound",   // 👈 DAS ist der Fix
    onStart: {
      easy: () => {
        window.lastSoundDifficulty = "easy";
        showScreen("sound");
        startSoundEasy();
      },
      medium: () => {
        window.lastSoundDifficulty = "medium";
        showScreen("sound");
        startSoundMedium();
      },
      hard: () => {
        window.lastSoundDifficulty = "hard";
        showScreen("sound");
        startSoundHard();
      },
    },
  });
});

