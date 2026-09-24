import { Container, Graphics } from 'pixi.js';
import { SettingsManager } from '@/core/SettingsManager';

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface BallTrailData {
  ballId: string;
  color: number;
  type: 'line' | 'sparks' | 'plasma' | 'rainbow';
  points: TrailPoint[];
}

export class TrailSystem {
  private container: Container;
  private graphics: Graphics;
  private trails: Map<string, BallTrailData> = new Map();
  private maxPoints = 16;
  private minSpeedThreshold = 25; // px/s

  constructor(parent: Container) {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    parent.addChild(this.container);

    SettingsManager.getInstance().subscribe((settings) => {
      if (settings.qualityTier === 'low') {
        this.maxPoints = 6;
      } else if (settings.qualityTier === 'balanced') {
        this.maxPoints = 12;
      } else {
        this.maxPoints = 18;
      }
    });
  }

  public registerBall(ballId: string, color: number, type: 'line' | 'sparks' | 'plasma' | 'rainbow' = 'line'): void {
    this.trails.set(ballId, {
      ballId,
      color,
      type,
      points: [],
    });
  }

  public unregisterBall(ballId: string): void {
    this.trails.delete(ballId);
  }

  public addPoint(ballId: string, x: number, y: number, speed: number): void {
    const trail = this.trails.get(ballId);
    if (!trail) return;

    if (speed < this.minSpeedThreshold) {
      // Fade existing points if stationary
      return;
    }

    trail.points.unshift({ x, y, alpha: 1.0 });

    if (trail.points.length > this.maxPoints) {
      trail.points.pop();
    }
  }

  public update(dt: number): void {
    this.graphics.clear();
    const fadeRate = 3.5;

    for (const [, trail] of this.trails) {
      if (trail.points.length < 2) continue;

      // Update point alphas
      for (let i = 0; i < trail.points.length; i++) {
        trail.points[i].alpha = Math.max(0, trail.points[i].alpha - fadeRate * dt * (1 + i * 0.2));
      }

      // Filter dead points
      trail.points = trail.points.filter((p) => p.alpha > 0.05);

      if (trail.points.length < 2) continue;

      // Draw trail segments
      for (let i = 0; i < trail.points.length - 1; i++) {
        const p1 = trail.points[i];
        const p2 = trail.points[i + 1];
        const progress = i / trail.points.length;
        const width = Math.max(1, (1 - progress) * 8);
        const alpha = p1.alpha * (1 - progress * 0.6) * 0.65;

        let segColor = trail.color;
        if (trail.type === 'rainbow') {
          // Dynamic rainbow hue
          const hue = (performance.now() * 0.0018 + i * 0.1) % 1;
          segColor = this.hslToHex(hue, 1, 0.55);
        } else if (trail.type === 'plasma') {
          segColor = i % 2 === 0 ? 0xff007f : 0x00f0ff;
        } else if (trail.type === 'sparks') {
          segColor = i % 2 === 0 ? 0xffe000 : (trail.color || 0x00f0ff);
        }

        if (trail.type === 'sparks') {
          // Stardust sparks with subtle organic dispersion
          const jitterX = Math.sin(i * 4.2 + performance.now() * 0.01) * 3;
          const jitterY = Math.cos(i * 3.8 + performance.now() * 0.01) * 3;
          this.graphics
            .circle(p1.x + jitterX, p1.y + jitterY, Math.max(1.8, width * 0.45))
            .fill({ color: segColor, alpha: alpha * 1.1 });
        } else {
          this.graphics
            .moveTo(p1.x, p1.y)
            .lineTo(p2.x, p2.y)
            .stroke({ width, color: segColor, alpha, cap: 'round', join: 'round' });
        }
      }
    }
  }

  public clear(): void {
    this.trails.clear();
    this.graphics.clear();
  }

  private hslToHex(h: number, s: number, l: number): number {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return ((Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + Math.round(b * 255));
  }
}
