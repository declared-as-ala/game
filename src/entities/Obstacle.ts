import { Container, Graphics } from 'pixi.js';
import * as planck from 'planck';
import type { PhysicsWorld } from '@/core/PhysicsWorld';
import type { Vector2D } from '@/data/types';

export interface ObstacleEntityOptions {
  id: string;
  type: 'moving-bar' | 'rotating-cross' | 'static-wall';
  x: number; // Pixels
  y: number;
  width?: number; // Pixels
  height?: number;
  radius?: number;
  rotation?: number;
  rotationSpeed?: number;
  movePath?: Vector2D[];
  moveSpeed?: number;
  color?: number;
}

export class Obstacle {
  public id: string;
  public type: 'moving-bar' | 'rotating-cross' | 'static-wall';
  public color: number;

  public body: planck.Body;
  public fixture: planck.Fixture;
  public view: Container;

  private graphics: Graphics;
  private glowGraphics: Graphics;
  private options: ObstacleEntityOptions;
  private pathIndex = 0;
  private currentPathT = 0;

  constructor(physics: PhysicsWorld, parent: Container, options: ObstacleEntityOptions) {
    this.id = options.id;
    this.type = options.type;
    this.options = options;
    this.color = options.color || 0x00f0ff;

    const physPos = physics.toPhysicsVec({ x: options.x, y: options.y });
    const isStatic = options.type === 'static-wall' && !options.rotationSpeed && !options.movePath;

    this.body = isStatic
      ? physics.getWorld().createBody({ position: physPos })
      : physics.getWorld().createKinematicBody({ position: physPos, angle: options.rotation || 0 });

    const w = options.width || 60;
    const h = options.height || 14;
    const physW = physics.toPhysicsX(w / 2);
    const physH = physics.toPhysicsY(h / 2);

    this.fixture = this.body.createFixture({
      shape: planck.Box(physW, physH),
      friction: 0.0,
      restitution: 0.98,
    });
    this.fixture.setUserData({ type: 'obstacle', obstacle: this });

    this.view = new Container();
    this.glowGraphics = new Graphics();
    this.graphics = new Graphics();
    this.view.addChild(this.glowGraphics);
    this.view.addChild(this.graphics);
    parent.addChild(this.view);

    this.render(w, h);
  }

  private render(w: number, h: number): void {
    const halfW = w / 2;
    const halfH = h / 2;

    this.glowGraphics.clear();
    this.glowGraphics
      .roundRect(-halfW, -halfH, w, h, 6)
      .stroke({ width: 8, color: this.color, alpha: 0.25 });

    this.graphics.clear();
    this.graphics
      .roundRect(-halfW, -halfH, w, h, 6)
      .fill({ color: 0x0c1222, alpha: 0.9 })
      .stroke({ width: 2.5, color: this.color, alpha: 0.95 });
  }

  public setRotationSpeed(speed: number): void {
    this.options.rotationSpeed = speed;
  }

  public update(physics: PhysicsWorld, dt: number): void {
    if (this.options.rotationSpeed) {
      const angle = this.body.getAngle() + this.options.rotationSpeed * dt;
      this.body.setAngle(angle);
    }

    if (this.options.movePath && this.options.movePath.length >= 2) {
      const speed = this.options.moveSpeed || 60;
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
