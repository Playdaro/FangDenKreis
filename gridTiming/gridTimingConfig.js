// gridTimingConfig.js – alle Difficulty-Configs für Timing-Modus

export const GRID_TIMING_DIFFS = {
  easy: {
    diffKey: "easy",
    label: "Leicht",
    sessionBudgetMs: 10_000,
    maxWaitSec: 5,
    greenWindowMs: 700,
    changeAfterHits: 3,
    modeId: "grid-timing-easy",
  },

  medium: {
    diffKey: "medium",
    label: "Mittel",
    sessionBudgetMs: 10_000,
    maxWaitSec: 4,
    greenWindowMs: 550,
    changeAfterHits: 3,
    modeId: "grid-timing-medium",
  },

  hard: {
    diffKey: "hard",
    label: "Schwer",
    sessionBudgetMs: 10_000,
    maxWaitSec: 3,
    greenWindowMs: 450,
    changeAfterHits: 4,
    modeId: "grid-timing-hard",
  },
};
