import { Graphics } from 'pixi.js';
import * as planck from 'planck';
import { BaseMode } from './BaseMode';
import { Arena } from '@/entities/Arena';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';
import type { Vector2D } from '@/data/types';

export interface ImpactLineSegment {
  anchor: Vector2D;
  color: number;
}

export interface MovingSpike {
  progress: number; // 0 to 1 along perimeter
  speed: number;
}

const BALL_START_RADIUS = 14;
const BALL_MAX_RADIUS = 38;
const CONSTANT_BALL_SPEED = 18.0; // In physics units (~360px/s)
const SPIKE_LENGTH = 32.0;
const SPIKE_BASE_HALF_WIDTH = 18.0;

export class NeonImpactMode extends BaseMode {
  private impactGraphics!: Graphics;
  private spikeGraphics!: Graphics;
  private impactLines: ImpactLineSegment[] = [];
  private perimeterSpikes: MovingSpike[] = [];
  private hasLaunched = false;
  private currentBallRadius = BALL_START_RADIUS;
  private wallHitCount = 0;
  private arenaVertices: Vector2D[] = [];
  private totalPerimeter = 0;

  public init(): void {
    const cx = 0;
    const cy = 0;
    this.hasLaunched = false;
    this.currentBallRadius = BALL_START_RADIUS;
    this.wallHitCount = 0;
    this.impactLines = [];

    // 1. Graphics for Impact Web & Spikes
    this.impactGraphics = new Graphics();
    this.spikeGraphics = new Graphics();
    this.worldContainer.addChildAt(this.impactGraphics, 0); // Behind arena
    this.worldContainer.addChild(this.spikeGraphics); // In front of arena

    // 2. Build Arena
    const arenaShape = this.config.arenaShape || 'square';
    const arenaSize = this.config.arenaSize || 180;
    const arenaColor = this.config.arenaColor || 0x34f5ff;

    this.arena = new Arena(this.physics, this.worldContainer, {
      shape: arenaShape,
      centerX: cx,
      centerY: cy,
      radius: arenaSize,
      color: arenaColor,
      rotationSpeed: this.config.rotationSpeed || 0,
    });

    // Compute arena vertices and perimeter for moving spikes
    this.computeArenaPerimeter(arenaShape, arenaSize);

    // 3. Setup Spikes configuration based on level
    const spikeCount = this.config.spikeCount !== undefined ? this.config.spikeCount : (this.config.levelNumber >= 5 ? 4 : this.config.levelNumber >= 3 ? 2 : 1);
    const spikeSpeed = this.config.spikeSpeed || 0.07;

    this.perimeterSpikes = [];
    for (let i = 0; i < spikeCount; i++) {
      this.perimeterSpikes.push({
        progress: (i / spikeCount + 0.16) % 1.0,
        speed: (i % 2 === 0 ? 1 : -1) * spikeSpeed,
      });
    }

    // 4. Build Obstacles
    this.buildObstacles();

    // 5. Spawn Player Ball
    const ball = this.createPlayerBall(cx, cy, BALL_START_RADIUS);

    if (ball && ball.fixture) {
      ball.fixture.setRestitution(1.0);
      ball.fixture.setFriction(0.0);
    }
    if (ball && ball.body) {
      ball.body.setLinearDamping(0.0);
      ball.body.setLinearVelocity(planck.Vec2(0, 0));
    }

    // When the player drags and launches
    this.aimSystem.onLaunch(() => {
      this.hasLaunched = true;
      this.objectiveSystem.registerShot();
    });
  }

  private computeArenaPerimeter(shape: any, size: number): void {
    this.arenaVertices = this.arena.getVerticesForShape(shape, size);
    this.totalPerimeter = 0;
    const n = this.arenaVertices.length;
    for (let i = 0; i < n; i++) {
      const a = this.arenaVertices[i];
      const b = this.arenaVertices[(i + 1) % n];
      this.totalPerimeter += Math.hypot(b.x - a.x, b.y - a.y);
    }
  }

