import { describe, it, expect } from 'vitest';
import * as planck from 'planck';

describe('Trajectory Physics & Specular Reflection Math', () => {
  it('should correctly calculate specular reflection normal', () => {
    // Ray coming from top-left going bottom-right: (1, 1) normalized
    const dir = planck.Vec2(Math.SQRT1_2, Math.SQRT1_2);
    // Wall normal pointing straight UP: (0, -1)
    const normal = planck.Vec2(0, -1);

    // Formula: R = D - 2 * (D . N) * N
    const dot = planck.Vec2.dot(dir, normal); // -Math.SQRT1_2
    const reflect = planck.Vec2(
      dir.x - 2 * dot * normal.x,
      dir.y - 2 * dot * normal.y
    );

    // After hitting horizontal floor, x should be positive and y should bounce UP (negative in screen/planck)
    expect(reflect.x).toBeCloseTo(Math.SQRT1_2);
    expect(reflect.y).toBeCloseTo(-Math.SQRT1_2);
  });
});
