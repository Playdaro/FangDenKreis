import { startMindSwitch } from './mindSwitchRunner.js';
import { endGame } from './core.js';

export function startMindSwitchHard() {
  const cfg = {
    modeId: 'mind-hard',
    difficulty: 'hard',
    totalTimeMs: 45000,
    variants: ['Rot links','Rot rechts','Grün links','Grün rechts'],
    wordColorChaos: true,
    flashDelayMs: 100,
    noImmediateRepeat: true,
    timeoutPenalty: 2,
    cueMixed: true,
    listenWeight: 0.5,
    conflictProbability: 0.6
  };

  startMindSwitch(cfg, 'MindSwitch-Hard', (res) => {
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
      modeId:     'mind-hard',
      difficulty: 'hard',
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
