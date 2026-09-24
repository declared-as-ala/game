import * as planck from 'planck';
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BaseMode } from './BaseMode';
import { Arena } from '@/entities/Arena';
import type { PhysicsWorld } from '@/core/PhysicsWorld';
import type { LevelConfig, LevelResult, OrbitPlanetConfig, OrbitHazardConfig } from '@/data/types';
import type { ScreenShake } from '@/effects/ScreenShake';
import type { ObjectiveProgress } from '@/systems/ObjectiveSystem';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';
import { SaveManager } from '@/core/SaveManager';
import { COSMETICS_DATA } from '@/data/cosmeticsData';

interface RuntimePlanet extends OrbitPlanetConfig {
  worldX: number;
  worldY: number;
  radius: number;
  captureRadius: number;
  currentAngle: number;
  currentDirection: 1 | -1;
  pulsePhase: number;
}

interface RuntimeHazard extends OrbitHazardConfig {
  worldX: number;
  worldY: number;
  size: number;
  rotationSpeed: number;
  currentRotation: number;
  patrolProgress: number;
  orbitPhase: number;
}

export class OrbitLeapMode extends BaseMode {
  private planets: RuntimePlanet[] = [];
  private hazards: RuntimeHazard[] = [];
  private currentPlanetIndex: number = 0;
  private lastReleasedPlanetIndex: number = -1;
  private releaseCooldownTimer: number = 0;

  // Ball & Orbit State
  private orbitAngle: number = 0;
  private orbitDirection: 1 | -1 = 1;
  private orbitSpeed: number = 1.25;
  private launchSpeed: number = 850;
  private state: 'orbit' | 'capturing' | 'flight' | 'dead' | 'won' = 'orbit';

  // Smooth Capture Blend
  private captureElapsed: number = 0;
  private readonly captureDuration: number = 0.10; // 100ms smooth radial blend
  private captureStartRadius: number = 0;
  private captureTargetRadius: number = 0;

  // Temporary orbit decay
  private planetRotationsAccumulator: number = 0;

  // Flight dynamics
  private flightPos: { x: number; y: number } = { x: 0, y: 0 };
  private flightVel: { x: number; y: number } = { x: 0, y: 0 };

  // Scoring & Stats
  private jumpsCount: number = 0;
  private attemptsCount: number = 1;
  private totalElapsedTime: number = 0;
  private lockTimer: number = 0;
  private deathTimer: number = 0;

  // Pixi Render Containers
  private backgroundFXGraphics!: Graphics;
  private planetsGraphics!: Graphics;
  private trajectoryGraphics!: Graphics;
  private hazardsGraphics!: Graphics;
  private labelsContainer!: Container;
  private tutorialContainer!: Container;
  private tutorialText: Text | null = null;

  private keydownListener: ((ev: KeyboardEvent) => void) | null = null;

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
    const arenaRadius = this.config.arenaSize || 350;

    this.arena = new Arena(this.physics, this.worldContainer, {
      shape: 'circle',
      centerX: cx,
      centerY: cy,
      radius: arenaRadius,
      color: this.config.arenaColor || 0x00f0ff,
    });

    this.launchSpeed = this.config.launchSpeed || 850;

    // Build runtime planets from data-driven config
    const scale = arenaRadius;
    const rawPlanets: OrbitPlanetConfig[] =
      this.config.orbitPlanets && this.config.orbitPlanets.length > 0
        ? this.config.orbitPlanets
        : (this.config.orbitStations || []).map((st, idx, arr) => ({
            x: st.x,
            y: st.y,
            orbitRadius: st.radius || 62,
            radius: 18,
            angularSpeed: this.config.orbitSpeed || 1.3,
            direction: 1,
            captureRadius: (st.radius || 62) + 24,
            color: st.color || 0x00f0ff,
            type: idx === 0 ? 'start' : idx === arr.length - 1 ? 'goal' : 'normal',
            label: st.label,
          }));

