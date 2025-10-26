import { startMindSwitch } from './mindSwitchRunner.js';
import { endGame } from './core.js';

export function startMindSwitchEasy() {
  const cfg = {
    modeId: 'mind-easy',
    difficulty: 'easy',
    totalTimeMs: 30000,
    variants: ['Rot links','Rot rechts','Grün links','Grün rechts'],
    wordColorChaos: false,
    fixedColor: '#ffffff',
    timeoutPenalty: 0,
    flashDelayMs: 140,
    noImmediateRepeat: true
  };

  startMindSwitch(cfg, 'MindSwitch-Easy', (res) => {
    // res: { score, misses, bestStreak, reactionTimes, durationMs, finishedAt? }
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
      modeId:     'mind-easy',
      difficulty: 'easy',
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
