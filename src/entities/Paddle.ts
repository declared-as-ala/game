import { Container, Graphics } from 'pixi.js';
import * as planck from 'planck';
import type { PhysicsWorld } from '@/core/PhysicsWorld';

export interface PaddleOptions {
  id?: string;
  x: number; // Pixels
  y: number; // Pixels
  length?: number; // Pixels (default: 75)
  thickness?: number; // Pixels (default: 12)
  color?: number; // default: 0xffe000 (Golden Neon)
  glowColor?: number; // default: 0xffaa00
  initialAngle?: number; // in radians (default: 0)
}

export class Paddle {
  public id: string;
  public length: number;
  public thickness: number;
  public color: number;
  public glowColor: number;

  public body: planck.Body;
  public fixture: planck.Fixture;
  public view: Container;

  private graphics: Graphics;
  private glowGraphics: Graphics;
  private centerPinGraphics: Graphics;

  private currentAngle = 0;
  private hitPulse = 0; // for recoil feedback
  private lastAngularVelocity = 0;

  constructor(physics: PhysicsWorld, parent: Container, options: PaddleOptions) {
    this.id = options.id || 'player_paddle';
    this.length = options.length || 75;
    this.thickness = options.thickness || 12;
    this.color = options.color ?? 0xffe000;
    this.glowColor = options.glowColor ?? 0xffaa00;
    this.currentAngle = options.initialAngle || 0;

    // 1. Create Kinematic Box2D Body
    const physPos = physics.toPhysicsVec({ x: options.x, y: options.y });
    this.body = physics.getWorld().createKinematicBody({
      position: physPos,
      angle: this.currentAngle,
    });
    this.body.setSleepingAllowed(false);

    // Box fixture with accurate half-width & half-height
    const halfW = physics.toPhysicsX(this.length / 2);
    const halfH = physics.toPhysicsY(this.thickness / 2);

    this.fixture = this.body.createFixture({
      shape: planck.Box(halfW, halfH),
      friction: 0.0,
      restitution: 1.0, // Clean specular kinetic bounce
      density: 10.0,
    });
    this.fixture.setUserData({ type: 'paddle', paddle: this });

    // 2. Visuals in PixiJS
    this.view = new Container();
    this.glowGraphics = new Graphics();
    this.graphics = new Graphics();
    this.centerPinGraphics = new Graphics();

    this.view.addChild(this.glowGraphics);
    this.view.addChild(this.graphics);
    this.view.addChild(this.centerPinGraphics);
    parent.addChild(this.view);

    this.view.x = options.x;
    this.view.y = options.y;
    this.view.rotation = this.currentAngle;

    this.render();
  }

  public render(): void {
    const hw = this.length / 2;
    const hh = this.thickness / 2;
    const r = hh; // Rounded pill ends

    // Glow Aura
    this.glowGraphics.clear();
    this.glowGraphics
      .roundRect(-hw - 8, -hh - 8, this.length + 16, this.thickness + 16, r + 8)
      .fill({ color: this.glowColor, alpha: 0.18 + this.hitPulse * 0.25 });

    this.glowGraphics
      .roundRect(-hw - 4, -hh - 4, this.length + 8, this.thickness + 8, r + 4)
      .fill({ color: this.glowColor, alpha: 0.35 + this.hitPulse * 0.35 });

    // Crisp Paddle Body
    this.graphics.clear();
    this.graphics
      .roundRect(-hw, -hh, this.length, this.thickness, r)
      .fill({ color: this.color, alpha: 0.95 })
      .stroke({ width: 2.2, color: 0xffffff, alpha: 0.95 });

    // Core Highlight Line
    this.graphics
      .roundRect(-hw + 6, -hh + 3, this.length - 12, this.thickness - 6, r - 2)
      .fill({ color: 0xffffff, alpha: 0.45 + this.hitPulse * 0.4 });

    // Center Pivot Ring
    this.centerPinGraphics.clear();
    this.centerPinGraphics
      .circle(0, 0, 5.5)
      .fill({ color: 0xffffff, alpha: 0.9 })
      .stroke({ width: 1.5, color: this.glowColor, alpha: 0.9 });
  }

  public setRotation(angle: number): void {
    this.currentAngle = angle;
    this.body.setAngle(angle);
    this.view.rotation = angle;
  }

  public rotateBy(deltaAngle: number): void {
    this.setRotation(this.currentAngle + deltaAngle);
    this.lastAngularVelocity = deltaAngle;
  }

  public getAngle(): number {
    return this.currentAngle;
  }

  public getAngularVelocity(): number {
    return this.lastAngularVelocity;
  }

  public onHit(): void {
    this.hitPulse = 1.0;
    this.render();
  }

  public update(dt: number): void {
    if (this.hitPulse > 0.01) {
      this.hitPulse = Math.max(0, this.hitPulse - dt * 6.0);
      this.render();
    }
    this.lastAngularVelocity *= Math.max(0, 1 - dt * 10.0);
  }

  public destroy(physics: PhysicsWorld): void {
    if (this.view.parent) {
      this.view.parent.removeChild(this.view);
    }
    physics.destroyBody(this.body);
  }
}
