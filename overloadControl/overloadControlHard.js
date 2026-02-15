// overloadControlHard.js

import { showScreen } from "../screens.js";
import { startRunner } from "./overloadControlRunner.js";

export function startHard() {
  window.lastOverloadDifficulty = "hard";
  showScreen("overload");

  startRunner({
    diffKey: "hard",
    label: "Schwer",
    durationSec: 40,

    spawnMs: 1100,        // Hard 2.0: schneller
    penaltyMs: 2500,      // Hard 2.0: härter

    // Hard 2.0: Regelwechsel
    hardRuleSwitchMs: 10_000, // alle 10s umschalten
    hardRuleStart: "A",       // "A" oder "B"

    // ruleFn wird im Hard nicht genutzt, kann aber drin bleiben:
    ruleFn: () => Math.random() < 0.25
  });
}
