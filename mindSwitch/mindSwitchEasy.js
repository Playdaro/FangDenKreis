// mindSwitchEasy.js – FINAL
import { runMindSwitch } from "./mindSwitchRunner.js";

export function startMindEasy() {

  function generatePrompt() {
    const colors = ["Rot", "Grün"];
    const sides = ["links", "rechts"];

    const word = colors[Math.floor(Math.random() * colors.length)];
    const side = sides[Math.floor(Math.random() * sides.length)];

    return {
      promptText: `${word} ${side}`,
      correctSide: side === "links" ? "left" : "right",
      cueType: "visual",
      color: word === "Rot" ? "red" : "lime"
    };
  }

  runMindSwitch({
    modeLabel: "Easy",
    label: 'Leicht',
    durationMs: 30000,
    stepTimeoutMs: 4000,
    generatePrompt,
    colorMap: { red: "red", lime: "lime" }
  });
}
