import { startShapeShift, COLORS, SHAPES } from './shapeShift.js';
import { setRestart } from './core.js';

export function startShapeShiftEasy() {
  const config = {
    count: 3,
    speedMin: 1.0,
    speedMax: 2.0,
    shapes: SHAPES.slice(0, 3),
    colors: COLORS.slice(0, 3),
    limitMs: 30000
  };

  startShapeShift(config);
  setRestart(() => startShapeShift(config));   // <<< WICHTIG
}
