import type { Container } from 'pixi.js';

export class ScreenShake {
  private target: Container;
  private trauma = 0; // 0 to 1
  private maxOffset = 18; // Max shake in pixels
  private maxAngle = 0.04; // Max rotation in radians
  private decayRate = 2.5; // Trauma decay per second
  private time = 0;

  constructor(target: Container) {
    this.target = target;
  }

  public addTrauma(_amount: number): void {
    // Screen shake is disabled game-wide.
  }

  public update(dt: number): void {
    if (this.trauma <= 0) {
      this.target.x = 0;
      this.target.y = 0;
      this.target.rotation = 0;
      return;
    }

    this.time += dt * 35;
    // Shake is proportional to trauma squared for non-linear physical punch
    const shake = this.trauma * this.trauma;

    const offsetX = (Math.sin(this.time * 1.7) * 0.7 + Math.cos(this.time * 2.3) * 0.3) * this.maxOffset * shake;
    const offsetY = (Math.cos(this.time * 1.9) * 0.7 + Math.sin(this.time * 2.7) * 0.3) * this.maxOffset * shake;
    const angle = Math.sin(this.time * 1.3) * this.maxAngle * shake;

    this.target.x = offsetX;
    this.target.y = offsetY;
    this.target.rotation = angle;

    this.trauma = Math.max(0, this.trauma - this.decayRate * dt);
  }

  public reset(): void {
    this.trauma = 0;
    this.target.x = 0;
    this.target.y = 0;
    this.target.rotation = 0;
  }
}
