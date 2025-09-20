import { startGridTiming } from './gridTimingBase.js';
export function startGridTimingEasy() {
  startGridTiming({
    durationSec: 60,
    windowMs: 160,
    minDelay: 1000,
    maxDelay: 1800,
    lockoutMs: 250,
    difficulty: 'easy',
    modeId: 'grid-timing-easy'
  });
}
