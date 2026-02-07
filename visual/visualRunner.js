// visual/visualRunner.js
// NUR Spielstart – KEINE Difficulty-Auswahl

import { startEasy as startVisualEasy } from "./visualEasy.js";
import { startMedium as startVisualMedium } from "./visualMedium.js";
import { startHard as startVisualHard } from "./visualHard.js";

export function startEasy() {
  startVisualEasy();
}

export function startMedium() {
  startVisualMedium();
}

export function startHard() {
  startVisualHard();
}
