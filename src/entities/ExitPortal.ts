import { Container, Graphics } from 'pixi.js';
import * as planck from 'planck';
import type { PhysicsWorld } from '@/core/PhysicsWorld';

export interface ExitPortalOptions {
  id: string;
  x: number; // Pixels
  y: number;
  radius?: number; // Pixels (default: 24)
  color?: number;
}

export class ExitPortal {
  public id: string;
  public radius: number;
  public color: number;

  public body: planck.Body;
  public fixture: planck.Fixture;
  public view: Container;

  private graphics: Graphics;
  private glowGraphics: Graphics;
  private rotationAngle = 0;

  constructor(physics: PhysicsWorld, parent: Container, options: ExitPortalOptions) {
    this.id = options.id;
    this.radius = options.radius || 24;
    this.color = options.color || 0x00ff88;

    const physPos = physics.toPhysicsVec({ x: options.x, y: options.y });
    this.body = physics.getWorld().createBody({
      position: physPos,
    });

    const physRadius = physics.toPhysicsX(this.radius);
    this.fixture = this.body.createFixture({
      shape: planck.Circle(physRadius),
      isSensor: true, // Sensor triggers contact without physical bounce
    });
    this.fixture.setUserData({ type: 'exit', portal: this });

    this.view = new Container();
    this.glowGraphics = new Graphics();
    this.graphics = new Graphics();
    this.view.addChild(this.glowGraphics);
    this.view.addChild(this.graphics);
    parent.addChild(this.view);

    this.view.x = options.x;
    this.view.y = options.y;

    this.render();
  }

  private render(): void {
    const r = this.radius;

    // Glow aura
    this.glowGraphics.clear();
    this.glowGraphics
      .circle(0, 0, r * 1.5)
      .fill({ color: this.color, alpha: 0.18 });

    // Neon Vortex Rings
    this.graphics.clear();
    this.graphics
      .circle(0, 0, r)
      .stroke({ width: 3, color: this.color, alpha: 0.9 });

    this.graphics
      .circle(0, 0, r * 0.65)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.8 });

    this.graphics
      .circle(0, 0, r * 0.3)
      .fill({ color: this.color, alpha: 0.75 });
  }

  public update(dt: number): void {
    this.rotationAngle += dt * 2.5;
    this.view.rotation = this.rotationAngle;

    // Pulsing glow scale
    const pulse = 1 + Math.sin(this.rotationAngle * 2) * 0.08;
    this.glowGraphics.scale.set(pulse, pulse);
  }

  public destroy(physics: PhysicsWorld): void {
    if (this.view.parent) {
      this.view.parent.removeChild(this.view);
    }
    physics.destroyBody(this.body);
  }
}
