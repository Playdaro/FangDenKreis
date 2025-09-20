import { startGridTiming } from './gridTimingBase.js';
export function startGridTimingMedium() {
  startGridTiming({
    durationSec: 60,
    windowMs: 120,
    minDelay: 900,
    maxDelay: 1700,
    lockoutMs: 300,
    difficulty: 'medium',
    modeId: 'grid-timing-medium'
  });
}