    this.planets = rawPlanets.map((p, idx) => {
      const wx = cx + p.x * scale;
      const wy = cy + p.y * scale;
      return {
        ...p,
        worldX: wx,
        worldY: wy,
        radius: p.radius || 18,
        orbitRadius: p.orbitRadius || 62,
        angularSpeed: p.angularSpeed || this.config.orbitSpeed || 1.3,
        direction: p.direction || 1,
        captureRadius: p.captureRadius || (p.orbitRadius || 62) + 24,
        gravityStrength: p.gravityStrength ?? 1.0,
        color: p.type === 'goal' ? 0xffda67 : p.color || 0x00f0ff,
        currentAngle: 0,
        currentDirection: p.direction || 1,
        pulsePhase: idx * 1.5,
      };
    });

    // Build runtime hazards
    const rawHazards: OrbitHazardConfig[] =
      this.config.orbitHazards && this.config.orbitHazards.length > 0
        ? this.config.orbitHazards
        : (this.config.hazardSpikes || []).map((hz) => ({
            type: 'triangle',
            x: hz.x,
            y: hz.y,
            size: hz.size || 15,
            rotation: 0,
            rotationSpeed: hz.rotationSpeed || 0.7,
            movementType: 'rotate',
          }));

    this.hazards = rawHazards.map((hz) => ({
      ...hz,
      worldX: cx + hz.x * scale,
      worldY: cy + hz.y * scale,
      size: hz.size || 15,
      rotation: hz.rotation || 0,
      currentRotation: hz.rotation || 0,
      rotationSpeed: hz.rotationSpeed || 0.7,
      movementType: hz.movementType || 'rotate',
      patrolProgress: 0,
      orbitPhase: 0,
    }));

    // Setup rendering layers in orderly z-index
    this.backgroundFXGraphics = new Graphics();
    this.planetsGraphics = new Graphics();
    this.trajectoryGraphics = new Graphics();
    this.hazardsGraphics = new Graphics();
    this.labelsContainer = new Container();
    this.tutorialContainer = new Container();

    this.worldContainer.addChild(this.backgroundFXGraphics);
    this.worldContainer.addChild(this.planetsGraphics);
    this.worldContainer.addChild(this.trajectoryGraphics);
    this.worldContainer.addChild(this.hazardsGraphics);
    this.worldContainer.addChild(this.labelsContainer);
    this.worldContainer.addChild(this.tutorialContainer);

    // Initial ball placement at start planet
    const startPlanet = this.planets[0];
    const initialAngle = this.config.ballStartAngle ?? -Math.PI / 2;
    this.orbitAngle = initialAngle;
    this.orbitDirection = startPlanet.currentDirection;
    this.orbitSpeed = startPlanet.angularSpeed || 1.3;

    const initialX = startPlanet.worldX + Math.cos(this.orbitAngle) * startPlanet.orbitRadius;
    const initialY = startPlanet.worldY + Math.sin(this.orbitAngle) * startPlanet.orbitRadius;

    // Energy ball with equipped skin styling and size
    this.playerBall = this.createPlayerBall(initialX, initialY, 10);

