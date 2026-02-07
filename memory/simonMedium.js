import { startSimon } from "./simonBase.js";

export function startSimonMedium() {
  startSimon({
    diffKey: "medium",
    label: "Mittel",
    durationSec: 25,
    startSeqLen: 1,
    showMsBase: 650,
    showMsDecay: 0.972,
    betweenMs: 250,
    modeId: "memory-simon-medium",
    onError: "repeat",
  });
}
