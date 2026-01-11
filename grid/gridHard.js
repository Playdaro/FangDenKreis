// gridHard.js
import { startGridGame } from './gridCore.js';

export function startGridHard() {
  startGridGame({
    diffKey: 'hard',
    label: 'Schwer',
    durationSec: 30,
    spawnMsStart: 700,
    spawnMsMin: 420,
    speedDecay: 0.95,
    allowedIndices: [0,1,2,3,4,5,6,7,8]
  });
}
