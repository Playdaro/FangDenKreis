// gridTiming.js – Reaktionszeit-Helfer für alle Grid-Modi

import { reactionTimes, lastMoveTime, setLastMoveTime } from './core.js';

/** Beim Erscheinen/Markieren eines Ziel-Feldes aufrufen */
export function gridMarkSpawn() {
  setLastMoveTime(Date.now());
}

/** Beim korrekten Treffer aufrufen (bevor du neu spawnst) */
export function gridRegisterHit() {
  if (!lastMoveTime) return;
  const rtSec = (Date.now() - lastMoveTime) / 1000;
  // Extremwerte filtern (optional, falls mal was hängt)
  if (rtSec >= 0 && rtSec < 10) {
    reactionTimes.push(rtSec);
  }
}
