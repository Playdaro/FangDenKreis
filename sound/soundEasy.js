import { startSoundColor } from './soundCore.js';

export function startSoundEasy() {
  startSoundColor({
    label: "Einfach",
    colors: ["rot", "grün"],
    speedPxPerSec: 180,
    totalMs: 30000,
    count: 2,
    ballSizePx: 64   // 👈 groß & angenehm
  });
}
