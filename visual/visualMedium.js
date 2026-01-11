import { startVisual } from './visualCore.js';

export function startVisualMedium() {
  startVisual({
    totalMs: 30000,
    perStepMs: 750,       // 0.75s Zeitfenster
    color: '#f1c40f',     // gelb
    label: 'medium'
  });
}
