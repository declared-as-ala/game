import * as planck from 'planck';
import type { Ball } from './Ball';

export class AIController {
  private ball: Ball;
  private targetBall: Ball | null = null;
  private thinkCooldown = 0;
  private impulseCooldown = 0;

  constructor(ball: Ball) {
    this.ball = ball;
    this.thinkCooldown = Math.random() * 0.5;
  }

  public update(dt: number, allBalls: Ball[]): void {
    if (this.ball.isDestroyed) return;

    this.thinkCooldown -= dt;
    this.impulseCooldown -= dt;

    if (this.thinkCooldown <= 0) {
      this.thinkCooldown = 0.4 + Math.random() * 0.4;
      this.pickTarget(allBalls);
    }

    if (this.targetBall && !this.targetBall.isDestroyed && this.impulseCooldown <= 0) {
      this.applySteeringImpulse();
    }
  }

  private pickTarget(allBalls: Ball[]): void {
    const candidates = allBalls.filter((b) => b !== this.ball && !b.isDestroyed && b.type !== this.ball.type);
    if (candidates.length === 0) {
      this.targetBall = null;
      return;
    }

    const myPos = this.ball.body.getPosition();
    let closestDist = Infinity;
    let closest: Ball | null = null;

    for (const c of candidates) {
      const cPos = c.body.getPosition();
      const dist = Math.hypot(cPos.x - myPos.x, cPos.y - myPos.y);
      if (dist < closestDist) {
        closestDist = dist;
        closest = c;
      }
    }

    this.targetBall = closest;
  }

  private applySteeringImpulse(): void {
    if (!this.targetBall) return;

    const myPos = this.ball.body.getPosition();
    const targetPos = this.targetBall.body.getPosition();

    const dx = targetPos.x - myPos.x;
    const dy = targetPos.y - myPos.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0.1) {
      // Add slight randomized imperfection
      const jitterAngle = (Math.random() - 0.5) * 0.5;
      const baseAngle = Math.atan2(dy, dx) + jitterAngle;

      const power = 3.5 + Math.random() * 3.0;
      const impulse = planck.Vec2(Math.cos(baseAngle) * power, Math.sin(baseAngle) * power);

      this.ball.applyImpulse(impulse);
      this.impulseCooldown = 0.8 + Math.random() * 0.8;
    }
  }
}
