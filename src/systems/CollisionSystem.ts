import type { CollisionEvent, PhysicsWorld } from '@/core/PhysicsWorld';
import type { Ball } from '@/entities/Ball';
import type { ParticleSystem } from './ParticleSystem';
import type { ShockwaveSystem } from '@/effects/Shockwave';
import type { ScreenShake } from '@/effects/ScreenShake';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';
import { SaveManager } from '@/core/SaveManager';
import { APP_CONFIG } from '@/app/config';
import { COSMETICS_DATA } from '@/data/cosmeticsData';

export interface CollisionHandlerContext {
  onBallEscaped?: (ball: Ball) => void;
  onBallSpikeHit?: (ball: Ball) => void;
  onBallSpawnRequested?: (x: number, y: number, vx: number, vy: number) => void;
  onWallImpact?: (x: number, y: number, normalX: number, normalY: number) => void;
  onBallDestroyedInBattle?: (victim: Ball, attacker?: Ball) => void;
  onBrickCollision?: (brick: any, hitX: number, hitY: number) => void;
}

export class CollisionSystem {
  private physics: PhysicsWorld;
  private particles: ParticleSystem;
  private shockwaves: ShockwaveSystem;
  private screenShake: ScreenShake;
  private context: CollisionHandlerContext = {};

  // Track collision pairs cooldown to prevent runaway spawning
  private pairCooldowns: Map<string, number> = new Map();

  constructor(
    physics: PhysicsWorld,
    particles: ParticleSystem,
    shockwaves: ShockwaveSystem,
    screenShake: ScreenShake
  ) {
    this.physics = physics;
    this.particles = particles;
    this.shockwaves = shockwaves;
    this.screenShake = screenShake;

    this.physics.onContact((e) => this.handleContact(e));
  }

  public setContext(context: CollisionHandlerContext): void {
    this.context = context;
  }

  public update(): void {
    const now = performance.now();
    for (const [key, timestamp] of this.pairCooldowns.entries()) {
      if (now - timestamp > APP_CONFIG.LIMITS.COLLISION_PAIR_COOLDOWN_MS) {
        this.pairCooldowns.delete(key);
      }
    }
  }

  private handleContact(event: CollisionEvent): void {
    const userA = event.fixtureA.getUserData() as { type: string; [key: string]: unknown } | null;
    const userB = event.fixtureB.getUserData() as { type: string; [key: string]: unknown } | null;

    if (!userA || !userB) return;

    // 1. Ball vs Wall / Obstacle
    if ((userA.type === 'ball' && (userB.type === 'wall' || userB.type === 'obstacle')) ||
        (userB.type === 'ball' && (userA.type === 'wall' || userA.type === 'obstacle'))) {
      const ball = (userA.type === 'ball' ? userA.ball : userB.ball) as Ball;
      this.handleBallWallCollision(ball, event);
      return;
    }

    // 2. Ball vs Spike
    if ((userA.type === 'ball' && userB.type === 'spike') ||
        (userB.type === 'ball' && userA.type === 'spike')) {
      const ball = (userA.type === 'ball' ? userA.ball : userB.ball) as Ball;
      this.handleBallSpikeCollision(ball);
      return;
    }

    // 3. Ball vs Exit Portal
    if ((userA.type === 'ball' && userB.type === 'exit') ||
        (userB.type === 'ball' && userA.type === 'exit')) {
      const ball = (userA.type === 'ball' ? userA.ball : userB.ball) as Ball;
      this.handleBallExitCollision(ball);
      return;
    }

    // 4. Ball vs Ball
    if (userA.type === 'ball' && userB.type === 'ball') {
      const ballA = userA.ball as Ball;
      const ballB = userB.ball as Ball;
      this.handleBallBallCollision(ballA, ballB, event);
      return;
    }

    // 5. Ball vs Brick
    if ((userA.type === 'ball' && userB.type === 'brick') ||
        (userB.type === 'ball' && userA.type === 'brick')) {
      const ball = (userA.type === 'ball' ? userA.ball : userB.ball) as Ball;
      const brick = userA.type === 'brick' ? userA.brick : userB.brick;
      if (this.context.onBrickCollision) {
        this.context.onBrickCollision(brick, ball.view.x, ball.view.y);
      }
      return;
    }
  }

