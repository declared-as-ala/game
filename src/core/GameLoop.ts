import { APP_CONFIG } from '@/app/config';

export type UpdateCallback = (dt: number) => void;
export type RenderCallback = (interpolation: number) => void;

export class GameLoop {
  private isRunning = false;
  private lastTime = 0;
  private accumulator = 0;
  private fixedStep = APP_CONFIG.PHYSICS.TIME_STEP; // 1/60s
  private maxDelta = APP_CONFIG.PHYSICS.MAX_DELTA_TIME; // 0.1s

  private updateFn: UpdateCallback;
  private renderFn: RenderCallback;
  private animFrameId: number | null = null;

  // FPS Tracking
  private frameCount = 0;
  private fpsTimer = 0;
  public currentFps = 60;

  constructor(updateFn: UpdateCallback, renderFn: RenderCallback) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop = this.loop.bind(this);
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop(currentTime: number): void {
    if (!this.isRunning) return;

    let delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Clamp delta to prevent spiral of death
    if (delta > this.maxDelta) {
      delta = this.maxDelta;
    }

    // FPS Meter
    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 1.0) {
      this.currentFps = Math.round((this.frameCount / this.fpsTimer) * 10) / 10;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    this.accumulator += delta;

    // Fixed physics steps
    let subSteps = 0;
    while (this.accumulator >= this.fixedStep && subSteps < APP_CONFIG.PHYSICS.MAX_SUB_STEPS) {
      try {
        this.updateFn(this.fixedStep);
      } catch (err) {
        console.error('[GameLoop] Physics step exception:', err);
      }
      this.accumulator -= this.fixedStep;
      subSteps++;
    }

    // Render with interpolation factor
    try {
      const interpolation = this.accumulator / this.fixedStep;
      this.renderFn(interpolation);
    } catch (err) {
      console.error('[GameLoop] Render exception:', err);
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  }
}