    this.setupLabels();
    this.setupTutorial();
    this.setupKeyboardInput();
    this.resetLevelState();
  }

  private setupLabels(): void {
    this.labelsContainer.removeChildren();

    const textStyle = new TextStyle({
      fontFamily: 'Outfit, Orbitron, sans-serif',
      fontSize: 11,
      fontWeight: '800',
      fill: 0xffffff,
      align: 'center',
      letterSpacing: 1.5,
    });

    this.planets.forEach((p, idx) => {
      const isGoal = p.type === 'goal';
      const labelText = isGoal ? '🚩 GOAL' : p.label || (idx === 0 ? 'START' : `0${idx + 1}`);

      const txt = new Text({
        text: labelText,
        style: {
          ...textStyle,
          fontSize: isGoal ? 12 : 10,
          fill: isGoal ? 0xffda67 : p.color || 0x00f0ff,
        },
      });
      txt.anchor.set(0.5, 1);
      txt.x = p.worldX;
      txt.y = p.worldY - p.orbitRadius - 8;
      this.labelsContainer.addChild(txt);
    });
  }

  private setupTutorial(): void {
    this.tutorialContainer.removeChildren();
    if (!this.config.tutorialMessage) return;

    const tutorialStyle = new TextStyle({
      fontFamily: 'Outfit, Orbitron, sans-serif',
      fontSize: 13,
      fontWeight: '900',
      fill: 0x00f0ff,
      align: 'center',
      letterSpacing: 2,
    });

    this.tutorialText = new Text({
      text: this.config.tutorialMessage,
      style: tutorialStyle,
    });
    this.tutorialText.anchor.set(0.5, 0.5);
    this.tutorialText.x = 0;
    this.tutorialText.y = 230;
    this.tutorialContainer.addChild(this.tutorialText);
  }

  private setupKeyboardInput(): void {
    this.keydownListener = (ev: KeyboardEvent) => {
      if (ev.code === 'Space' || ev.code === 'Enter') {
        ev.preventDefault();
        this.triggerPrimaryAction();
      } else if (ev.code === 'KeyR') {
        ev.preventDefault();
        this.attemptsCount++;
        this.resetLevelState();
      }
    };
    window.addEventListener('keydown', this.keydownListener);
  }

  /**
   * Pure single tap anywhere on screen.
   * While orbiting: releases the ball along tangent velocity.
   * While flying: tap does nothing.
   * While dead: instant retry.
   */
  public override handlePointerDown(_worldX: number, _worldY: number): boolean {
    this.triggerPrimaryAction();
    return true;
  }

  public override handlePointerMove(_worldX: number, _worldY: number): void {
    // No drag or manual steering allowed
  }

  public override handlePointerUp(): boolean {
    // No release behavior needed on pointer up
    return true;
  }

  private triggerPrimaryAction(): void {
    if (this.state === 'dead') {
      this.attemptsCount++;
      this.resetLevelState();
      return;
    }

    if (this.state !== 'orbit' || this.lockTimer > 0) return;

    // Release ball along tangent vector
    this.releaseBall();
  }

  private releaseBall(): void {
    if (!this.playerBall) return;

    const currentPlanet = this.planets[this.currentPlanetIndex];
    const tangent = this.getTangent();

    this.flightPos = {
      x: this.playerBall.view.x,
      y: this.playerBall.view.y,
    };

    this.flightVel = {
      x: tangent.x * this.launchSpeed,
      y: tangent.y * this.launchSpeed,
    };

    this.state = 'flight';
    this.lastReleasedPlanetIndex = this.currentPlanetIndex;
    this.releaseCooldownTimer = 0.18; // Short grace period to leave current orbit cleanly
    this.jumpsCount++;

    // Audio & Haptic Feedback
    AudioManager.getInstance().playOrbitRelease();
    HapticsManager.getInstance().lightImpact();

    // Subtle impulse spark particles
    this.particles.emitDirectionalSparks(
      this.flightPos.x,
      this.flightPos.y,
      tangent.x,
      tangent.y,
      currentPlanet.color || 0x00f0ff,
      10
    );

    // Hide tutorial hint after first launch
    if (this.tutorialText) {
      this.tutorialText.visible = false;
    }
  }

  private getTangent(): { x: number; y: number } {
    return {
      x: -Math.sin(this.orbitAngle) * this.orbitDirection,
      y: Math.cos(this.orbitAngle) * this.orbitDirection,
    };
  }

  private resetLevelState(): void {
    this.currentPlanetIndex = 0;
    this.lastReleasedPlanetIndex = -1;
    this.releaseCooldownTimer = 0;
    this.state = 'orbit';
    this.lockTimer = 0;
    this.deathTimer = 0;
    this.planetRotationsAccumulator = 0;

    const startPlanet = this.planets[0];
    this.orbitAngle = this.config.ballStartAngle ?? -Math.PI / 2;
    this.orbitDirection = startPlanet.currentDirection;
    this.orbitSpeed = startPlanet.angularSpeed || 1.3;

    const initialX = startPlanet.worldX + Math.cos(this.orbitAngle) * startPlanet.orbitRadius;
    const initialY = startPlanet.worldY + Math.sin(this.orbitAngle) * startPlanet.orbitRadius;

    if (this.playerBall) {
      this.playerBall.view.x = initialX;
      this.playerBall.view.y = initialY;
      this.playerBall.body.setPosition(planck.Vec2(initialX / 30, initialY / 30));
      this.playerBall.body.setLinearVelocity(planck.Vec2(0, 0));
      this.playerBall.view.visible = true;

      // Register equipped cosmetic trail
      this.trails.unregisterBall(this.playerBall.id);
      const cosData = SaveManager.getInstance().getData().cosmetics;
      const selectedTrail =
        COSMETICS_DATA.trails.find((t) => t.id === cosData?.selectedTrail) || COSMETICS_DATA.trails[0];
      this.trails.registerBall(this.playerBall.id, 0xffffff, selectedTrail.type);
    }

    const nextLabel = this.planets.length > 1 ? this.planets[1].label || '02' : 'GOAL';
    this.objectiveSystem.onOrbitReached(0, this.planets.length, nextLabel);

    if (this.tutorialText) {
      this.tutorialText.visible = true;
    }
  }

  public override update(realDt: number): { progress: ObjectiveProgress; result: LevelResult | null } {
    const timeScale = this.slowMo.getTimeScale();
    const dt = realDt * timeScale;
    this.totalElapsedTime += dt;
    this.lockTimer = Math.max(0, this.lockTimer - dt);
    this.releaseCooldownTimer = Math.max(0, this.releaseCooldownTimer - dt);

    // Update dynamic planets (moving paths)
    this.updatePlanets(dt);

    // Update hazards (rotation, patrol, orbit)
    this.updateHazards(dt);

    if (this.playerBall) {
      if (this.state === 'orbit') {
        this.updateOrbitState(dt);
      } else if (this.state === 'capturing') {
        this.updateCaptureTransition(dt);
      } else if (this.state === 'flight') {
        this.updateFlightPhysics(dt);
      } else if (this.state === 'dead') {
        this.deathTimer += dt;
        if (this.deathTimer >= 0.55) {
          this.attemptsCount++;
          this.resetLevelState();
        }
      }
    }

    // Render visuals
    this.renderPlanets();
    this.renderHazards();
    this.renderTrajectoryPreview();

    const updateResult = super.update(realDt);

    if (this.state === 'won' && !this.isFinished) {
      this.isFinished = true;
      this.slowMo.triggerSlowMo(0.2, 0.7);

      const optimal = this.config.optimalLaunches || this.planets.length - 1;
      let stars = 1;
      if (this.jumpsCount <= optimal) {
        stars = 3;
      } else if (this.jumpsCount <= optimal + 2) {
        stars = 2;
      }

      const score = Math.max(
        150,
        Math.floor(1200 - this.totalElapsedTime * 20 - (this.attemptsCount - 1) * 80)
      );

      return {
        progress: {
          current: this.planets.length,
          target: this.planets.length,
          isWon: true,
          isLost: false,
          label: 'GOAL REACHED! 🌟',
        },
        result: {
          completed: true,
          starsEarned: stars,
          score,
          timeSeconds: this.totalElapsedTime,
          attemptsUsed: this.attemptsCount,
          rebounds: this.jumpsCount,
          ballsSavedOrRemaining: 1,
        },
      };
    }

    return updateResult;
  }

  private updatePlanets(dt: number): void {
    const scale = this.arena.radius;
    this.planets.forEach((p, idx) => {
      p.pulsePhase += dt * 2.5;

      if (p.movePath) {
        const path = p.movePath;
        const pingPong = (Math.sin(this.totalElapsedTime * path.speed * 2.0) + 1) * 0.5;
        const normX = path.startX + (path.endX - path.startX) * pingPong;
        const normY = path.startY + (path.endY - path.startY) * pingPong;
        p.worldX = normX * scale;
        p.worldY = normY * scale;

        // Keep label positioned with planet
        const labelChild = this.labelsContainer.children[idx];
        if (labelChild) {
          labelChild.x = p.worldX;
          labelChild.y = p.worldY - p.orbitRadius - 8;
        }
      }
    });
  }

  private updateHazards(dt: number): void {
    const scale = this.arena.radius;
    this.hazards.forEach((h) => {
      h.currentRotation += h.rotationSpeed * dt;

      if (h.movementType === 'patrol' && h.patrol) {
        const p = h.patrol;
        const pingPong = (Math.sin(this.totalElapsedTime * p.speed * 2.5) + 1) * 0.5;
        h.worldX = (p.startX + (p.endX - p.startX) * pingPong) * scale;
        h.worldY = (p.startY + (p.endY - p.startY) * pingPong) * scale;
      } else if (h.movementType === 'orbit_planet' && h.orbitPlanetIndex !== undefined) {
        const host = this.planets[h.orbitPlanetIndex];
        if (host) {
          h.orbitPhase += (h.orbitSpeed || 1.0) * dt;
          const dist = h.orbitDistance || host.orbitRadius + 28;
          h.worldX = host.worldX + Math.cos(h.orbitPhase) * dist;
          h.worldY = host.worldY + Math.sin(h.orbitPhase) * dist;
        }
      }
    });
  }

  private updateOrbitState(dt: number): void {
    if (!this.playerBall) return;
    const currentPlanet = this.planets[this.currentPlanetIndex];

    const deltaAngle = this.orbitSpeed * this.orbitDirection * dt;
    this.orbitAngle += deltaAngle;

    // Track rotations for temporary planets
    if (currentPlanet.type === 'temporary' && currentPlanet.maxRotations) {
      this.planetRotationsAccumulator += Math.abs(deltaAngle) / (Math.PI * 2);
      if (this.planetRotationsAccumulator >= currentPlanet.maxRotations) {
        // Automatic release when orbit decays
        this.releaseBall();
        return;
      }
    }

    const bx = currentPlanet.worldX + Math.cos(this.orbitAngle) * currentPlanet.orbitRadius;
    const by = currentPlanet.worldY + Math.sin(this.orbitAngle) * currentPlanet.orbitRadius;

    this.playerBall.view.x = bx;
    this.playerBall.view.y = by;
    this.playerBall.body.setPosition(planck.Vec2(bx / 30, by / 30));

    this.trails.addPoint(this.playerBall.id, bx, by, 80);
  }

  private updateCaptureTransition(dt: number): void {
    if (!this.playerBall) return;
    const targetPlanet = this.planets[this.currentPlanetIndex];

    this.captureElapsed += dt;
    const t = Math.min(1.0, this.captureElapsed / this.captureDuration);
    // Smooth cosine interpolation
    const easeT = 0.5 - 0.5 * Math.cos(t * Math.PI);

    const curRadius = this.captureStartRadius + (this.captureTargetRadius - this.captureStartRadius) * easeT;
    this.orbitAngle += this.orbitSpeed * this.orbitDirection * dt;

    const bx = targetPlanet.worldX + Math.cos(this.orbitAngle) * curRadius;
    const by = targetPlanet.worldY + Math.sin(this.orbitAngle) * curRadius;

    this.playerBall.view.x = bx;
    this.playerBall.view.y = by;
    this.playerBall.body.setPosition(planck.Vec2(bx / 30, by / 30));

    this.trails.addPoint(this.playerBall.id, bx, by, 300);

    if (t >= 1.0) {
      this.state = 'orbit';
      if (targetPlanet.type === 'goal') {
        this.handleVictory();
      }
    }
  }

  private updateFlightPhysics(dt: number): void {
    if (!this.playerBall) return;

    // Sub-stepping for collision accuracy at high velocities
    const speed = Math.hypot(this.flightVel.x, this.flightVel.y);
    const steps = Math.max(2, Math.ceil((speed * dt) / 6.0));
    const subDt = dt / steps;

    const G = 190000; // Gravitational constant for smooth, predictable planetary pull

    for (let s = 0; s < steps; s++) {
      // 1. Calculate gravitational pull from nearby planets
      let ax = 0;
      let ay = 0;

      for (let i = 0; i < this.planets.length; i++) {
        const p = this.planets[i];
        const dx = p.worldX - this.flightPos.x;
        const dy = p.worldY - this.flightPos.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;

        // Gravity influence horizon: pull gently when within 2.5x orbit radius
        const maxRange = p.orbitRadius * 2.8;
        if (dist < maxRange) {
          const force = ((G * p.gravityStrength!) / (distSq + 2500)) * (1.0 - dist / maxRange);
          ax += (dx / dist) * force;
          ay += (dy / dist) * force;
        }
      }

      // Apply acceleration and velocity
      this.flightVel.x += ax * subDt;
      this.flightVel.y += ay * subDt;

      this.flightPos.x += this.flightVel.x * subDt;
      this.flightPos.y += this.flightVel.y * subDt;

      this.playerBall.view.x = this.flightPos.x;
      this.playerBall.view.y = this.flightPos.y;
      this.playerBall.body.setPosition(planck.Vec2(this.flightPos.x / 30, this.flightPos.y / 30));

      // 2. Check collision with red triangle hazards
      const ballR = this.playerBall.radius;
      for (const hz of this.hazards) {
        const dist = Math.hypot(this.flightPos.x - hz.worldX, this.flightPos.y - hz.worldY);
        if (dist < hz.size + ballR) {
          this.handleFail();
          return;
        }
      }

      // 3. Check collision with dangerous planet cores
      for (const p of this.planets) {
        const dist = Math.hypot(this.flightPos.x - p.worldX, this.flightPos.y - p.worldY);
        if (dist < p.radius + ballR) {
          this.handleFail();
          return;
        }
      }

      // 4. When ball touches the circle boundary, bounce and go to opposite direction
      const distFromCenter = Math.hypot(this.flightPos.x, this.flightPos.y);
      const circleRadius = this.arena.radius;
      if (distFromCenter >= circleRadius - ballR) {
        const nx = -this.flightPos.x / (distFromCenter || 1);
        const ny = -this.flightPos.y / (distFromCenter || 1);
        const dot = this.flightVel.x * nx + this.flightVel.y * ny;

        if (dot < 0) {
          // Specular reflection: V' = V - 2 * (V . N) * N (inverts direction off circular wall)
          this.flightVel.x = this.flightVel.x - 2 * dot * nx;
          this.flightVel.y = this.flightVel.y - 2 * dot * ny;

          // Keep ball strictly inside the circle
          this.flightPos.x = (-nx) * (circleRadius - ballR - 2);
          this.flightPos.y = (-ny) * (circleRadius - ballR - 2);

          // Audio & visual feedback on circle bounce
          AudioManager.getInstance().playCollision(18, true);
          HapticsManager.getInstance().lightImpact();
          this.shockwaves.spawn(this.flightPos.x, this.flightPos.y, this.arena.color || 0x00f0ff, 35, 90);
          this.particles.emitDirectionalSparks(this.flightPos.x, this.flightPos.y, nx, ny, this.arena.color || 0x00f0ff, 12);
        }
      }

      // 5. Check capture by valid planets
      for (let i = 0; i < this.planets.length; i++) {
        // Cannot recapture the same planet during release cooldown
        if (i === this.lastReleasedPlanetIndex && this.releaseCooldownTimer > 0) continue;

        const p = this.planets[i];
        const dist = Math.hypot(this.flightPos.x - p.worldX, this.flightPos.y - p.worldY);

        if (dist <= p.captureRadius) {
          this.initiateCapture(i, dist);
          return;
        }
      }
    }

    this.trails.addPoint(this.playerBall.id, this.flightPos.x, this.flightPos.y, speed);
  }

  private initiateCapture(planetIndex: number, currentDist: number): void {
    this.currentPlanetIndex = planetIndex;
    const targetPlanet = this.planets[planetIndex];
    this.planetRotationsAccumulator = 0;

    const dx = this.flightPos.x - targetPlanet.worldX;
    const dy = this.flightPos.y - targetPlanet.worldY;
    const dist = Math.hypot(dx, dy) || 1;

    const normX = dx / dist;
    const normY = dy / dist;

    // Cross product (r x v) determines entry rotation direction (CW vs CCW)
    const cross = normX * this.flightVel.y - normY * this.flightVel.x;
    let dir: 1 | -1 = cross >= 0 ? 1 : -1;

    // Gravity switch planet flips direction
    if (targetPlanet.type === 'switch') {
      dir = dir === 1 ? -1 : 1;
    }

    this.orbitAngle = Math.atan2(normY, normX);
    this.orbitDirection = dir;
    this.orbitSpeed = targetPlanet.angularSpeed || 1.3;

    // Initiate smooth radial blend
    this.state = 'capturing';
    this.captureElapsed = 0;
    this.captureStartRadius = currentDist;
    this.captureTargetRadius = targetPlanet.orbitRadius;

    // Audio & Haptic Feedback
    AudioManager.getInstance().playOrbitCapture();
    HapticsManager.getInstance().mediumImpact();

    // Visual feedback: soft shockwave & sparks
    this.shockwaves.spawn(
      this.flightPos.x,
      this.flightPos.y,
      targetPlanet.color || 0x00f0ff,
      35,
      95
    );
    this.particles.emitDirectionalSparks(
      this.flightPos.x,
      this.flightPos.y,
      normX,
      normY,
      targetPlanet.color || 0x00f0ff,
      12
    );

    const isGoal = targetPlanet.type === 'goal';
    if (!isGoal) {
      const nextPlanet = this.planets[planetIndex + 1];
      const nextLabel = nextPlanet ? nextPlanet.label || 'GOAL' : 'GOAL';
      this.objectiveSystem.onOrbitReached(planetIndex, this.planets.length, nextLabel);
    }
  }

  private handleFail(): void {
    if (!this.playerBall || this.state === 'dead') return;
    this.state = 'dead';
    this.deathTimer = 0;
    this.lockTimer = 0.5;

    const bx = this.playerBall.view.x;
    const by = this.playerBall.view.y;

    this.screenShake.addTrauma(0.5);
    HapticsManager.getInstance().heavyImpact();
    AudioManager.getInstance().playOrbitFail();

    // Red burst explosion
    this.particles.emitBurst(bx, by, 0xff3b62, 28, 220, 0.45, 3.5);
    this.shockwaves.spawn(bx, by, 0xff3b62, 40, 130);
    this.playerBall.view.visible = false;
  }

  private handleVictory(): void {
    this.state = 'won';
    this.lockTimer = 1.0;

    const goalPlanet = this.planets[this.currentPlanetIndex];
    AudioManager.getInstance().playOrbitGoal();
    HapticsManager.getInstance().success();

    // Golden victory burst
    this.shockwaves.spawn(goalPlanet.worldX, goalPlanet.worldY, 0xffda67, 85, 240);
    this.particles.emitBurst(goalPlanet.worldX, goalPlanet.worldY, 0xffda67, 40, 260, 0.8, 4.5);
    this.particles.emitBurst(goalPlanet.worldX, goalPlanet.worldY, 0xffffff, 20, 180, 0.5, 3.0);
    this.objectiveSystem.onOrbitReached(this.planets.length - 1, this.planets.length, 'GOAL');
  }

  private renderPlanets(): void {
    this.planetsGraphics.clear();

    this.planets.forEach((p, idx) => {
      const isPast = idx < this.currentPlanetIndex && this.state !== 'won';
      const isCurrent = idx === this.currentPlanetIndex;
      const isGoal = p.type === 'goal';
      const color = isGoal ? 0xffda67 : p.color || 0x00f0ff;

      const alpha = isPast ? 0.35 : isCurrent ? 1.0 : 0.75;

      // 1. Outer Orbit Track Ring
      this.planetsGraphics
        .circle(p.worldX, p.worldY, p.orbitRadius)
        .stroke({ width: 2.5, color, alpha });

      // Subtle atmospheric glow
      this.planetsGraphics
        .circle(p.worldX, p.worldY, p.orbitRadius)
        .stroke({ width: 7, color, alpha: alpha * 0.22 });

      // 2. Decorative thin concentric ring
      this.planetsGraphics
        .circle(p.worldX, p.worldY, p.orbitRadius * 0.55)
        .stroke({ width: 1, color, alpha: alpha * 0.18 });

      // 3. Goal Planet Special: Outer Animated Dashed Ring
      if (isGoal) {
        const dashCount = 18;
        const dashRadius = p.orbitRadius + 14;
        const rot = this.totalElapsedTime * 1.2;
        for (let d = 0; d < dashCount; d += 2) {
          const a1 = rot + (d * Math.PI * 2) / dashCount;
          const a2 = rot + ((d + 1) * Math.PI * 2) / dashCount;
          this.planetsGraphics
            .arc(p.worldX, p.worldY, dashRadius, a1, a2)
            .stroke({ width: 2, color: 0xffda67, alpha: 0.5 });
        }
      }

      // 4. Center Glowing Body
      const pulse = Math.sin(p.pulsePhase) * 1.5;
      const coreR = p.radius + (isGoal ? pulse * 1.5 : pulse);

      // Core outer aura
      this.planetsGraphics
        .circle(p.worldX, p.worldY, coreR + 4)
        .stroke({ width: 2, color, alpha: alpha * 0.6 });

      // Core solid fill
      this.planetsGraphics
        .circle(p.worldX, p.worldY, coreR)
        .fill({ color, alpha });
    });
  }

  private renderHazards(): void {
    this.hazardsGraphics.clear();

    this.hazards.forEach((h) => {
      const pts: { x: number; y: number }[] = [];
      const numPoints = 3;
      for (let i = 0; i < numPoints; i++) {
        const ang = h.currentRotation + (i * Math.PI * 2) / numPoints;
        pts.push({
          x: h.worldX + Math.cos(ang) * h.size,
          y: h.worldY + Math.sin(ang) * h.size,
        });
      }

      // Outer crimson glow
      this.hazardsGraphics
        .moveTo(pts[0].x, pts[0].y)
        .lineTo(pts[1].x, pts[1].y)
        .lineTo(pts[2].x, pts[2].y)
        .closePath()
        .stroke({ width: 5.5, color: 0xff3b62, alpha: 0.35 });

      // Crisp neon red outline + dark crimson core
      this.hazardsGraphics
        .moveTo(pts[0].x, pts[0].y)
        .lineTo(pts[1].x, pts[1].y)
        .lineTo(pts[2].x, pts[2].y)
        .closePath()
        .stroke({ width: 2.2, color: 0xff3b62, alpha: 1.0 })
        .fill({ color: 0x4a0011, alpha: 0.85 });

      // Center glowing beacon dot
      this.hazardsGraphics.circle(h.worldX, h.worldY, 2.0).fill({ color: 0xff3b62, alpha: 1.0 });
    });
  }

  /**
   * Trajectory Preview:
   * Short, subtle dotted tangent prediction line (8-12 dots)
   * Visible only while orbiting, updating in real-time, disappearing on release.
   */
  private renderTrajectoryPreview(): void {
    this.trajectoryGraphics.clear();

    if (this.state !== 'orbit' || !this.playerBall || this.currentPlanetIndex >= this.planets.length - 1) {
      return;
    }

    const tangent = this.getTangent();
    const bx = this.playerBall.view.x;
    const by = this.playerBall.view.y;

    const numDots = 10;
    const dotSpacing = 16;

    for (let i = 1; i <= numDots; i++) {
      const dotX = bx + tangent.x * i * dotSpacing;
      const dotY = by + tangent.y * i * dotSpacing;
      const alpha = (1.0 - i / (numDots + 1)) * 0.75;

      this.trajectoryGraphics
        .circle(dotX, dotY, 2.5)
        .fill({ color: 0xffffff, alpha });
    }
  }

  public override destroy(): void {
    super.destroy();
    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }
    this.backgroundFXGraphics.destroy();
    this.planetsGraphics.destroy();
    this.trajectoryGraphics.destroy();
    this.hazardsGraphics.destroy();
    this.labelsContainer.destroy();
    this.tutorialContainer.destroy();
  }
}
