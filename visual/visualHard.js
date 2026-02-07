// visualHard.js – nur Config (keine Starts, keine Imports)
import { startVisualCore } from "./visualCore.js";

export function startHard() {
  startVisualCore({
    diffKey: "hard",
    label: "Schwer",
    sessionMs: 30000,
    hitWindowMs: 500,
    circleSize: 48,
    color: "#e74c3c",
  });
}
