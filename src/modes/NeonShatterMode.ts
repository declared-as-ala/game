import * as planck from 'planck';
import { BaseMode } from './BaseMode';
import { Arena } from '@/entities/Arena';
import { NeonBrick } from '@/entities/NeonBrick';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';

const CONSTANT_BALL_SPEED = 18.5; // in physics meters/s (~370px/s)

export class NeonShatterMode extends BaseMode {
  public bricks: NeonBrick[] = [];
  public totalBricksCount = 0;
  public shatteredBricksCount = 0;
  private hasLaunched = false;
  private hasCelebratedVictory = false;

  public init(): void {
    const cx = 0;
    const cy = 0;
    this.hasLaunched = false;
    this.hasCelebratedVictory = false;
    this.bricks = [];
    this.shatteredBricksCount = 0;

    // 1. Build Arena
    this.arena = new Arena(this.physics, this.worldContainer, {
      shape: this.config.arenaShape || 'square',
      centerX: cx,
      centerY: cy,
      radius: this.config.arenaSize || 180,
      color: this.config.arenaColor || 0x00f0ff,
      rotationSpeed: this.config.rotationSpeed || 0,
    });

    // 2. Build Bricks Grid/Formation
    if (this.config.bricks && this.config.bricks.length > 0) {
      for (const bConfig of this.config.bricks) {
        const brick = new NeonBrick(this.physics, this.worldContainer, bConfig);
        this.bricks.push(brick);
      }
    } else {
      // Default generated grid if not explicitly provided
      this.generateDefaultBrickGrid(cx, cy);
    }

    this.totalBricksCount = this.bricks.length;

    // 3. Build Obstacles
    this.buildObstacles();

    // 4. Spawn Player Ball
    const spawnY = cy + Math.min(70, this.config.arenaSize * 0.48);
    const ball = this.createPlayerBall(cx, spawnY, 13);

    if (ball.fixture) {
      ball.fixture.setRestitution(1.0);
      ball.fixture.setFriction(0.0);
    }
    if (ball.body) {
      ball.body.setLinearDamping(0.0);
      ball.body.setLinearVelocity(planck.Vec2(0, 0));
    }

    // Aim launch listener
    this.aimSystem.onLaunch(() => {
      this.hasLaunched = true;
      this.objectiveSystem.registerShot();
    });
  }

