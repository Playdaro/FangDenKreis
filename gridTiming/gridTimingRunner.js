// gridTimingRunner.js – DifficultySelect + Start/Retry (Master Screens)
import { openDifficultySelect } from "../difficultySelect.js";
import { showScreen } from "../screens.js";
import { startGridTiming } from "./gridTimingCore.js";
import { GRID_TIMING_DIFFS } from "./gridTimingConfig.js";

document.getElementById("btn-gridtiming")?.addEventListener("click", () => {
  openDifficultySelect({
    title: "Timing-Training",
    onStart: {
      easy: () => {
        window.lastGridTimingDifficulty = "easy";
        showScreen("gridtiming");
        startGridTiming(GRID_TIMING_DIFFS.easy);
      },
      medium: () => {
        window.lastGridTimingDifficulty = "medium";
        showScreen("gridtiming");
        startGridTiming(GRID_TIMING_DIFFS.medium);
      },
      hard: () => {
        window.lastGridTimingDifficulty = "hard";
        showScreen("gridtiming");
        startGridTiming(GRID_TIMING_DIFFS.hard);
      },
    },
  });
});

// Result-Buttons
document.getElementById("gridtiming-res-menu")?.addEventListener("click", () => {
  showScreen("menu");
});

document.getElementById("gridtiming-res-retry")?.addEventListener("click", () => {
  const key = window.lastGridTimingDifficulty || "easy";
  const cfg = GRID_TIMING_DIFFS[key] || GRID_TIMING_DIFFS.easy;
  showScreen("gridtiming");
  startGridTiming(cfg);
});
