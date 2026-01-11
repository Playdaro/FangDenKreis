// shapeShiftMedium.js
import { SHAPES, COLORS } from './shapeShiftCore.js';

export function getShapeShiftMediumConfig() {
  return {
    label: 'medium',
    count: 4,
    speedMin: 0.8,
    speedMax: 1.5,
    shapes: SHAPES.slice(0, 3),
    colors: COLORS.slice(0, 3),
    limitMs: 30000,
    goalHits: 30,
    targetChance: 0.35,
    
    targetMode: 'color',
    switchOnHit: true
  };
}
