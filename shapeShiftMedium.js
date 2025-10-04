import { startShapeShift, COLORS, SHAPES } from './shapeShift.js';
import { setRestart } from './core.js';

export function startShapeShiftMedium() {
  const config = {
    count: 4,
    speedMin: 1.5,
    speedMax: 3.0,
    shapes: SHAPES.slice(0, 4),
    colors: COLORS.slice(0, 4),
    limitMs: 10000
  };

  startShapeShift(config);
  setRestart(() => startShapeShift(config));   // <<< WICHTIG
}
