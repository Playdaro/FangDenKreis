import { startMindSwitch } from './mindSwitchRunner.js';
import { endGame } from './core.js';

export function startMindSwitchMedium() {
  const cfg = {
    modeId: 'mind-medium',
    difficulty: 'medium',
    totalTimeMs: 40000,
    variants: ['Rot links','Rot rechts','Grün links','Grün rechts'],
    wordColorChaos: true,
    timeoutPenalty: 1,
    flashDelayMs: 120,
    noImmediateRepeat: true
  };

  startMindSwitch(cfg, 'MindSwitch-Medium', (res) => {
    const score       = res.score ?? 0;
    const misses      = res.misses ?? 0;
    const bestStreak  = res.bestStreak ?? 0;
    const durationSec = (res.durationMs ?? cfg.totalTimeMs) / 1000;

    const rt = Array.isArray(res.reactionTimes) ? res.reactionTimes : [];
    const avgRt = rt.length ? rt.reduce((a,b)=>a+b,0) / rt.length : 0;
    const accuracy = (score + misses) ? score / (score + misses) : 0;
    const hpm = durationSec ? (score / (durationSec / 60)) : 0;

    endGame({
      modeGroup:  'mind',
      modeId:     'mind-medium',
      difficulty: 'medium',
      score,
      hits:       score,
      misses,
      bestStreak,
      durationSec,
      avgRt,
      accuracy,
      hpm,
      finishedAt: res.finishedAt || new Date().toISOString()
    });
  });
}
