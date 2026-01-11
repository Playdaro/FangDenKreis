import { startVisual } from './visualCore.js';

export function startVisualHard() {
  startVisual({
    totalMs: 30000,
    perStepMs: 500,       // 0.5s Zeitfenster
    color: '#e74c3c',     // rot
    label: 'hard'
  });
}
