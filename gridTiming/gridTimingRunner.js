// gridTimingRunner.js
import { openDifficultySelect } from "../difficultySelect.js";
import { showScreen } from "../screens.js";
import { startGridTiming, stopGridTiming } from "./gridTimingCore.js";
import { GRID_TIMING_DIFFS } from "./gridTimingConfig.js";
import { bindResultButtons } from "../result.js";

document.getElementById("btn-gridtiming")?.addEventListener("click", () => {
  openDifficultySelect({
    modeKey: "gridTiming",
    onStart: {
      easy: () => startGridTiming(GRID_TIMING_DIFFS.easy),
      medium: () => startGridTiming(GRID_TIMING_DIFFS.medium),
      hard: () => startGridTiming(GRID_TIMING_DIFFS.hard),
    },
  });
});


// Result buttons global & robust
bindResultButtons({
  menuBtnId: "gridtiming-res-menu",
  retryBtnId: "gridtiming-res-retry",
  onRetry: () => {
    const key = window.lastGridTimingDifficulty || "easy";
    const cfg = GRID_TIMING_DIFFS[key] || GRID_TIMING_DIFFS.easy;
    startGridTiming(cfg);
  },
  menuKey: "menu",
});
