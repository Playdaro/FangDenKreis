import { startVisual } from './visualCore.js';

export function startVisualEasy() {
  startVisual({
    totalMs: 30000,
    perStepMs: 1000,      // 1.0s Zeitfenster
    color: '#2ecc71',     // grün
    label: 'easy'
  });
}
