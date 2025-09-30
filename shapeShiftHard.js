import { startShapeShift, SHAPES, COLORS } from './shapeShift.js';

export function startShapeShiftHard() {
  // bewusste Auswahl „anspruchsvoller“ Formen
  const shapes = SHAPES.filter(s => ['diamond','pentagon','hexagon','star','heart'].includes(s.cls));
  const colors = COLORS.slice(0, 5); // Rot, Grün, Blau, Gelb, Lila
  return startShapeShift({
    count: 5,
    speedMin: 1.6,
    speedMax: 3.0,
    shapes,
    colors,
    limitMs: 30000
  });
}
