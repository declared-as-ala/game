import { Container } from 'pixi.js';
import type { PhysicsWorld } from '@/core/PhysicsWorld';
import type { LevelConfig, LevelResult } from '@/data/types';
import { Arena } from '@/entities/Arena';
import { Ball } from '@/entities/Ball';
import { Spike } from '@/entities/Spike';
import { ExitPortal } from '@/entities/ExitPortal';
import { Obstacle } from '@/entities/Obstacle';
import { ParticleSystem } from '@/systems/ParticleSystem';
import { TrailSystem } from '@/systems/TrailSystem';
import { ScoreSystem } from '@/systems/ScoreSystem';
import { ObjectiveSystem, type ObjectiveProgress } from '@/systems/ObjectiveSystem';
import { AimSystem } from '@/systems/AimSystem';
import { TrajectorySystem } from '@/systems/TrajectorySystem';
import { CollisionSystem } from '@/systems/CollisionSystem';
import { ShockwaveSystem } from '@/effects/Shockwave';
import { ScreenShake } from '@/effects/ScreenShake';
import { SlowMotionSystem } from '@/systems/SlowMotionSystem';
import { SaveManager } from '@/core/SaveManager';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';
import { COSMETICS_DATA } from '@/data/cosmeticsData';

export abstract class BaseMode {
  protected physics: PhysicsWorld;
  protected worldContainer: Container;
  protected config: LevelConfig;

  // Entities
  public arena!: Arena;
  public balls: Ball[] = [];
  public playerBall: Ball | null = null;
  public spikes: Spike[] = [];
  public obstacles: Obstacle[] = [];
  public exitPortal: ExitPortal | null = null;

  // Systems
  public particles: ParticleSystem;
  public trails: TrailSystem;
  public scoreSystem: ScoreSystem;
  public objectiveSystem: ObjectiveSystem;
  public aimSystem: AimSystem;
  public trajectorySystem: TrajectorySystem;
  public collisionSystem: CollisionSystem;
  public shockwaves: ShockwaveSystem;
  public screenShake: ScreenShake;
  public slowMo: SlowMotionSystem;

  public isFinished = false;
  protected nextBallId = 1;

  constructor(
    physics: PhysicsWorld,
    worldContainer: Container,
    config: LevelConfig,
    screenShake: ScreenShake
  ) {
    this.physics = physics;
    this.worldContainer = worldContainer;
    this.config = config;
    this.screenShake = screenShake;

    this.shockwaves = new ShockwaveSystem(this.worldContainer);
    this.particles = new ParticleSystem(this.worldContainer);
    this.trails = new TrailSystem(this.worldContainer);

    this.scoreSystem = new ScoreSystem(this.config);
    this.objectiveSystem = new ObjectiveSystem(this.config);
    this.aimSystem = new AimSystem(this.physics, this.worldContainer);
    this.trajectorySystem = new TrajectorySystem(this.physics, this.worldContainer);
    this.slowMo = new SlowMotionSystem();

    this.collisionSystem = new CollisionSystem(
      this.physics,
      this.particles,
      this.shockwaves,
      this.screenShake
    );

    this.setupCollisionHandlers();
    this.setupAimLaunch();
  }

  public abstract init(): void;

  protected setupCollisionHandlers(): void {
    this.collisionSystem.setContext({
      onBallEscaped: (ball) => this.handleBallEscaped(ball),
      onBallSpikeHit: (ball) => this.handleBallSpikeHit(ball),
      onWallImpact: (x, y, nx, ny) => this.handleWallImpact(x, y, nx, ny),
      onBallSpawnRequested: (x, y, vx, vy) => this.handleBallSpawnRequested(x, y, vx, vy),
      onBallDestroyedInBattle: (victim, attacker) => this.handleBallDestroyedInBattle(victim, attacker),
      onBrickCollision: (brick, hitX, hitY) => {
        if ('handleBrickCollision' in this) {
          (this as any).handleBrickCollision(brick, hitX, hitY);
        }
      },
    });
  }

  protected setupAimLaunch(): void {
    this.aimSystem.onLaunch(() => {
      this.objectiveSystem.registerShot();
    });
  }

