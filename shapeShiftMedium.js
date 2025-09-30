import { startShapeShift, SHAPES, COLORS } from './shapeShift.js';

export function startShapeShiftMedium() {
  const shapes = SHAPES.filter(s => ['circle','square','triangle','star'].includes(s.cls));
  const colors = COLORS.slice(0, 4); // Rot, Grün, Blau, Gelb
  return startShapeShift({
    count: 4,
    speedMin: 1.2,
    speedMax: 2.2,
    shapes,
    colors,
    limitMs: 30000
  });
}
