import { startSimon } from './simonBase.js';
export function startSimonMedium(){
  startSimon({
    durationSec: 25,
    startSeqLen: 1,
    showMsBase: 650,
    showMsDecay: 0.972,
    betweenMs: 250,
    difficulty: 'medium',
    modeId: 'memory-simon-medium',
    onError: 'repeat'
  });
}
