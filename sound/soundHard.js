import { startSoundColor } from './soundCore.js';

export function startSoundHard() {
  startSoundColor({
    label: "Schwer",
    colors: ["rot", "grün", "blau", "gelb"],
    speedPxPerSec: 260,
    totalMs: 30000,
    count: 4,
    ballSizePx: 40
  });
}