  protected createPlayerBall(x: number, y: number, radius = 14): Ball {
    const cosData = SaveManager.getInstance().getData().cosmetics;
    const selectedSkin = COSMETICS_DATA.skins.find((s) => s.id === cosData.selectedBallSkin) || COSMETICS_DATA.skins[0];
    const selectedTrail = COSMETICS_DATA.trails.find((t) => t.id === cosData.selectedTrail) || COSMETICS_DATA.trails[0];

    const sizeMult = selectedSkin.sizeMultiplier || 1.0;
    const finalRadius = Math.round(radius * sizeMult);
    const density = selectedSkin.sizeType === 'big' ? 1.4 : selectedSkin.sizeType === 'small' ? 0.85 : 1.0;

    const ball = new Ball(this.physics, this.worldContainer, {
      id: `ball_${this.nextBallId++}`,
      x,
      y,
      radius: finalRadius,
      color: selectedSkin.color,
      glowColor: selectedSkin.glowColor,
      renderStyle: selectedSkin.renderStyle,
      density,
      type: 'player',
      lives: 1,
    });

    this.balls.push(ball);
    this.playerBall = ball;
    this.trails.registerBall(ball.id, ball.color, selectedTrail.type);
    this.aimSystem.setTargetBall(ball);
    return ball;
  }

  protected createSecondaryBall(x: number, y: number, radius = 12, color = 0x00f0ff): Ball {
    const ball = new Ball(this.physics, this.worldContainer, {
      id: `ball_${this.nextBallId++}`,
      x,
      y,
      radius,
      color,
      glowColor: color,
      type: 'neutral',
      lives: 1,
    });

    this.balls.push(ball);
    this.trails.registerBall(ball.id, ball.color, 'line');
    return ball;
  }

  protected buildObstacles(): void {
    for (const obs of this.config.obstacles) {
      if (obs.type === 'spike') {
        const spike = new Spike(this.physics, this.worldContainer, {
          id: obs.id,
          x: this.arena.centerX + obs.x,
          y: this.arena.centerY + obs.y,
          size: obs.size,
          rotation: obs.rotation,
          movePath: obs.movePath?.map((p) => ({ x: this.arena.centerX + p.x, y: this.arena.centerY + p.y })),
          moveSpeed: obs.moveSpeed,
          rotationSpeed: obs.rotationSpeed,
        });
        this.spikes.push(spike);
      } else if (obs.type === 'moving-bar' || obs.type === 'rotating-cross' || obs.type === 'static-wall') {
        const obstacle = new Obstacle(this.physics, this.worldContainer, {
          id: obs.id,
          type: obs.type,
          x: this.arena.centerX + obs.x,
          y: this.arena.centerY + obs.y,
          width: obs.width,
          height: obs.height,
          rotation: obs.rotation,
          rotationSpeed: obs.rotationSpeed,
          movePath: obs.movePath?.map((p) => ({ x: this.arena.centerX + p.x, y: this.arena.centerY + p.y })),
          moveSpeed: obs.moveSpeed,
        });
        this.obstacles.push(obstacle);
      }
    }
  }

