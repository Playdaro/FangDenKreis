// visualMedium.js – nur Config (keine Starts, keine Imports)
import { startVisualCore } from "./visualCore.js";

export function startMedium() {
  startVisualCore({
    diffKey: "medium",
    label: "Mittel",
    sessionMs: 30000,
    hitWindowMs: 750,
    circleSize: 52,
    color: "#f1c40f",
  });
}
