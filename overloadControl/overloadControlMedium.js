import { showScreen } from "../screens.js";
import { startRunner } from "./overloadControlRunner.js";

export function startMedium(){
  window.lastOverloadDifficulty = "medium";
  showScreen("overload");

  startRunner({
    diffKey: "medium",
    label: "Mittel",
    durationSec: 35,
    spawnMs: 2000,
    penaltyMs: 1500,       // 👈 spürbar
    ruleFn: () => Math.random() < 0.5
  });
}
