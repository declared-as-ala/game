import { Container, Graphics } from 'pixi.js';

export interface ShockwaveInstance {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: number;
  alpha: number;
  speed: number;
  active: boolean;
}

export class ShockwaveSystem {
  private container: Container;
  private graphics: Graphics;
  private shockwaves: ShockwaveInstance[] = [];
  private maxActive = 12;

  constructor(parent: Container) {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    parent.addChild(this.container);
  }

  public spawn(x: number, y: number, color = 0x00f0ff, maxRadius = 90, speed = 240): void {
    const wave = this.shockwaves.find((w) => !w.active);
    if (wave) {
      wave.x = x;
      wave.y = y;
      wave.radius = 4;
      wave.maxRadius = maxRadius;
      wave.color = color;
      wave.alpha = 0.9;
      wave.speed = speed;
      wave.active = true;
    } else if (this.shockwaves.length < this.maxActive) {
      this.shockwaves.push({
        x,
        y,
        radius: 4,
        maxRadius,
        color,
        alpha: 0.9,
        speed,
        active: true,
      });
    }
  }

  public update(dt: number): void {
    this.graphics.clear();
    let hasActive = false;

    for (const wave of this.shockwaves) {
      if (!wave.active) continue;

      wave.radius += wave.speed * dt;
      const progress = wave.radius / wave.maxRadius;
      wave.alpha = Math.max(0, 1 - progress);

      if (progress >= 1.0) {
        wave.active = false;
        continue;
      }

      hasActive = true;
      const strokeWidth = Math.max(1, 4 * (1 - progress * 0.7));

      // Draw shockwave ring
      this.graphics
        .circle(wave.x, wave.y, wave.radius)
        .stroke({ width: strokeWidth, color: wave.color, alpha: wave.alpha });
    }

    this.graphics.visible = hasActive;
  }

  public clear(): void {
    for (const wave of this.shockwaves) {
      wave.active = false;
    }
    this.graphics.clear();
  }
}
