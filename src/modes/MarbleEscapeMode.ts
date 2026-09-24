import * as planck from 'planck';
import { Container, Graphics } from 'pixi.js';
import { BaseMode } from './BaseMode';
import { Arena } from '@/entities/Arena';
import { Marble } from '@/entities/Marble';
import type { Ball } from '@/entities/Ball';
import type { PhysicsWorld } from '@/core/PhysicsWorld';
import type { LevelConfig, LevelResult, Vector2D } from '@/data/types';
import type { ScreenShake } from '@/effects/ScreenShake';
import type { ObjectiveProgress } from '@/systems/ObjectiveSystem';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';

// Same neon marble palette as the godot_neon_marble_escape_multiplier_v21 reference
const MARBLE_COLORS = [
  0xff6e5b, 0xffc15b, 0xecff6a, 0x6cff9d, 0x5cf0ff, 0x6f9bff, 0xa16eff, 0xff7cc6,
];

const NEEDLE_SUBSTEPS = 6;
const HIT_COOLDOWN_MS = 55;

/**
 * Marble Escape: a circular arena with a rotating exit gap in its wall.
 * The player doesn't aim or launch — they drag left/right to spin a needle
 * that pivots from the arena's middle, using it to knock the bouncing
 * marbles toward the gap so they can escape. Win by getting every marble
 * out before the time budget runs out.
 *
 * The needle-vs-marble hit test is done manually (swept, sub-stepped)
 * instead of via a Planck fixture: at high spin speed the needle can sweep
 * tens of pixels between two physics steps, and a plain per-frame fixture
 * check can miss a marble entirely (it "passes through" without a bounce).
 */
export class MarbleEscapeMode extends BaseMode {
  private needleAngle = 0;
  private needleAngularVelocity = 0;
  private needleSensitivity = 0.05;
  private needleDamping = 0.6;
  private needleMaxSpeed = 5.5;
  private needleInnerRadius = 0;
  private needleOuterRadius = 0;
  private needleThickness = 12;
  private needleColor = 0xffd85c;
  private needleGraphics!: Graphics;

  private isDragging = false;
  private pointerAngle = 0;
  private hitCooldowns: Map<string, number> = new Map();

  constructor(
    physics: PhysicsWorld,
    worldContainer: Container,
    config: LevelConfig,
    screenShake: ScreenShake
  ) {
    super(physics, worldContainer, config, screenShake);
  }