  public override update(realDt: number) {
    // 1. Update Spikes Position & Animation
    for (const spike of this.perimeterSpikes) {
      spike.progress = (spike.progress + spike.speed * realDt + 1.0) % 1.0;
    }

    // 2. Draw Moving Spikes
    this.drawSpikes();

    // 3. Draw Impact Web Lines
    this.drawImpactWeb();

    const updateResult = super.update(realDt);

    if (this.isFinished || !this.playerBall || this.playerBall.isDestroyed) {
      return updateResult;
    }

    // 4. Maintain constant velocity (sans gravité)
    if (this.hasLaunched && !this.aimSystem.isCurrentlyAiming()) {
      const vel = this.playerBall.getVelocity();
      const currentLen = Math.hypot(vel.x, vel.y);

      if (currentLen > 0.001) {
        const normRatio = CONSTANT_BALL_SPEED / currentLen;
        this.playerBall.body.setLinearVelocity(
          planck.Vec2(vel.x * normRatio, vel.y * normRatio)
        );
      } else {
        this.playerBall.body.setLinearVelocity(
          planck.Vec2(0.83 * CONSTANT_BALL_SPEED, -0.56 * CONSTANT_BALL_SPEED)
        );
      }
    }

    // 5. Check Collision with Moving Spike Triangles
    if (this.hasLaunched && this.playerBall && !this.playerBall.isDestroyed) {
      const bPos = this.playerBall.view;
      const bRad = this.currentBallRadius;

      const spikeTriangles = this.getSpikeTriangles();
      for (const tri of spikeTriangles) {
        if (this.circleIntersectsTriangle(bPos.x, bPos.y, bRad, tri)) {
          this.handleSpikeCollision(bPos.x, bPos.y);
          break;
        }
      }
    }

    return updateResult;
  }

  protected override handleWallImpact(x: number, y: number, nx: number, ny: number): void {
    super.handleWallImpact(x, y, nx, ny);

    this.wallHitCount++;
    this.scoreSystem.addPoints(10);

    const targetCount = this.config.objective.targetCount || 20;
    const isEndless = this.config.id.startsWith('endless') || targetCount >= 9999;

    // 1. Cycle arena neon color after each impact
    const IMPACT_NEON_COLORS = [
      0x00f0ff, // Electric Cyan
      0x00ff88, // Neon Mint / Lime
      0xa855f7, // Neon Purple
      0xff007f, // Hot Magenta
      0xff7700, // Vibrant Orange
      0xfacc15, // Electric Gold
      0x38bdf8, // Sky Blue
      0xff2255, // Radical Crimson
      0xd946ef, // Fuchsia
      0x10b981, // Emerald Green
    ];

    const nextArenaColor = IMPACT_NEON_COLORS[this.wallHitCount % IMPACT_NEON_COLORS.length];
    if (this.arena) {
      this.arena.color = nextArenaColor;
      this.arena.render();
    }

    // 2. Smooth Ball Growth toward max radius
    const progress = isEndless
      ? Math.min(1.0, (this.wallHitCount % 50) / 50)
      : Math.min(1.0, this.wallHitCount / targetCount);
    this.currentBallRadius = BALL_START_RADIUS + progress * (BALL_MAX_RADIUS - BALL_START_RADIUS);

    // 3. Evolving dynamic HSV color gradient
    const hue = isEndless
      ? (0.50 + (this.wallHitCount * 0.08)) % 1.0
      : (0.50 + progress * 0.70) % 1.0;
    const color = this.hslToHex(hue, 0.90, 0.55);

    if (this.playerBall) {
      this.playerBall.radius = this.currentBallRadius;
      this.playerBall.color = color;
      this.playerBall.glowColor = color;
      this.playerBall.redraw();
    }

    // 4. Record impact line anchor for kaleidoscopic neon web
    this.impactLines.push({
      anchor: { x, y },
      color: nextArenaColor,
    });
    if (this.impactLines.length > 28) {
      this.impactLines.shift();
    }

    // 4. Play harmonic neon chime tone
    AudioManager.getInstance().playNeonChime(this.wallHitCount);

    // 5. Flash ring & particle burst
    this.arena.addFlash(x, y, color);
    this.particles.emitBurst(x, y, color, 16, 200, 0.5, 3.8);
    this.shockwaves.spawn(x, y, color, 70, 180);
    HapticsManager.getInstance().lightImpact();

    // 6. Star milestone celebrations for Endless Impact (5, 20, 50)
    if (isEndless && (this.wallHitCount === 5 || this.wallHitCount === 20 || this.wallHitCount === 50)) {
      this.shockwaves.spawn(this.arena.centerX, this.arena.centerY, 0xffd700, 140, 320);
      this.particles.emitBurst(x, y, 0xffd700, 32, 280, 0.8, 4.5);
      AudioManager.getInstance().playGoal();
      HapticsManager.getInstance().heavyImpact();
    }

    // 7. Check if target goal is achieved (standard levels)
    if (!isEndless && this.wallHitCount === targetCount) {
      this.slowMo.triggerSlowMo(0.18, 0.7);
      this.shockwaves.spawn(x, y, 0xffffff, 160, 360);
      this.shockwaves.spawn(this.arena.centerX, this.arena.centerY, color, 140, 320);
      this.particles.emitBurst(x, y, 0xffffff, 36, 320, 0.8, 5.0);
      this.particles.emitBurst(this.arena.centerX, this.arena.centerY, color, 30, 260, 0.7, 4.5);
      AudioManager.getInstance().playGoal();
      HapticsManager.getInstance().heavyImpact();
    }
  }

