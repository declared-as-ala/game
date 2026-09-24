import * as planck from 'planck';
import { BaseMode } from './BaseMode';
import { Arena } from '@/entities/Arena';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';

const CONSTANT_BALL_SPEED = 18.0; // In physics units (~360px/s)

export class EscapeMode extends BaseMode {
  private initialTotalBoxes = 6;
  private hasLaunched = false;

  public init(): void {
    const cx = 0;
    const cy = 0;
    this.hasLaunched = false;

    // 1. Prepare default 6 Godot nested squares if not specified in config
    const nestedSquares = this.config.nestedSquares || [
      { shape: 'square', size: 50, color: 0xa96cff, speed: 0.24, gap: 0.08, openingWidth: 58 },
      { shape: 'square', size: 78, color: 0x49e5b4, speed: -0.20, gap: 0.25, openingWidth: 60 },
      { shape: 'square', size: 106, color: 0xa96cff, speed: 0.18, gap: 0.41, openingWidth: 62 },
      { shape: 'square', size: 134, color: 0xff4848, speed: -0.16, gap: 0.58, openingWidth: 64 },
      { shape: 'square', size: 162, color: 0xd7dce8, speed: 0.14, gap: 0.75, openingWidth: 66 },
      { shape: 'square', size: 190, color: 0xa96cff, speed: -0.12, gap: 0.92, openingWidth: 68 },
    ];

    this.initialTotalBoxes = nestedSquares.length;

    // 2. Build Nested Shapes Arena
    this.arena = new Arena(this.physics, this.worldContainer, {
      shape: 'nested-boxes',
      centerX: cx,
      centerY: cy,
      radius: nestedSquares[nestedSquares.length - 1].size,
      nestedSquares,
    });

    // 3. Build Obstacles if any
    this.buildObstacles();

    // 4. Spawn Player Ball at the center of the innermost shape
    const ball = this.createPlayerBall(cx, cy, 14);

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

    // 5. Initialize objective state
    this.objectiveSystem.onSquareEscaped(this.initialTotalBoxes, this.initialTotalBoxes);
  }

  public update(realDt: number) {
    const timeScale = this.slowMo.getTimeScale();
    const dt = realDt * timeScale;

    // 1. Arena moving perimeter gaps and cracking update
    if (this.arena) {
      const { completedBreaks } = this.arena.update(dt);
      for (const layer of completedBreaks) {
        this.handleLayerBroken(layer);
      }
    }

    const updateResult = super.update(realDt);

    if (this.isFinished || !this.playerBall || this.playerBall.isDestroyed) {
      return updateResult;
    }

    // 2. If ball has launched and is not currently being aimed, maintain constant speed (sans gravité)
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
          planck.Vec2(0.88 * CONSTANT_BALL_SPEED, -0.48 * CONSTANT_BALL_SPEED)
        );
      }
    }

    // 3. Check if ball escaped through any active uncracked layers (innermost to outermost)
    if (this.hasLaunched && this.arena) {
      const bPos = this.playerBall.view;
      const activeUncracked = this.arena.getActiveBoxLayers()
        .filter((b) => !b.cracking)
        .sort((a, b) => a.size - b.size);

      for (const layer of activeUncracked) {
        const isOutside = this.arena.isBallOutsideLayer(layer, bPos.x, bPos.y, this.playerBall.radius);

        if (isOutside) {
          this.arena.startCrack(layer.id, { x: bPos.x, y: bPos.y });

          // Add 100 points
          this.scoreSystem.addPoints(100);

          const remaining = this.arena.getRemainingUncrackedBoxesCount();
          const total = this.arena.getTotalBoxesCount();
          this.objectiveSystem.onSquareEscaped(remaining, total);

          this.shockwaves.spawn(bPos.x, bPos.y, layer.color, 80, 220);
          HapticsManager.getInstance().mediumImpact();
        } else {
          // If ball is inside this layer, it hasn't escaped any larger enclosing layers
          break;
        }
      }
    }

    return updateResult;
  }

  private handleLayerBroken(layer: any): void {
    // 1. Spawn shatter particles along perimeter
    const verts = layer.baseVertices || [];
    const n = verts.length;
    for (let i = 0; i < n; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % n];
      for (let k = 0; k < 4; k++) {
        const frac = k / 3.0;
        const px = this.arena.centerX + a.x + (b.x - a.x) * frac;
        const py = this.arena.centerY + a.y + (b.y - a.y) * frac;
        this.particles.emitBurst(px, py, layer.color, 6, 150, 0.45, 3.5);
      }
    }

    // 2. Play satisfying ascending crystal chime for box escape
    const remaining = this.arena.getRemainingUncrackedBoxesCount();
    const escapedIndex = Math.max(0, this.initialTotalBoxes - remaining - 1);
    AudioManager.getInstance().playBoxEscape(escapedIndex, this.initialTotalBoxes);
    HapticsManager.getInstance().mediumImpact();
    this.screenShake.addTrauma(0.18);

    // 3. Check for total completion
    if (remaining === 0) {
      this.slowMo.triggerSlowMo(0.15, 0.8);
      this.shockwaves.spawn(this.arena.centerX, this.arena.centerY, 0xffffff, 160, 360);
      this.particles.emitBurst(this.arena.centerX, this.arena.centerY, 0x00f0ff, 40, 300, 0.9, 5);
      AudioManager.getInstance().playLevelComplete();
    }
  }
}
