// mindSwitchMedium.js – FINAL
import { runMindSwitch } from "./mindSwitchRunner.js";

const colors = ["Rot", "Grün"];
const sides = ["links", "rechts"];

function generateMediumPrompt() {
  const word = colors[Math.floor(Math.random() * colors.length)];
  const side = sides[Math.floor(Math.random() * sides.length)];

  const mismatch = Math.random() < 0.5;
  const displayColor = mismatch
    ? (word === "Rot" ? "lime" : "red")
    : (word === "Rot" ? "red" : "lime");

  return {
    promptText: `${word} ${side}`,
    correctSide: side === "links" ? "left" : "right",
    cueType: "color",
    color: displayColor
  };
}

export function startMindMedium() {
  runMindSwitch({
    modeLabel: "Medium",
    durationMs: 40000,
    stepTimeoutMs: 4000,
    generatePrompt: generateMediumPrompt,
    colorMap: { red: "red", lime: "lime" }
  });
}
