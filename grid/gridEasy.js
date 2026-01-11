// gridEasy.js
import { startGridGame } from './gridCore.js';

export function startGridEasy() {
  startGridGame({
    diffKey: 'easy',
    label: 'Leicht',
    durationSec: 30,
    spawnMsStart: 1000,
    spawnMsMin: 700,
    speedDecay: 0.97,
    allowedIndices: [0,1,2,3,4,5,6,7,8]
  });
}
