import { startGridTiming } from './gridTimingBase.js';
export function startGridTimingHard() {
  startGridTiming({
    durationSec: 60,
    windowMs: 90,
    minDelay: 900,
    maxDelay: 1600,
    lockoutMs: 350,
    difficulty: 'hard',
    modeId: 'grid-timing-hard'
  });
}
