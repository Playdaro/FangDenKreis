import { startSoundColor } from './soundCore.js';

export function startSoundEasy() {
  startSoundColor({
    label: 'easy',
    colors: ['rot', 'grün'],
    speedPxPerSec: 180,
    totalMs: 30000,
    count: 2
  });
}
