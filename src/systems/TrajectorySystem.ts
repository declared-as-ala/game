import { Container, Graphics } from 'pixi.js';
import * as planck from 'planck';
import type { PhysicsWorld } from '@/core/PhysicsWorld';
import type { AimState } from './AimSystem';
import type { Ball } from '@/entities/Ball';

export class TrajectorySystem {
  private physics: PhysicsWorld;
  private container: Container;
  private graphics: Graphics;
  private reticleGraphics: Graphics;

  constructor(physics: PhysicsWorld, parent: Container) {
    this.physics = physics;
    this.container = new Container();
    this.graphics = new Graphics();
    this.reticleGraphics = new Graphics();
    this.container.addChild(this.graphics);
    this.container.addChild(this.reticleGraphics);
    parent.addChild(this.container);
  }

  public renderTrajectory(aimState: AimState | null, playerBall: Ball | null): void {
    this.graphics.clear();
    this.reticleGraphics.clear();

    if (!aimState || !aimState.isAiming || !playerBall || aimState.powerPercent <= 0.05) {
      return;
    }

    const startPhys = playerBall.body.getPosition();
    const dirPhys = planck.Vec2(aimState.launchDirection.x, aimState.launchDirection.y);
    const maxRayDist = 12.0; // In physics meters

    const p1 = startPhys;
    const p2 = planck.Vec2(p1.x + dirPhys.x * maxRayDist, p1.y + dirPhys.y * maxRayDist);

    // Filter out player ball itself
    const playerFixture = playerBall.fixture;
    const hit1 = this.physics.raycastClosest(p1, p2, (fixture) => fixture !== playerFixture);

    const color = 0x00f0ff;

    if (hit1) {
      const renderStart = this.physics.toRenderVec(p1);
      const renderHit = this.physics.toRenderVec(hit1.point);

      // Draw first segment (dotted line)
      this.drawDottedLine(renderStart.x, renderStart.y, renderHit.x, renderHit.y, color, 1.0);

      // Draw collision reticle
      this.reticleGraphics
        .circle(renderHit.x, renderHit.y, 6)
        .stroke({ width: 2, color: 0xffffff, alpha: 0.9 })
        .circle(renderHit.x, renderHit.y, 3)
        .fill({ color: 0xff007f, alpha: 0.9 });

      // Calculate reflection vector: R = D - 2 * (D . N) * N
      const dot = planck.Vec2.dot(dirPhys, hit1.normal);
      const reflectDir = planck.Vec2(
        dirPhys.x - 2 * dot * hit1.normal.x,
        dirPhys.y - 2 * dot * hit1.normal.y
      );

      // Raycast second bounce
      const p3 = planck.Vec2(hit1.point.x + hit1.normal.x * 0.05, hit1.point.y + hit1.normal.y * 0.05);
      const p4 = planck.Vec2(p3.x + reflectDir.x * (maxRayDist * 0.6), p3.y + reflectDir.y * (maxRayDist * 0.6));

      const hit2 = this.physics.raycastClosest(p3, p4, (fixture) => fixture !== hit1.fixture && fixture !== playerFixture);

      const renderReflectStart = this.physics.toRenderVec(p3);
      const renderReflectEnd = hit2 ? this.physics.toRenderVec(hit2.point) : this.physics.toRenderVec(p4);

      // Draw second reflected bounce (faded)
      this.drawDottedLine(
        renderReflectStart.x,
        renderReflectStart.y,
        renderReflectEnd.x,
        renderReflectEnd.y,
        color,
        0.45
      );
    } else {
      // No collision: straight dotted ray
      const renderStart = this.physics.toRenderVec(p1);
      const renderEnd = this.physics.toRenderVec(p2);
      this.drawDottedLine(renderStart.x, renderStart.y, renderEnd.x, renderEnd.y, color, 0.7);
    }
  }

  private drawDottedLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number,
    baseAlpha: number
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const dotSpacing = 14;
    const numDots = Math.floor(dist / dotSpacing);

    for (let i = 1; i <= numDots; i++) {
      const t = i / numDots;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const alpha = baseAlpha * (1 - t * 0.4);
      const radius = 2.5 * (1 - t * 0.3);

      this.graphics
        .circle(px, py, radius)
        .fill({ color, alpha });
    }
  }

  public clear(): void {
    this.graphics.clear();
    this.reticleGraphics.clear();
  }
}
