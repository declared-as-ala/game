import { Container, Graphics } from 'pixi.js';
import * as planck from 'planck';
import type { PhysicsWorld } from '@/core/PhysicsWorld';
import type { Vector2D } from '@/data/types';

export interface SpikeOptions {
  id: string;
  x: number; // Pixels
  y: number;
  size?: number; // Pixels (default: 16)
  rotation?: number; // Radians
  movePath?: Vector2D[];
  moveSpeed?: number;
  rotationSpeed?: number;
  color?: number;
}

export class Spike {
  public id: string;
  public size: number;
  public color: number;

  public body: planck.Body;
  public fixture: planck.Fixture;
  public view: Container;

  private graphics: Graphics;
  private glowGraphics: Graphics;
  private options: SpikeOptions;
  private pathIndex = 0;
  private currentPathT = 0;

  constructor(physics: PhysicsWorld, parent: Container, options: SpikeOptions) {
    this.id = options.id;
    this.options = options;
    this.size = options.size || 16;
    this.color = options.color || 0xff2244;

    const physPos = physics.toPhysicsVec({ x: options.x, y: options.y });
    this.body = physics.getWorld().createKinematicBody({
      position: physPos,
      angle: options.rotation || 0,
    });

    const half = physics.toPhysicsX(this.size);
    // Triangular spike fixture
    const p1 = planck.Vec2(0, -half * 1.2);
    const p2 = planck.Vec2(half, half * 0.8);
    const p3 = planck.Vec2(-half, half * 0.8);

    this.fixture = this.body.createFixture({
      shape: planck.Polygon([p1, p2, p3]),
      isSensor: false,
      friction: 0.0,
      restitution: 0.8,
    });
    this.fixture.setUserData({ type: 'spike', spike: this });

    this.view = new Container();
    this.glowGraphics = new Graphics();
    this.graphics = new Graphics();
    this.view.addChild(this.glowGraphics);
    this.view.addChild(this.graphics);
    parent.addChild(this.view);

    this.render();
  }

  private render(): void {
    const s = this.size;

    // Glow
    this.glowGraphics.clear();
    this.glowGraphics
      .poly([0, -s * 1.2, s, s * 0.8, -s, s * 0.8])
      .stroke({ width: 8, color: this.color, alpha: 0.35, cap: 'round', join: 'round' });

    // Sharp neon body
    this.graphics.clear();
    this.graphics
      .poly([0, -s * 1.2, s, s * 0.8, -s, s * 0.8])
      .fill({ color: 0x22050b, alpha: 0.95 })
      .stroke({ width: 2.5, color: this.color, alpha: 1.0, cap: 'round', join: 'round' });

    // Danger highlight
    this.graphics
      .poly([0, -s * 0.8, s * 0.5, s * 0.5, -s * 0.5, s * 0.5])
      .fill({ color: 0xff4466, alpha: 0.7 });
  }

  public update(physics: PhysicsWorld, dt: number): void {
    // Rotation animation
    if (this.options.rotationSpeed) {
      const newAngle = this.body.getAngle() + this.options.rotationSpeed * dt;
      this.body.setAngle(newAngle);
    }

    // Path following
    if (this.options.movePath && this.options.movePath.length >= 2) {
      const speed = this.options.moveSpeed || 80;
      const path = this.options.movePath;
      const from = path[this.pathIndex];
      const to = path[(this.pathIndex + 1) % path.length];

      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      if (dist > 0.01) {
        this.currentPathT += (speed * dt) / dist;
        if (this.currentPathT >= 1.0) {
          this.currentPathT = 0;
          this.pathIndex = (this.pathIndex + 1) % path.length;
        }

        const nextFrom = path[this.pathIndex];
        const nextTo = path[(this.pathIndex + 1) % path.length];
        const targetX = nextFrom.x + (nextTo.x - nextFrom.x) * this.currentPathT;
        const targetY = nextFrom.y + (nextTo.y - nextFrom.y) * this.currentPathT;

        const physVec = physics.toPhysicsVec({ x: targetX, y: targetY });
        this.body.setPosition(physVec);
      }
    }

    const pos = physics.toRenderVec(this.body.getPosition());
    this.view.x = pos.x;
    this.view.y = pos.y;
    this.view.rotation = this.body.getAngle();
  }

  public destroy(physics: PhysicsWorld): void {
    if (this.view.parent) {
      this.view.parent.removeChild(this.view);
    }
    physics.destroyBody(this.body);
  }
}
