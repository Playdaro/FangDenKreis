import { startSoundColor } from './soundCore.js';

export function startSoundMedium() {
  startSoundColor({
    label: "Mittel",
    colors: ["rot", "grün", "blau"],
    speedPxPerSec: 220,
    totalMs: 30000,
    count: 3,
    ballSizePx: 52
  });
}