  public init(): void {
    const cx = 0;
    const cy = 0;
    const arenaRadius = this.config.arenaSize || 190;

    this.arena = new Arena(this.physics, this.worldContainer, {
      shape: 'circle',
      centerX: cx,
      centerY: cy,
      radius: arenaRadius,
      color: this.config.arenaColor || 0x00f0ff,
      opening: this.config.arenaOpening,
    });

    const needleCfg = this.config.needle;
    this.needleSensitivity = needleCfg?.sensitivity ?? this.needleSensitivity;
    this.needleDamping = needleCfg?.damping ?? this.needleDamping;
    this.needleMaxSpeed = needleCfg?.maxAngularSpeed ?? this.needleMaxSpeed;
    this.needleThickness = needleCfg?.thickness ?? 12;
    this.needleColor = needleCfg?.color ?? 0xffd85c;
    this.needleAngle = needleCfg?.startAngle ?? 0;

    // Pivots from the middle: starts just off-center (like a real needle
    // hand) and reaches out to the wall, rather than spanning through it.
    this.needleInnerRadius = arenaRadius * 0.07;
    this.needleOuterRadius = needleCfg?.length ?? arenaRadius * 0.98;

    this.needleGraphics = new Graphics();
    this.worldContainer.addChild(this.needleGraphics);
    this.renderNeedle();

    const count = this.config.ballCount || 3;
    const spawnPositions = this.config.initialBallPositions;
    const ballRadius = 8;

    // Spread the spawn ring out enough that `count` marbles of this radius
    // don't start overlapping each other, however many a level packs in.
    const minSpawnDist = count > 1 ? (ballRadius * 1.3) / Math.sin(Math.PI / count) : 0;
    const spawnDist = Math.max(arenaRadius * 0.18, Math.min(minSpawnDist, arenaRadius * 0.42));

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const pos = spawnPositions?.[i];
      const sx = pos ? cx + pos.x * arenaRadius : cx + Math.cos(angle) * spawnDist;
      const sy = pos ? cy + pos.y * arenaRadius : cy + Math.sin(angle) * spawnDist;
      const color = MARBLE_COLORS[i % MARBLE_COLORS.length];

      const marble = new Marble(this.physics, this.worldContainer, {
        id: `ball_${this.nextBallId++}`,
        x: sx,
        y: sy,
        radius: ballRadius,
        color,
        glowColor: color,
        type: 'neutral',
        lives: 1,
        restitution: 0.93,
      });

      this.balls.push(marble);
      this.trails.registerBall(marble.id, marble.color, 'line');

      const launchDir = angle + Math.PI / 2;
      const speed = 25 + (i % 3) * 6;
      marble.body.setLinearVelocity(
        planck.Vec2(
          this.physics.toPhysicsX(Math.cos(launchDir) * speed),
          this.physics.toPhysicsY(Math.sin(launchDir) * speed)
        )
      );
    }
  }

  public override handlePointerDown(x: number, y: number): boolean {
    this.isDragging = true;
    this.pointerAngle = Math.atan2(y, x);
    return true;
  }

  public override handlePointerMove(x: number, y: number): void {
    if (!this.isDragging) return;
    this.pointerAngle = Math.atan2(y, x);
  }

  public override handlePointerUp(): boolean {
    this.isDragging = false;
    return true;
  }

  public override update(realDt: number): { progress: ObjectiveProgress; result: LevelResult | null } {
    this.resolveNeedleCollisions(realDt);
    this.renderNeedle();

    return super.update(realDt);
  }

  /**
   * The needle tracks the finger directly: while dragging, its target angle
   * is the finger's angle around the arena center, so it always points
   * exactly where you're touching. Released, it coasts on its last spin
   * speed and decays (the old drag-to-spin feel).
   *
   * Sweeps through several sub-steps per frame and tests every marble
   * against each sub-step's segment (matching the reference project's
   * SUBSTEPS = 6) — this is what prevents a fast-moving needle from
   * skipping clean over a marble between frames, whether that speed comes
   * from a fast drag or from residual coast.
   */
  private resolveNeedleCollisions(dt: number): void {
    const now = performance.now();
    const halfThickness = this.needleThickness / 2;

    let perSubstepDelta: number;

    if (this.isDragging) {
      const totalDelta = this.shortestAngleDiff(this.needleAngle, this.pointerAngle);
      // Derived spin speed only used for the bounce "kick" below; clamp so a
      // big finger jump (e.g. re-touching across the arena) can't fling a
      // marble unrealistically hard.
      this.needleAngularVelocity = Math.max(
        -this.needleMaxSpeed * 3,
        Math.min(this.needleMaxSpeed * 3, dt > 0 ? totalDelta / dt : 0)
      );
      perSubstepDelta = totalDelta / NEEDLE_SUBSTEPS;
    } else {
      // Coast and decay the needle's spin when the player isn't touching it
      this.needleAngularVelocity *= Math.max(0, 1 - this.needleDamping * dt);
      if (Math.abs(this.needleAngularVelocity) < 0.01) this.needleAngularVelocity = 0;
      perSubstepDelta = (this.needleAngularVelocity * dt) / NEEDLE_SUBSTEPS;
    }

    for (let s = 0; s < NEEDLE_SUBSTEPS; s++) {
      this.needleAngle += perSubstepDelta;
      const dirX = Math.cos(this.needleAngle);
      const dirY = Math.sin(this.needleAngle);
      const a: Vector2D = { x: dirX * this.needleInnerRadius, y: dirY * this.needleInnerRadius };
      const b: Vector2D = { x: dirX * this.needleOuterRadius, y: dirY * this.needleOuterRadius };

      for (const ball of this.balls) {
        if (ball.isDestroyed || ball.isEscaped) continue;

        const lastHit = this.hitCooldowns.get(ball.id) || 0;
        if (now - lastHit < HIT_COOLDOWN_MS) continue;

        // Read straight from the physics body: the view sprite hasn't been
        // re-synced yet this frame (that happens later, inside super.update()),
        // so ball.view.x/y would still be last frame's position here.
        const pos = this.physics.toRenderVec(ball.body.getPosition());
        const closest = this.closestPointOnSegment(pos, a, b);
        const dist = Math.hypot(pos.x - closest.x, pos.y - closest.y);
        const collisionRadius = ball.radius + halfThickness;
        if (dist > collisionRadius) continue;

        this.bounceBallOffNeedle(ball, pos, closest, dist, collisionRadius, now);
      }
    }
  }

  private bounceBallOffNeedle(
    ball: Ball,
    pos: Vector2D,
    contact: Vector2D,
    dist: number,
    collisionRadius: number,
    now: number
  ): void {
    // Velocity of the needle's surface at the contact point (tangential to its rotation)
    const wallVelX = -contact.y * this.needleAngularVelocity;
    const wallVelY = contact.x * this.needleAngularVelocity;

    const physVel = ball.getVelocity();
    const renderVel = this.physics.toRenderVec(physVel);
    const relVelX = renderVel.x - wallVelX;
    const relVelY = renderVel.y - wallVelY;

    const bx = pos.x;
    const by = pos.y;
    let normX = dist > 0.001 ? (bx - contact.x) / dist : 1;
    let normY = dist > 0.001 ? (by - contact.y) / dist : 0;

    let dot = relVelX * normX + relVelY * normY;
    if (dot > 0) {
      normX = -normX;
      normY = -normY;
      dot = -dot;
    }
    if (dot >= -1) return; // separating or negligible speed: no bounce

    const restitution = 0.78;
    const reflectedRelX = relVelX - (1 + restitution) * dot * normX;
    const reflectedRelY = relVelY - (1 + restitution) * dot * normY;

    const newVelX = reflectedRelX + wallVelX;
    const newVelY = reflectedRelY + wallVelY;

    const pushDist = collisionRadius - dist + 1.5;
    const newBx = bx + normX * pushDist;
    const newBy = by + normY * pushDist;

    ball.body.setPosition(this.physics.toPhysicsVec({ x: newBx, y: newBy }));
    ball.body.setLinearVelocity(planck.Vec2(this.physics.toPhysicsX(newVelX), this.physics.toPhysicsY(newVelY)));

    this.hitCooldowns.set(ball.id, now);
    ball.onImpact(Math.hypot(newVelX, newVelY) * 0.02);

    const speedPx = Math.hypot(newVelX, newVelY);
    AudioManager.getInstance().playCollision(speedPx * 0.05, speedPx > 220);
    HapticsManager.getInstance().lightImpact();
    this.screenShake.addTrauma(Math.min(0.45, speedPx * 0.003));
    this.particles.emitDirectionalSparks(newBx, newBy, normX, normY, ball.color, 10);
    this.shockwaves.spawn(newBx, newBy, ball.color, 26, 85);
  }

  /** Shortest signed angular distance from `from` to `to`, wrapped to [-PI, PI]. */
  private shortestAngleDiff(from: number, to: number): number {
    let diff = (to - from) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  private closestPointOnSegment(p: Vector2D, a: Vector2D, b: Vector2D): Vector2D {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lenSq = abx * abx + aby * aby;
    if (lenSq < 0.0001) return a;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq));
    return { x: a.x + abx * t, y: a.y + aby * t };
  }

  private renderNeedle(): void {
    const dirX = Math.cos(this.needleAngle);
    const dirY = Math.sin(this.needleAngle);
    const ax = dirX * this.needleInnerRadius;
    const ay = dirY * this.needleInnerRadius;
    const bx = dirX * this.needleOuterRadius;
    const by = dirY * this.needleOuterRadius;

    this.needleGraphics.clear();

    this.needleGraphics
      .moveTo(ax, ay)
      .lineTo(bx, by)
      .stroke({ width: this.needleThickness + 22, color: this.needleColor, alpha: 0.08, cap: 'round' });

    this.needleGraphics
      .moveTo(ax, ay)
      .lineTo(bx, by)
      .stroke({ width: this.needleThickness + 10, color: this.needleColor, alpha: 0.22, cap: 'round' });

    this.needleGraphics
      .moveTo(ax, ay)
      .lineTo(bx, by)
      .stroke({ width: this.needleThickness, color: this.needleColor, alpha: 0.95, cap: 'round' });

    // Center hub marking the needle's pivot (the "middle")
    this.needleGraphics.circle(0, 0, this.needleThickness * 0.9).fill({ color: this.needleColor, alpha: 0.16 });
    this.needleGraphics.circle(0, 0, this.needleThickness * 0.45).fill({ color: 0xffffff, alpha: 0.9 });
  }

  public override destroy(): void {
    super.destroy();
    if (this.needleGraphics) {
      if (this.needleGraphics.parent) this.needleGraphics.parent.removeChild(this.needleGraphics);
      this.needleGraphics.destroy();
    }
  }
}
