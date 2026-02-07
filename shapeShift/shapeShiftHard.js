// shapeShiftHard.js
import { SHAPES, COLORS } from './shapeShiftCore.js';

export function getShapeShiftHardConfig() {
  return {
    label: 'Schwer',
    count: 5,
    speedMin: 0.5,
    speedMax: 1.0,
    shapes: SHAPES,
    colors: COLORS,
    limitMs: 30000,
    goalHits: 40,
    targetChance: 0.35,


    targetMode: 'mixed',
    switchOnHit: true
  };
}
