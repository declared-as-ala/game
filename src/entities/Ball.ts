import { Container, Graphics } from 'pixi.js';
import * as planck from 'planck';
import type { PhysicsWorld } from '@/core/PhysicsWorld';

export type BallType = 'player' | 'offspring' | 'enemy' | 'neutral';
export type BallRenderStyle = 'marble' | 'classic';

export interface BallOptions {
  id: string;
  x: number; // Pixels
  y: number; // Pixels
  radius?: number; // Pixels (default: 14)
  color?: number;
  glowColor?: number;
  type?: BallType;
  lives?: number;
  restitution?: number;
  density?: number;
  renderStyle?: BallRenderStyle;
}

export class Ball {
  public id: string;
  public type: BallType;
  public radius: number;
  public color: number;
  public glowColor: number;
  public renderStyle: BallRenderStyle;

  public body: planck.Body;
  public fixture: planck.Fixture;
  public view: Container;

  protected graphics: Graphics;
  protected glowGraphics: Graphics;
  protected lifePipsGraphics: Graphics;

  public rebounds = 0;
  public evolutionTier = 0; // 0: Normal, 1: Tier 1, 2: Tier 2, 3: Supernova
  public lives = 3;
  public maxLives = 3;
  public isDestroyed = false;
  public isEscaped = false;

  // Impact feedback
  private squishX = 1;
  private squishY = 1;

  constructor(physics: PhysicsWorld, parent: Container, options: BallOptions) {
    this.id = options.id;
    this.type = options.type || 'player';
    this.radius = options.radius || 14;
    this.color = options.color || 0x00f0ff;
    this.glowColor = options.glowColor || 0x00a8ff;
    this.renderStyle = options.renderStyle || 'marble';
    this.lives = options.lives || (this.type === 'enemy' ? 3 : 1);
    this.maxLives = this.lives;

    // 1. Create Planck.js RigidBody
    const physPos = physics.toPhysicsVec({ x: options.x, y: options.y });
    this.body = physics.getWorld().createDynamicBody({
      position: physPos,
      linearDamping: 0.05,
      bullet: true, // CCD prevents tunneling through walls
    });
    this.body.setSleepingAllowed(false);

    const physRadius = physics.toPhysicsX(this.radius);
    this.fixture = this.body.createFixture({
      shape: planck.Circle(physRadius),
      density: options.density ?? 1.0,
      friction: 0.0,
      restitution: options.restitution ?? 0.98,
    });
    this.fixture.setUserData({ type: 'ball', ball: this });

    // 2. Create Pixi Visuals
    this.view = new Container();
    this.glowGraphics = new Graphics();
    this.graphics = new Graphics();
    this.lifePipsGraphics = new Graphics();

    this.view.addChild(this.glowGraphics);
    this.view.addChild(this.graphics);
    this.view.addChild(this.lifePipsGraphics);
    parent.addChild(this.view);

    this.redraw();
  }

  public redraw(): void {
    this.glowGraphics.clear();
    this.graphics.clear();

    if (this.renderStyle === 'classic') {
      this.redrawClassic();
    } else {
      this.redrawMarble();
    }

    // Evolution Ring if evolved (functional indicator, kept for both styles)
    if (this.evolutionTier > 0) {
      this.graphics
        .circle(0, 0, this.radius + 4 + this.evolutionTier * 2)
        .stroke({ width: 1.5, color: this.color, alpha: 0.75 });
    }

    this.drawLifePips();
  }

  /** Default look across the whole game: soft layered glow + solid core + highlight dot. */
  private redrawMarble(): void {
    const r = this.radius;
    this.glowGraphics.circle(0, 0, r * 2.7).fill({ color: this.color, alpha: 0.07 });
    this.glowGraphics.circle(0, 0, r * 1.75).fill({ color: this.color, alpha: 0.18 });

    this.graphics.circle(0, 0, r).fill({ color: this.color, alpha: 1.0 });
    this.graphics
      .circle(-r * 0.28, -r * 0.28, r * 0.26)
      .fill({ color: 0xffffff, alpha: 0.82 });
  }

