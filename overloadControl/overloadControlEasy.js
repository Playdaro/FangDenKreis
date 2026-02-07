// overloadControlEasy.js

import { showScreen } from "../screens.js";
import { startRunner } from "./overloadControlRunner.js";

export function startEasy(){
  window.lastOverloadDifficulty = "easy";
  showScreen("overload");

  startRunner({
    diffKey: "easy",
    label: "Leicht",
    durationSec: 30,
    spawnMs: 2000,
    penaltyMs: 1000,        // 👈 nur kleine Strafe
    ruleFn: () => Math.random() < 0.3
  });
}
