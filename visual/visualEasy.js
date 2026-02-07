// visualEasy.js – nur Config (keine Starts, keine Imports)
import { startVisualCore } from "./visualCore.js";

export function startEasy() {
  startVisualCore({
    diffKey: "easy",
    label: "Leicht",
    sessionMs: 30000,
    hitWindowMs: 1000,
    circleSize: 56,
    color: "#2ecc71",
  });
}
