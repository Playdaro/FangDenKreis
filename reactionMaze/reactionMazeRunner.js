// reactionMazeRunner.js – GLOBAL-KONFORM (wie Grid / Simon / Sound)

import { openDifficultySelect } from "../difficultySelect.js";
import { showScreen } from "../screens.js";
import { bindResultButtons } from "../result.js";

import { startMazeEasy } from "./reactionMazeEasy.js";
import { startMazeMedium } from "./reactionMazeMedium.js";
import { startMazeHard } from "./reactionMazeHard.js";

function bindMazeResultOnce() {
  bindResultButtons({
    menuBtnId: "maze-res-menu",
    retryBtnId: "maze-res-retry",
    onRetry: () => {
      const diff = window.lastMazeDifficulty || "easy";
      showScreen("maze");

      if (diff === "easy") startMazeEasy();
      else if (diff === "medium") startMazeMedium();
      else startMazeHard();
    },
    menuKey: "menu",
  });
}

document.addEventListener("DOMContentLoaded", bindMazeResultOnce);

document.getElementById("btn-maze")?.addEventListener("click", () => {
  openDifficultySelect({
    modeKey: "maze",
    onStart: {
      easy: () => {
        window.lastMazeDifficulty = "easy";
        showScreen("maze");
        startMazeEasy();
      },
      medium: () => {
        window.lastMazeDifficulty = "medium";
        showScreen("maze");
        startMazeMedium();
      },
      hard: () => {
        window.lastMazeDifficulty = "hard";
        showScreen("maze");
        startMazeHard();
      },
    },
  });
});

