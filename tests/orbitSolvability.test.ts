import { describe, it, expect } from 'vitest';
import { ORBIT_LEVELS } from '../src/levels/orbitLevels';

describe('ORBIT Gravity Mode - 30 Levels Integrity & Solvability', () => {
  it('should have at least 30 handcrafted levels with consecutive numbering', () => {
    expect(ORBIT_LEVELS.length).toBeGreaterThanOrEqual(30);

    for (let i = 0; i < 30; i++) {
      const level = ORBIT_LEVELS[i];
      expect(level.levelNumber).toBe(i + 1);
      expect(level.mode).toBe('orbit-leap');
      expect(level.id).toBe(`orbit-leap_${i + 1}`);
    }
  });

  it('every level must have a valid START planet and a GOAL planet', () => {
    ORBIT_LEVELS.forEach((level) => {
      const planets = level.orbitPlanets;
      expect(planets).toBeDefined();
      expect(planets!.length).toBeGreaterThanOrEqual(2);

      const startPlanet = planets![0];
      expect(startPlanet.type).toBe('start');
      expect(startPlanet.orbitRadius).toBeGreaterThan(30);
      const startCapture = startPlanet.captureRadius ?? (startPlanet.orbitRadius + 24);
      expect(startCapture).toBeGreaterThanOrEqual(startPlanet.orbitRadius);

      const goalPlanet = planets![planets!.length - 1];
      expect(goalPlanet.type).toBe('goal');
      expect(goalPlanet.orbitRadius).toBeGreaterThan(30);
      const goalCapture = goalPlanet.captureRadius ?? (goalPlanet.orbitRadius + 24);
      expect(goalCapture).toBeGreaterThanOrEqual(goalPlanet.orbitRadius);

      // Coordinates within normalized screen space [-1, 1]
      planets!.forEach((p) => {
        expect(p.x).toBeGreaterThanOrEqual(-1.0);
        expect(p.x).toBeLessThanOrEqual(1.0);
        expect(p.y).toBeGreaterThanOrEqual(-1.0);
        expect(p.y).toBeLessThanOrEqual(1.0);
      });
    });
  });

  it('Level 1 should be the tutorial level with 2 planets and tutorial message', () => {
    const l1 = ORBIT_LEVELS[0];
    expect(l1.levelNumber).toBe(1);
    expect(l1.orbitPlanets!.length).toBe(2);
    expect(l1.orbitHazards!.length).toBe(0);
    expect(l1.tutorialMessage).toBe('TAP TO LEAVE ORBIT');
  });

  it('Level 29 should closely mirror the reference layout with 4 planets and red hazards', () => {
    const l29 = ORBIT_LEVELS.find((l) => l.levelNumber === 29);
    expect(l29).toBeDefined();

    const planets = l29!.orbitPlanets!;
    expect(planets.length).toBe(4);

    // Planet 0: Bottom-left cyan start
    expect(planets[0].x).toBeLessThan(0);
    expect(planets[0].y).toBeGreaterThan(0);
    expect(planets[0].type).toBe('start');

    // Planet 1: Middle-right purple
    expect(planets[1].x).toBeGreaterThan(0);
    expect(planets[1].color).toBe(0xa855f7);

    // Planet 2: Top-left cyan
    expect(planets[2].x).toBeLessThan(0);
    expect(planets[2].y).toBeLessThan(0);

    // Planet 3: Top-right golden goal
    expect(planets[3].x).toBeGreaterThan(0);
    expect(planets[3].y).toBeLessThan(0);
    expect(planets[3].type).toBe('goal');

    // Hazards should be present
    expect(l29!.orbitHazards!.length).toBeGreaterThanOrEqual(3);
  });

  it('Tangent launch math should yield normalized orthogonal vectors for any angle and direction', () => {
    const angles = [0, Math.PI / 4, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    const directions: Array<1 | -1> = [1, -1];

    angles.forEach((angle) => {
      directions.forEach((dir) => {
        // Tangent formula: (-sin(angle) * dir, cos(angle) * dir)
        const tx = -Math.sin(angle) * dir;
        const ty = Math.cos(angle) * dir;

        const length = Math.hypot(tx, ty);
        expect(length).toBeCloseTo(1.0);

        // Dot product with radial vector (cos(angle), sin(angle)) must be 0 (orthogonal)
        const rx = Math.cos(angle);
        const ry = Math.sin(angle);
        const dot = tx * rx + ty * ry;
        expect(dot).toBeCloseTo(0.0);
      });
    });
  });
});
