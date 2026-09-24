import { Container, Graphics } from 'pixi.js';
import { APP_CONFIG } from '@/app/config';
import { SettingsManager } from '@/core/SettingsManager';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  initialSize: number;
  color: number;
  alpha: number;
  life: number;
  maxLife: number;
  drag: number;
  active: boolean;
}

export class ParticleSystem {
  private container: Container;
  private graphics: Graphics;
  private particles: Particle[] = [];
  private maxParticles: number;

  constructor(parent: Container) {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
    parent.addChild(this.container);

    this.maxParticles = APP_CONFIG.LIMITS.MAX_PARTICLES_HIGH;
    this.initPool();

    SettingsManager.getInstance().subscribe((settings) => {
      if (settings.qualityTier === 'low') {
        this.maxParticles = APP_CONFIG.LIMITS.MAX_PARTICLES_LOW;
      } else if (settings.qualityTier === 'balanced') {
        this.maxParticles = APP_CONFIG.LIMITS.MAX_PARTICLES_BALANCED;
      } else {
        this.maxParticles = APP_CONFIG.LIMITS.MAX_PARTICLES_HIGH;
      }
    });
  }

  private initPool(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 3,
        initialSize: 3,
        color: 0x00f0ff,
        alpha: 1,
        life: 0,
        maxLife: 1,
        drag: 0.96,
        active: false,
      });
    }
  }

  public emitBurst(
    x: number,
    y: number,
    color = 0x00f0ff,
    count = 16,
    speed = 180,
    life = 0.45,
    size = 4
  ): void {
    const quality = SettingsManager.getInstance().getSettings().qualityTier;
    const countMultiplier = quality === 'low' ? 0.35 : quality === 'balanced' ? 0.65 : 1.0;
    const actualCount = Math.max(3, Math.floor(count * countMultiplier));

    let spawned = 0;
    for (const p of this.particles) {
      if (spawned >= actualCount) break;
      if (p.active) continue;

      const angle = Math.random() * Math.PI * 2;
      const spd = (0.3 + Math.random() * 0.7) * speed;

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.size = size * (0.6 + Math.random() * 0.8);
      p.initialSize = p.size;
      p.color = color;
      p.alpha = 1.0;
      p.life = life * (0.7 + Math.random() * 0.6);
      p.maxLife = p.life;
      p.drag = 0.94;
      p.active = true;

      spawned++;
    }
  }

  public emitDirectionalSparks(
    x: number,
    y: number,
    normalX: number,
    normalY: number,
    color = 0x00f0ff,
    count = 12,
    speed = 220
  ): void {
    const baseAngle = Math.atan2(normalY, normalX);
    let spawned = 0;

    for (const p of this.particles) {
      if (spawned >= count) break;
      if (p.active) continue;

      const angle = baseAngle + (Math.random() - 0.5) * 1.6; // Spread within cone
      const spd = (0.4 + Math.random() * 0.6) * speed;

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.size = 3.5 * (0.5 + Math.random() * 0.8);
      p.initialSize = p.size;
      p.color = color;
      p.alpha = 1.0;
      p.life = 0.35 * (0.6 + Math.random() * 0.6);
      p.maxLife = p.life;
      p.drag = 0.92;
      p.active = true;

      spawned++;
    }
  }

  public update(dt: number): void {
    this.graphics.clear();
    let hasActive = false;

    for (const p of this.particles) {
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      hasActive = true;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const progress = 1 - p.life / p.maxLife;
      p.alpha = Math.max(0, 1 - progress);
      p.size = p.initialSize * (1 - progress * 0.7);

      // Render glowing particle
      this.graphics
        .circle(p.x, p.y, p.size)
        .fill({ color: p.color, alpha: p.alpha });
    }

    this.graphics.visible = hasActive;
  }

  public getActiveCount(): number {
    return this.particles.filter((p) => p.active).length;
  }

  public clear(): void {
    for (const p of this.particles) {
      p.active = false;
    }
    this.graphics.clear();
  }
}