  private handleBallWallCollision(ball: Ball, event: CollisionEvent): void {
    const vel = ball.getSpeed();
    const isStrong = vel > 12;

    ball.onImpact(vel);
    AudioManager.getInstance().playCollision(vel, isStrong);

    if (isStrong) {
      HapticsManager.getInstance().lightImpact();
    }

    const pos = ball.view;
    const normX = event.normal ? event.normal.x : 0;
    const normY = event.normal ? event.normal.y : -1;

    // Apply equipped cosmetic impact effect
    const effectId = SaveManager.getInstance().getData().cosmetics?.selectedImpactEffect || 'impact_ring';
    const effectDef = COSMETICS_DATA.impacts.find((i) => i.id === effectId);
    const effectType = effectDef?.type || 'ring';

    if (effectType === 'ring') {
      const radius = isStrong ? 55 : 35;
      this.shockwaves.spawn(pos.x, pos.y, ball.color, radius, radius * 3.2);
      this.particles.emitDirectionalSparks(pos.x, pos.y, normX, normY, ball.color, isStrong ? 12 : 6);
    } else if (effectType === 'shockwave') {
      const radius = isStrong ? 80 : 48;
      this.shockwaves.spawn(pos.x, pos.y, ball.color, radius, radius * 3.6);
      this.shockwaves.spawn(pos.x, pos.y, 0xffffff, radius * 0.45, radius * 2.0);
      this.particles.emitDirectionalSparks(pos.x, pos.y, normX, normY, ball.color, isStrong ? 18 : 9);
    } else if (effectType === 'burst') {
      this.particles.emitBurst(pos.x, pos.y, ball.color, isStrong ? 28 : 16, 220, 0.45, 4.0);
      this.particles.emitBurst(pos.x, pos.y, 0xffffff, isStrong ? 10 : 5, 150, 0.35, 2.5);
    } else {
      // sparks
      this.particles.emitDirectionalSparks(pos.x, pos.y, normX, normY, ball.color, isStrong ? 30 : 16);
      this.particles.emitDirectionalSparks(pos.x, pos.y, normX, normY, 0xffffff, isStrong ? 12 : 6);
    }

    if (this.context.onWallImpact) {
      this.context.onWallImpact(pos.x, pos.y, normX, normY);
    }
  }

  private handleBallSpikeCollision(ball: Ball): void {
    if (ball.isDestroyed) return;

    const pos = ball.view;
    AudioManager.getInstance().playSpikeHit();
    HapticsManager.getInstance().heavyImpact();
    this.screenShake.addTrauma(0.5);
    this.shockwaves.spawn(pos.x, pos.y, 0xff2244, 120, 320);
    this.particles.emitBurst(pos.x, pos.y, 0xff2244, 30, 260, 0.7, 5);

    ball.isDestroyed = true;
    if (this.context.onBallSpikeHit) {
      this.context.onBallSpikeHit(ball);
    }
  }

  private handleBallExitCollision(ball: Ball): void {
    if (ball.isEscaped || ball.isDestroyed) return;

    ball.isEscaped = true;
    const pos = ball.view;

    AudioManager.getInstance().playGoal();
    HapticsManager.getInstance().mediumImpact();
    this.shockwaves.spawn(pos.x, pos.y, 0x00ff88, 80, 220);
    this.particles.emitBurst(pos.x, pos.y, 0x00ff88, 20, 180, 0.5, 4);

    if (this.context.onBallEscaped) {
      this.context.onBallEscaped(ball);
    }
  }

  private handleBallBallCollision(ballA: Ball, ballB: Ball, _event: CollisionEvent): void {
    if (ballA.isDestroyed || ballB.isDestroyed) return;

    const relSpeed = Math.hypot(
      ballA.getVelocity().x - ballB.getVelocity().x,
      ballA.getVelocity().y - ballB.getVelocity().y
    );

    AudioManager.getInstance().playCollision(relSpeed * 3, relSpeed > 10);

    const posA = ballA.view;
    const posB = ballB.view;
    const midX = (posA.x + posB.x) / 2;
    const midY = (posA.y + posB.y) / 2;

    this.particles.emitBurst(midX, midY, ballA.color, 8, 140, 0.35, 3);

    // Battle Mode: Health damage
    if (ballA.maxLives > 1 || ballB.maxLives > 1) {
      if (relSpeed > 4.5) {
        // Fast ball damages slower ball
        const aSpeed = ballA.getSpeed();
        const bSpeed = ballB.getSpeed();
        const victim = aSpeed < bSpeed ? ballA : ballB;
        const attacker = aSpeed < bSpeed ? ballB : ballA;

        const isDead = victim.takeDamage(1);
        this.particles.emitBurst(victim.view.x, victim.view.y, 0xff007f, 16, 200);

        if (isDead) {
          victim.isDestroyed = true;
          AudioManager.getInstance().playSpikeHit();
          this.shockwaves.spawn(victim.view.x, victim.view.y, victim.color, 100);
          if (this.context.onBallDestroyedInBattle) {
            this.context.onBallDestroyedInBattle(victim, attacker);
          }
        }
      }
      return;
    }

    // Every Contact = New Ball Mode
    if (this.context.onBallSpawnRequested) {
      const pairKey = ballA.id < ballB.id ? `${ballA.id}_${ballB.id}` : `${ballB.id}_${ballA.id}`;
      const now = performance.now();
      const lastSpawn = this.pairCooldowns.get(pairKey) || 0;

      if (now - lastSpawn > APP_CONFIG.LIMITS.COLLISION_PAIR_COOLDOWN_MS) {
        this.pairCooldowns.set(pairKey, now);

        // Spawn offspring
        const normVx = (ballA.getVelocity().x + ballB.getVelocity().x) / 2;
        const normVy = (ballA.getVelocity().y + ballB.getVelocity().y) / 2;
        this.context.onBallSpawnRequested(midX, midY, normVx, normVy);
      }
    }
  }

  public clear(): void {
    this.pairCooldowns.clear();
  }
}
