// gridMedium.js
import { startGridGame } from './gridCore.js';

export function startGridMedium() {
  startGridGame({
    diffKey: 'medium',
    label: 'Mittel',
    durationSec: 30,
    spawnMsStart: 850,
    spawnMsMin: 550,
    speedDecay: 0.96,
    allowedIndices: [0,1,2,3,4,5,6,7,8]
  });
}
