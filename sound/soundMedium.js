import { startSoundColor } from './soundCore.js';

export function startSoundMedium() {
  startSoundColor({
    label: 'medium',
    colors: ['rot', 'grün', 'blau'],
    speedPxPerSec: 220,
    totalMs: 30000,
    count: 3
  });
}