  private generateDefaultBrickGrid(cx: number, cy: number): void {
    const lvl = this.config.levelNumber || 1;
    const colors = [0x00f0ff, 0xff007f, 0xffe000, 0xa855f7, 0x35ff38, 0xff3366];
    const col = colors[(lvl - 1) % colors.length];

    if (lvl === 1) {
      // 4x4 Grid = 16 Bricks
      const rows = 4;
      const cols = 4;
      const bw = 34;
      const bh = 14;
      const gap = 8;
      const startX = cx - ((cols - 1) * (bw + gap)) / 2;
      const startY = cy - 55;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bx = startX + c * (bw + gap);
          const by = startY + r * (bh + gap);
          this.bricks.push(
            new NeonBrick(this.physics, this.worldContainer, {
              id: `brick_${r}_${c}`,
              x: bx,
              y: by,
              width: bw,
              height: bh,
              hp: 1,
              color: col,
              isArmored: false,
            })
          );
        }
      }
    } else {
      // 20 Bricks Formation
      const rows = 4;
      const cols = 5;
      const bw = 30;
      const bh = 13;
      const gap = 7;
      const startX = cx - ((cols - 1) * (bw + gap)) / 2;
      const startY = cy - 55;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bx = startX + c * (bw + gap);
          const by = startY + r * (bh + gap);
          this.bricks.push(
            new NeonBrick(this.physics, this.worldContainer, {
              id: `brick_${r}_${c}`,
              x: bx,
              y: by,
              width: bw,
              height: bh,
              hp: 1,
              color: col,
              isArmored: false,
            })
          );
        }
      }
    }
  }

  public override update(realDt: number) {
    const updateResult = super.update(realDt);

    if (this.isFinished) {
      return updateResult;
    }

    // 1. Maintain constant speed for active balls
    for (const ball of this.balls) {
      if (ball.isDestroyed || ball.isEscaped) continue;

      if (ball.type === 'player' && (!this.hasLaunched || this.aimSystem.isCurrentlyAiming())) {
        continue;
      }

      if (!ball.body.isAwake()) {
        ball.body.setAwake(true);
      }

      const vel = ball.getVelocity();
      const currentLen = Math.hypot(vel.x, vel.y);

      if (!isNaN(currentLen) && currentLen > 0.001) {
        const normRatio = CONSTANT_BALL_SPEED / currentLen;
        ball.body.setLinearVelocity(planck.Vec2(vel.x * normRatio, vel.y * normRatio));
      } else {
        const randAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        ball.body.setLinearVelocity(
          planck.Vec2(Math.cos(randAngle) * CONSTANT_BALL_SPEED, Math.sin(randAngle) * CONSTANT_BALL_SPEED)
        );
      }

      // Guard against corrupted physics positions
      const pos = ball.body.getPosition();
      if (isNaN(pos.x) || isNaN(pos.y)) {
        ball.body.setPosition(planck.Vec2(0, 0));
        ball.body.setLinearVelocity(planck.Vec2(0, -CONSTANT_BALL_SPEED));
      }
    }

    // 2. Clean up destroyed bricks and update active ones
    this.bricks = this.bricks.filter((b) => !b.isDestroyed);
    for (const brick of this.bricks) {
      brick.update(realDt);
    }

    this.objectiveSystem.setShatteredBricks(this.shatteredBricksCount);

    // 3. Check for Victory Condition (All bricks cleared or target shattered)
    const targetCount = this.config.objective.targetCount || this.totalBricksCount;
    if (this.shatteredBricksCount >= targetCount && !this.hasCelebratedVictory) {
      this.hasCelebratedVictory = true;
      this.slowMo.triggerSlowMo(0.18, 0.85);

      const bPos = this.playerBall ? this.playerBall.view : { x: 0, y: 0 };
      this.shockwaves.spawn(bPos.x, bPos.y, 0xffe000, 160, 360);
      this.shockwaves.spawn(this.arena.centerX, this.arena.centerY, 0x00f0ff, 140, 320);
      this.particles.emitBurst(bPos.x, bPos.y, 0xffe000, 48, 340, 0.8, 5.0);
      this.particles.emitBurst(this.arena.centerX, this.arena.centerY, 0xff007f, 36, 280, 0.7, 4.5);

      AudioManager.getInstance().playLevelComplete();
      HapticsManager.getInstance().heavyImpact();
    }

    return updateResult;
  }

  public handleBrickCollision(brick: NeonBrick, hitX: number, hitY: number): void {
    if (brick.isDestroyed) return;

    const isShattered = brick.onHit(1);

    if (isShattered) {
      this.shatteredBricksCount++;
      brick.destroy(this.physics);

      // ASMR Glass Shatter FX
      AudioManager.getInstance().playNeonChime(this.shatteredBricksCount % 8);
      HapticsManager.getInstance().mediumImpact();
      this.screenShake.addTrauma(0.25);

      this.shockwaves.spawn(hitX, hitY, brick.color, 80, 180);
      this.particles.emitBurst(hitX, hitY, brick.color, 16, 220, 0.5, 4.0);
      this.particles.emitBurst(hitX, hitY, 0xffffff, 8, 160, 0.4, 3.0);

      this.scoreSystem.addPoints(250 * (brick.isArmored ? 2 : 1));
    } else {
      // Armor hit
      AudioManager.getInstance().playCollision(15, true);
      HapticsManager.getInstance().lightImpact();
      this.particles.emitBurst(hitX, hitY, 0xffffff, 6, 120, 0.3, 2.5);
      this.scoreSystem.addPoints(100);
    }
  }

  public override destroy(): void {
    for (const brick of this.bricks) {
      brick.destroy(this.physics);
    }
    this.bricks = [];
    super.destroy();
  }
}

