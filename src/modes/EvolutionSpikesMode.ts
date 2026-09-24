import * as planck from 'planck';
import { BaseMode } from './BaseMode';
import { Arena } from '@/entities/Arena';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';

const CONSTANT_BALL_SPEED = 18.0; // In physics units (~360px/s)

export class EvolutionSpikesMode extends BaseMode {
  private lastEvolutionTier = 0;
  private hasLaunched = false;
  private hasCelebratedVictory = false;

  public init(): void {
    const cx = 0;
    const cy = 0;
    this.hasLaunched = false;
    this.hasCelebratedVictory = false;
    this.lastEvolutionTier = 0;

    // 1. Build Arena
    this.arena = new Arena(this.physics, this.worldContainer, {
      shape: this.config.arenaShape,
      centerX: cx,
      centerY: cy,
      radius: this.config.arenaSize,
      color: this.config.arenaColor || 0x10b981,
      rotationSpeed: this.config.rotationSpeed || 0,
    });

    // 2. Build Obstacles & Spikes
    this.buildObstacles();

    // 3. Spawn Player Ball
    const spawnY = cy + Math.min(65, this.config.arenaSize * 0.45);
    const ball = this.createPlayerBall(cx, spawnY, 13);

    if (ball && ball.fixture) {
      ball.fixture.setRestitution(1.0);
      ball.fixture.setFriction(0.0);
    }
    if (ball && ball.body) {
      ball.body.setLinearDamping(0.0);
      ball.body.setLinearVelocity(planck.Vec2(0, 0));
    }

    // Aim launch listener
    this.aimSystem.onLaunch(() => {
      this.hasLaunched = true;
      this.objectiveSystem.registerShot();
    });
  }

  public override update(realDt: number) {
    const updateResult = super.update(realDt);

    if (this.isFinished || !this.playerBall || this.playerBall.isDestroyed) {
      return updateResult;
    }

    // 1. Maintain constant kinetic velocity (sans gravity) after launch
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
          planck.Vec2(0.85 * CONSTANT_BALL_SPEED, -0.52 * CONSTANT_BALL_SPEED)
        );
      }
    }

    // 2. Check for Evolution Tier Ascension milestones (Tier 1: 10, Tier 2: 20, Tier 3: 30)
    if (this.playerBall.evolutionTier > this.lastEvolutionTier) {
      this.lastEvolutionTier = this.playerBall.evolutionTier;
      const bPos = this.playerBall.view;

      const tierColors = [0x10b981, 0x00f0ff, 0xa855f7, 0xffe600];
      const tierColor = tierColors[this.lastEvolutionTier] || 0xffffff;

      this.playerBall.color = tierColor;
      this.playerBall.glowColor = tierColor;
      this.playerBall.redraw();

      // Tier Evolution Surge FX
      this.slowMo.triggerSlowMo(0.25, 0.45);
      AudioManager.getInstance().playBallSpawn();
      HapticsManager.getInstance().mediumImpact();

      this.shockwaves.spawn(bPos.x, bPos.y, tierColor, 120, 280);
      this.particles.emitBurst(bPos.x, bPos.y, tierColor, 32, 260, 0.6, 4.5);
      this.scoreSystem.addPoints(1000 * this.lastEvolutionTier);
    }

    // 3. Check for Target Goal Completion
    const targetCount = this.config.objective.targetCount || 15;
    if (this.playerBall.rebounds >= targetCount && !this.hasCelebratedVictory) {
      this.hasCelebratedVictory = true;
      const bPos = this.playerBall.view;

      this.slowMo.triggerSlowMo(0.18, 0.75);
      this.shockwaves.spawn(bPos.x, bPos.y, 0xffffff, 160, 360);
      this.shockwaves.spawn(this.arena.centerX, this.arena.centerY, 0x10b981, 140, 320);
      this.particles.emitBurst(bPos.x, bPos.y, 0xffffff, 40, 340, 0.8, 5.0);
      this.particles.emitBurst(this.arena.centerX, this.arena.centerY, 0x00f0ff, 35, 280, 0.7, 4.5);

      AudioManager.getInstance().playLevelComplete();
      HapticsManager.getInstance().heavyImpact();
    }

    return updateResult;
  }
}
