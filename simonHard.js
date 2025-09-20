import { startSimon } from './simonBase.js';
export function startSimonHard(){
  startSimon({
    durationSec: 20,
    startSeqLen: 2,
    showMsBase: 550,
    showMsDecay: 0.960,
    betweenMs: 200,
    difficulty: 'hard',
    modeId: 'memory-simon-hard',
    onError: 'shrink' // Fehler verschärft: Sequenz wird um 1 verkürzt
  });
}
