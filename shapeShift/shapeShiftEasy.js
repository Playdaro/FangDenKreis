// shapeShiftEasy.js
import { SHAPES, COLORS } from './shapeShiftCore.js';

export function getShapeShiftEasyConfig() {
  return {
    label: 'Einfach',
    count: 3,
    speedMin: 1.2,
    speedMax: 2.0,
    shapes: SHAPES.slice(0, 2),
    colors: COLORS.slice(0, 2),
    limitMs: 30000,
    goalHits: 20,
    targetChance: 0.35,


    targetMode: 'shape',
    switchOnHit: true
  };
}
