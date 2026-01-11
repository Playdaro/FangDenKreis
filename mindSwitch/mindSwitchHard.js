// mindSwitchHard.js – FINAL
import { runMindSwitch } from "./mindSwitchRunner.js";

const colors = ["Rot", "Grün"];
const sides = ["links", "rechts"];

export function startMindHard() {
  runMindSwitch({
    modeLabel: "Hard",
    durationMs: 45000,
    stepTimeoutMs: 4000,

    generatePrompt() {
      const isMixed = Math.random() < 0.5;
      const conflict = Math.random() < 0.6;

      let word = colors[Math.floor(Math.random() * colors.length)];
      let side = sides[Math.floor(Math.random() * sides.length)];

      let displayColor = word === "Rot" ? "red" : "lime";

      if (isMixed && conflict) {
        displayColor = displayColor === "red" ? "lime" : "red";
      }

      return {
        promptText: `${word} ${side}`,
        correctSide: side === "links" ? "left" : "right",
        cueType: "mixed",
        color: displayColor
      };
    },

    colorMap: {
      red: "red",
      lime: "lime"
    }
  });
}