  public update(realDt: number): { progress: ObjectiveProgress; result: LevelResult | null } {
    const timeScale = this.slowMo.update(realDt);
    const dt = realDt * timeScale;

    // Update arena and obstacles
    if (this.arena && this.config.arenaShape !== 'nested-boxes') this.arena.update(dt);
    for (const spike of this.spikes) spike.update(this.physics, dt);
    for (const obs of this.obstacles) obs.update(this.physics, dt);
    if (this.exitPortal) this.exitPortal.update(dt);

    // Update balls
    for (const ball of this.balls) {
      if (!ball.isDestroyed && !ball.isEscaped) {
        ball.update(this.physics, dt);
        this.trails.addPoint(ball.id, ball.view.x, ball.view.y, ball.getSpeed() * this.physics.getScale());

        // Check if ball escaped out of the arena in Escape mode
        if (this.arena && this.config.objective.type === 'escape_balls') {
          const dist = Math.hypot(ball.view.x - this.arena.centerX, ball.view.y - this.arena.centerY);
          if (dist > this.arena.radius + 18) {
            ball.isEscaped = true;
            this.handleBallEscaped(ball);
          }
        }
      }
    }

    // Update effects & systems
    this.collisionSystem.update();
    this.particles.update(dt);
    this.trails.update(dt);
    this.shockwaves.update(dt);
    this.aimSystem.update();
    this.trajectorySystem.renderTrajectory(this.aimSystem.getAimState(), this.playerBall);

    // Filter destroyed or escaped balls
    this.balls = this.balls.filter((b) => {
      if (b.isDestroyed || b.isEscaped) {
        this.trails.unregisterBall(b.id);
        b.destroy(this.physics);
        return false;
      }
      return true;
    });

    const activeBalls = this.balls.filter((b) => !b.isDestroyed && !b.isEscaped);
    const progress = this.objectiveSystem.update(dt, activeBalls);

    let result: LevelResult | null = null;

    if (!this.isFinished) {
      if (progress.isWon) {
        this.isFinished = true;
        this.slowMo.triggerSlowMo(0.2, 0.6);
        result = this.scoreSystem.finalizeResult({
          completed: true,
          timeSeconds: this.objectiveSystem.getTimeElapsed(),
          attemptsUsed: this.objectiveSystem.getShotsUsed() || 1,
          rebounds: this.playerBall?.rebounds || this.objectiveSystem.getWallImpacts(),
          ballsSaved: this.objectiveSystem.getEscapedCount() || activeBalls.length,
        });
      } else if (progress.isLost) {
        this.isFinished = true;
        result = this.scoreSystem.finalizeResult({
          completed: false,
          timeSeconds: this.objectiveSystem.getTimeElapsed(),
          attemptsUsed: this.objectiveSystem.getShotsUsed() || 1,
          rebounds: this.playerBall?.rebounds || this.objectiveSystem.getWallImpacts(),
          ballsSaved: this.objectiveSystem.getEscapedCount(),
        });
      }
    }

    return { progress, result };
  }

  public handlePointerDown(x: number, y: number): boolean {
    return this.aimSystem.handlePointerDown(x, y);
  }

  public handlePointerMove(x: number, y: number): void {
    this.aimSystem.handlePointerMove(x, y);
  }

  public handlePointerUp(): boolean {
    return this.aimSystem.handlePointerUp();
  }

  protected handleBallEscaped(ball: Ball): void {
    const pos = ball.view;
    AudioManager.getInstance().playGoal();
    HapticsManager.getInstance().mediumImpact();
    this.shockwaves.spawn(pos.x, pos.y, 0x00ff88, 80, 220);
    this.particles.emitBurst(pos.x, pos.y, 0x00ff88, 24, 200, 0.6, 4);

    this.objectiveSystem.onBallEscaped();
    this.scoreSystem.addPoints(500);

    // If active player ball escaped, assign next available ball as player
    if (ball === this.playerBall) {
      const nextPlayer = this.balls.find((b) => !b.isDestroyed && !b.isEscaped && b !== ball);
      if (nextPlayer) {
        this.playerBall = nextPlayer;
        nextPlayer.type = 'player';
        nextPlayer.redraw();
        this.aimSystem.setTargetBall(nextPlayer);
      } else {
        this.playerBall = null;
        this.aimSystem.setTargetBall(null);
      }
    }
  }

  protected handleBallSpikeHit(ball: Ball): void {
    if (ball.type === 'player') {
      this.objectiveSystem.setPlayerDead();
    }
  }

  protected handleWallImpact(_x: number, _y: number, _nx: number, _ny: number): void {
    this.objectiveSystem.onWallImpact();
    this.scoreSystem.addPoints(100);
  }

  protected handleBallSpawnRequested(_x: number, _y: number, _vx: number, _vy: number): void {
    // Overridden in NewBallMode
  }

  protected handleBallDestroyedInBattle(_victim: Ball, _attacker?: Ball): void {
    // Overridden in LastBallMode
  }

  public destroy(): void {
    for (const ball of this.balls) {
      ball.destroy(this.physics);
    }
    this.balls = [];
    for (const spike of this.spikes) spike.destroy(this.physics);
    this.spikes = [];
    for (const obs of this.obstacles) obs.destroy(this.physics);
    this.obstacles = [];
    if (this.arena) this.arena.destroy();
    if (this.exitPortal) this.exitPortal.destroy(this.physics);
    this.particles.clear();
    this.trails.clear();
    this.shockwaves.clear();
    this.aimSystem.cancelAim();
    this.trajectorySystem.clear();
  }
}
