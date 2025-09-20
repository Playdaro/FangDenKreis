import { startSimon } from './simonBase.js';
export function startSimonEasy(){
  startSimon({
    durationSec: 30,
    startSeqLen: 1,
    showMsBase: 750,
    showMsDecay: 0.985,
    betweenMs: 300,
    difficulty: 'easy',
    modeId: 'memory-simon-easy',
    onError: 'repeat'
  });
}
