import { startShapeShift, COLORS, SHAPES } from './shapeShift.js';
import { setRestart } from './core.js';

export function startShapeShiftHard() {
  const config = {
    count: 5,
    speedMin: 2.0,
    speedMax: 4.0,
    shapes: SHAPES.slice(0, 5),
    colors: COLORS.slice(0, 5),
    limitMs: 30000
  };

  startShapeShift(config);
  setRestart(() => startShapeShift(config));   // <<< WICHTIG
}
