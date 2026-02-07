import { startSimon } from "./simonBase.js";

export function startSimonHard() {
  startSimon({
    diffKey: "hard",
    label: "Schwer",
    durationSec: 20,
    startSeqLen: 2,
    showMsBase: 550,
    showMsDecay: 0.96,
    betweenMs: 200,
    modeId: "memory-simon-hard",
    onError: "shrink",
  });
}