  /** Original ball look, kept as the "Classic Orb" purchasable skin. */
  private redrawClassic(): void {
    const glowRadius = this.radius * (1.6 + this.evolutionTier * 0.3);
    const glowAlpha = 0.25 + this.evolutionTier * 0.15;
    this.glowGraphics
      .circle(0, 0, glowRadius)
      .fill({ color: this.glowColor, alpha: glowAlpha });

    this.graphics
      .circle(0, 0, this.radius)
      .fill({ color: this.color, alpha: 0.95 })
      .stroke({ width: 2.5 + this.evolutionTier, color: 0xffffff, alpha: 0.9 });

    this.graphics
      .circle(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.35)
      .fill({ color: 0xffffff, alpha: 0.65 });
  }

  private drawLifePips(): void {
    this.lifePipsGraphics.clear();
    if (this.maxLives <= 1) return;

    // Draw orbiting health pips
    const pipCount = this.maxLives;
    const pipRadius = 3;
    const orbitDistance = this.radius + 7;

    for (let i = 0; i < pipCount; i++) {
      const angle = (i / pipCount) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * orbitDistance;
      const py = Math.sin(angle) * orbitDistance;
      const isAlive = i < this.lives;

      this.lifePipsGraphics
        .circle(px, py, pipRadius)
        .fill({ color: isAlive ? this.color : 0x333344, alpha: isAlive ? 0.9 : 0.4 })
        .stroke({ width: 1, color: isAlive ? 0xffffff : 0x555566 });
    }
  }

  public update(physics: PhysicsWorld, dt: number): void {
    if (this.isDestroyed) return;

    const pos = this.body.getPosition();
    const renderPos = physics.toRenderVec(pos);

    this.view.x = renderPos.x;
    this.view.y = renderPos.y;
    this.view.rotation = this.body.getAngle();

    // Squish recovery animation
    this.squishX += (1 - this.squishX) * dt * 15;
    this.squishY += (1 - this.squishY) * dt * 15;
    this.view.scale.set(this.squishX, this.squishY);
  }

  public onImpact(impactVelocity: number): void {
    this.rebounds++;
    this.checkEvolution();

    // Visual squish
    const squishFactor = Math.min(0.35, impactVelocity * 0.015);
    this.squishX = 1 + squishFactor;
    this.squishY = 1 - squishFactor;
  }

  public takeDamage(amount = 1): boolean {
    this.lives -= amount;
    this.drawLifePips();
    return this.lives <= 0;
  }

  public checkEvolution(): boolean {
    let newTier = 0;
    if (this.rebounds >= 30) newTier = 3;
    else if (this.rebounds >= 20) newTier = 2;
    else if (this.rebounds >= 10) newTier = 1;

    if (newTier !== this.evolutionTier) {
      this.evolutionTier = newTier;
      this.redraw();
      return true; // Evolved!
    }
    return false;
  }

  public setPosition(physics: PhysicsWorld, x: number, y: number): void {
    const physVec = physics.toPhysicsVec({ x, y });
    this.body.setPosition(physVec);
    this.body.setLinearVelocity(planck.Vec2(0, 0));
    this.body.setAngularVelocity(0);
    this.view.x = x;
    this.view.y = y;
  }

  public applyImpulse(impulse: planck.Vec2): void {
    this.body.applyLinearImpulse(impulse, this.body.getWorldCenter(), true);
  }

  public getVelocity(): planck.Vec2 {
    return this.body.getLinearVelocity();
  }

  public getSpeed(): number {
    return this.body.getLinearVelocity().length();
  }

  public destroy(physics: PhysicsWorld): void {
    this.isDestroyed = true;
    if (this.view.parent) {
      this.view.parent.removeChild(this.view);
    }
    physics.destroyBody(this.body);
  }
}
