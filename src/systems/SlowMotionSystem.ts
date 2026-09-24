import { SettingsManager } from '@/core/SettingsManager';

export class SlowMotionSystem {
  private timeScale = 1.0;
  private targetScale = 1.0;
  private durationRemaining = 0;
  private recoverySpeed = 3.5;

  public triggerSlowMo(scale = 0.25, duration = 0.45): void {
    if (!SettingsManager.getInstance().getSettings().slowMotionEnabled) return;
    this.targetScale = scale;
    this.timeScale = scale;
    this.durationRemaining = duration;
  }

  public update(realDt: number): number {
    if (this.durationRemaining > 0) {
      this.durationRemaining -= realDt;
      if (this.durationRemaining <= 0) {
        this.targetScale = 1.0;
      }
    }

    if (this.timeScale < this.targetScale) {
      this.timeScale = Math.min(this.targetScale, this.timeScale + this.recoverySpeed * realDt);
    } else if (this.timeScale > this.targetScale) {
      this.timeScale = Math.max(this.targetScale, this.timeScale - this.recoverySpeed * realDt);
    }

    return this.timeScale;
  }

  public getTimeScale(): number {
    return this.timeScale;
  }

  public reset(): void {
    this.timeScale = 1.0;
    this.targetScale = 1.0;
    this.durationRemaining = 0;
  }
}
