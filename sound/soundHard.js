import { startSoundColor } from './soundCore.js';

export function startSoundHard() {
  startSoundColor({
    label: 'hard',
    colors: ['rot', 'grün', 'blau', 'gelb'],
    speedPxPerSec: 260,
    totalMs: 30000,
    count: 4
  });
}
