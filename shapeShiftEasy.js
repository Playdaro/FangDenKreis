import { startShapeShift, SHAPES, COLORS } from './shapeShift.js';

export function startShapeShiftEasy() {
  const shapes = SHAPES.filter(s => ['circle','square','triangle'].includes(s.cls));
  const colors = COLORS.slice(0, 3); // Rot, Grün, Blau
  return startShapeShift({
    count: 3,
    speedMin: 0.9,
    speedMax: 1.6,
    shapes,
    colors,
    limitMs: 30000
  });
}
