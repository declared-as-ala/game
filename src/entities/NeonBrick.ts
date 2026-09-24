import { Container, Graphics } from 'pixi.js';
import * as planck from 'planck';
import type { PhysicsWorld } from '@/core/PhysicsWorld';
import type { BrickConfig } from '@/data/types';

export class NeonBrick {
  public id: string;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public hp: number;
  public maxHp: number;
  public color: number;
  public isArmored: boolean;
  public isDestroyed = false;
  private isCleanedUp = false;

  public body: planck.Body;
  public fixture: planck.Fixture;
  public view: Container;
  private graphics: Graphics;
  private glowGraphics: Graphics;
  private flashTimer = 0;

  constructor(physics: PhysicsWorld, parent: Container, config: BrickConfig) {
    this.id = config.id;
    this.x = config.x;
    this.y = config.y;
    this.width = config.width;
    this.height = config.height;
    this.hp = config.hp || (config.isArmored ? 2 : 1);
    this.maxHp = this.hp;
    this.color = config.color || (config.isArmored ? 0xffe000 : 0x00f0ff);
    this.isArmored = !!config.isArmored;

    // 1. Planck RigidBody (Static Box)
    const physPos = physics.toPhysicsVec({ x: this.x, y: this.y });
    this.body = physics.getWorld().createBody({
      type: 'static',
      position: physPos,
    });

    const hx = physics.toPhysicsX(this.width / 2);
    const hy = physics.toPhysicsY(this.height / 2);
    this.fixture = this.body.createFixture({
      shape: planck.Box(hx, hy),
      friction: 0.0,
      restitution: 1.05,
    });
    this.fixture.setUserData({ type: 'brick', brick: this });

    // 2. Pixi Visuals
    this.view = new Container();
    this.view.x = this.x;
    this.view.y = this.y;

    this.glowGraphics = new Graphics();
    this.graphics = new Graphics();

    this.view.addChild(this.glowGraphics);
    this.view.addChild(this.graphics);
    parent.addChild(this.view);

    this.redraw();
  }

  public redraw(): void {
    const hw = this.width / 2;
    const hh = this.height / 2;
    const r = 4; // Rounded corner radius

    this.glowGraphics.clear();
    this.glowGraphics
      .roundRect(-hw - 4, -hh - 4, this.width + 8, this.height + 8, r + 2)
      .fill({ color: this.color, alpha: 0.22 });

    this.graphics.clear();
    const fillAlpha = this.hp === 1 ? 0.35 : 0.65;

    // Main Brick Body
    this.graphics
      .roundRect(-hw, -hh, this.width, this.height, r)
      .fill({ color: this.color, alpha: fillAlpha })
      .stroke({ width: this.isArmored ? 2.5 : 1.8, color: 0xffffff, alpha: 0.85 });

    // Inner shine bar
    this.graphics
      .roundRect(-hw + 3, -hh + 3, this.width - 6, (this.height - 6) * 0.45, 2)
      .fill({ color: 0xffffff, alpha: 0.25 });

    // Armored icon / pips if > 1 HP
    if (this.maxHp > 1) {
      const pipSize = 3;
      for (let i = 0; i < this.maxHp; i++) {
        const px = -((this.maxHp - 1) * 8) / 2 + i * 8;
        const isFilled = i < this.hp;
        this.graphics
          .circle(px, 0, pipSize)
          .fill({ color: isFilled ? 0xffffff : 0x444455, alpha: isFilled ? 0.9 : 0.4 });
      }
    }
  }

  public onHit(damage = 1): boolean {
    if (this.isDestroyed) return true;

    this.hp -= damage;
    this.flashTimer = 0.15;

    if (this.hp <= 0) {
      this.isDestroyed = true;
      return true; // Shattered!
    }

    this.redraw();
    return false;
  }

  public update(dt: number): void {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.redraw();
      } else {
        // Flash white
        const hw = this.width / 2;
        const hh = this.height / 2;
        this.graphics.clear();
        this.graphics
          .roundRect(-hw, -hh, this.width, this.height, 4)
          .fill({ color: 0xffffff, alpha: 0.9 });
      }
    }
  }

  public destroy(physics: PhysicsWorld): void {
    this.isDestroyed = true;
    if (this.isCleanedUp) return;
    this.isCleanedUp = true;

    if (this.fixture) {
      try {
        this.fixture.setUserData(null);
      } catch {}
    }

    if (this.view) {
      this.view.visible = false;
      if (this.view.parent) {
        this.view.parent.removeChild(this.view);
      }
      try {
        this.view.destroy({ children: true });
      } catch {}
    }

    if (this.body) {
      try {
        this.body.setUserData(null);
      } catch {}
      physics.destroyBody(this.body);
    }
  }
}