  private handleSpikeCollision(x: number, y: number): void {
    // 1. Explosive visual FX (dual shockwave rings + particles)
    this.shockwaves.spawn(x, y, 0xff8a00, 120, 280);
    this.shockwaves.spawn(x, y, 0xffffff, 80, 200);
    this.particles.emitBurst(x, y, 0xff8a00, 48, 380, 0.8, 5.0);
    this.particles.emitBurst(x, y, 0xffffff, 24, 280, 0.6, 3.5);

    this.screenShake.addTrauma(0.6);
    AudioManager.getInstance().playSpikeHit();
    HapticsManager.getInstance().heavyImpact();

    // 2. Clear impact lines
    this.impactLines = [];

    // 3. Mark defeat or register ball destruction
    if (this.playerBall) {
      this.playerBall.destroy(this.physics);
      this.playerBall = null;
    }
    this.objectiveSystem.setPlayerDead();
  }

  private getSpikeTriangles(): [Vector2D, Vector2D, Vector2D][] {
    const triangles: [Vector2D, Vector2D, Vector2D][] = [];
    const verts = this.arenaVertices;
    const n = verts.length;
    if (n < 3 || this.totalPerimeter <= 0) return triangles;

    for (const spike of this.perimeterSpikes) {
      let targetDist = (spike.progress % 1.0) * this.totalPerimeter;
      if (targetDist < 0) targetDist += this.totalPerimeter;

      let pos: Vector2D = verts[0];
      let tangent: Vector2D = { x: 1, y: 0 };
      let inwardNormal: Vector2D = { x: 0, y: 1 };

      for (let i = 0; i < n; i++) {
        const a = verts[i];
        const b = verts[(i + 1) % n];
        const edgeX = b.x - a.x;
        const edgeY = b.y - a.y;
        const edgeLen = Math.hypot(edgeX, edgeY) || 1.0;

        if (targetDist <= edgeLen || i === n - 1) {
          const t = Math.max(0, Math.min(1, targetDist / edgeLen));
          pos = {
            x: this.arena.centerX + a.x + edgeX * t,
            y: this.arena.centerY + a.y + edgeY * t,
          };
          tangent = { x: edgeX / edgeLen, y: edgeY / edgeLen };

          let inX = -tangent.y;
          let inY = tangent.x;
          // Ensure inward toward (0,0)
          if (-a.x * inX + -a.y * inY < 0) {
            inX = -inX;
            inY = -inY;
          }
          inwardNormal = { x: inX, y: inY };
          break;
        }
        targetDist -= edgeLen;
      }

      const baseA: Vector2D = {
        x: pos.x - tangent.x * SPIKE_BASE_HALF_WIDTH,
        y: pos.y - tangent.y * SPIKE_BASE_HALF_WIDTH,
      };
      const baseB: Vector2D = {
        x: pos.x + tangent.x * SPIKE_BASE_HALF_WIDTH,
        y: pos.y + tangent.y * SPIKE_BASE_HALF_WIDTH,
      };
      const tip: Vector2D = {
        x: pos.x + inwardNormal.x * SPIKE_LENGTH,
        y: pos.y + inwardNormal.y * SPIKE_LENGTH,
      };

      triangles.push([baseA, baseB, tip]);
    }

    return triangles;
  }

