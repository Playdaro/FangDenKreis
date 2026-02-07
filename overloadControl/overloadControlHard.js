// overloadControlHard.js

import { showScreen } from "../screens.js";
import { startRunner } from "./overloadControlRunner.js";

export function startHard(){
  window.lastOverloadDifficulty = "hard";
  showScreen("overload");

  startRunner({
    diffKey: "hard",
    label: "Schwer",
    durationSec: 40,
    spawnMs: 1500,
    penaltyMs: 2000,       // 👈 brutal
    ruleFn: () => Math.random() < 0.25
  });
}