  private drawSpikes(): void {
    this.spikeGraphics.clear();
    const triangles = this.getSpikeTriangles();

    for (const [a, b, tip] of triangles) {
      // Glow halo
      const centroidX = (a.x + b.x + tip.x) / 3;
      const centroidY = (a.y + b.y + tip.y) / 3;

      const ga = { x: centroidX + (a.x - centroidX) * 1.25, y: centroidY + (a.y - centroidY) * 1.25 };
      const gb = { x: centroidX + (b.x - centroidX) * 1.25, y: centroidY + (b.y - centroidY) * 1.25 };
      const gtip = { x: centroidX + (tip.x - centroidX) * 1.25, y: centroidY + (tip.y - centroidY) * 1.25 };

      this.spikeGraphics
        .poly([ga.x, ga.y, gb.x, gb.y, gtip.x, gtip.y])
        .fill({ color: 0xff8a00, alpha: 0.18 });

      // Solid spike body
      this.spikeGraphics
        .poly([a.x, a.y, b.x, b.y, tip.x, tip.y])
        .fill({ color: 0xff8a00, alpha: 0.95 });

      // Crisp neon outline
      this.spikeGraphics
        .poly([a.x, a.y, b.x, b.y, tip.x, tip.y, a.x, a.y])
        .stroke({ width: 2.2, color: 0xffffff, alpha: 0.95 });
    }
  }

  private drawImpactWeb(): void {
    this.impactGraphics.clear();
    if (!this.playerBall || this.impactLines.length === 0) return;

    const bPos = this.playerBall.view;

    for (let i = 0; i < this.impactLines.length; i++) {
      const line = this.impactLines[i];
      const ratio = (i + 1) / this.impactLines.length;
      const color = line.color;

      // Glow halo line
      this.impactGraphics
        .moveTo(line.anchor.x, line.anchor.y)
        .lineTo(bPos.x, bPos.y)
        .stroke({ width: 10, color, alpha: ratio * 0.12, cap: 'round' });

      // Crisp center beam
      this.impactGraphics
        .moveTo(line.anchor.x, line.anchor.y)
        .lineTo(bPos.x, bPos.y)
        .stroke({ width: 2.4, color, alpha: ratio * 0.75, cap: 'round' });
    }
  }

  private circleIntersectsTriangle(
    cx: number,
    cy: number,
    r: number,
    triangle: [Vector2D, Vector2D, Vector2D]
  ): boolean {
    const [a, b, c] = triangle;

    // Point in triangle check
    if (this.pointInTriangle(cx, cy, a, b, c)) return true;

    const r2 = r * r;
    return (
      this.distSqToSegment(cx, cy, a, b) <= r2 ||
      this.distSqToSegment(cx, cy, b, c) <= r2 ||
      this.distSqToSegment(cx, cy, c, a) <= r2
    );
  }

  private pointInTriangle(px: number, py: number, a: Vector2D, b: Vector2D, c: Vector2D): boolean {
    const d1 = (px - c.x) * (a.y - c.y) - (a.x - c.x) * (py - c.y);
    const d2 = (px - a.x) * (b.y - a.y) - (b.x - a.x) * (py - a.y);
    const d3 = (px - b.x) * (c.y - b.y) - (c.x - b.x) * (py - b.y);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  }

  private distSqToSegment(px: number, py: number, a: Vector2D, b: Vector2D): number {
    const segX = b.x - a.x;
    const segY = b.y - a.y;
    const lenSq = segX * segX + segY * segY;
    if (lenSq <= 0.0001) return (px - a.x) * (px - a.x) + (py - a.y) * (py - a.y);

    const t = Math.max(0, Math.min(1, ((px - a.x) * segX + (py - a.y) * segY) / lenSq));
    const projX = a.x + segX * t;
    const projY = a.y + segY * t;
    return (px - projX) * (px - projX) + (py - projY) * (py - projY);
  }

  private hslToHex(h: number, s: number, l: number): number {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return ((Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255));
  }

  public override destroy(): void {
    if (this.impactGraphics && this.impactGraphics.parent) {
      this.impactGraphics.parent.removeChild(this.impactGraphics);
      this.impactGraphics.destroy();
    }
    if (this.spikeGraphics && this.spikeGraphics.parent) {
      this.spikeGraphics.parent.removeChild(this.spikeGraphics);
      this.spikeGraphics.destroy();
    }
    super.destroy();
  }
}
