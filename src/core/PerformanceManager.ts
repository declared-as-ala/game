import { SettingsManager } from './SettingsManager';

export class PerformanceManager {
  private static instance: PerformanceManager;
  private fpsHistory: number[] = [];
  private lowFpsCounter = 0;

  private constructor() {}

  public static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  public recordFps(fps: number): void {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 10) {
      this.fpsHistory.shift();
    }

    if (fps < 40) {
      this.lowFpsCounter++;
      if (this.lowFpsCounter >= 5) {
        this.suggestLowerQuality();
        this.lowFpsCounter = 0;
      }
    } else {
      this.lowFpsCounter = Math.max(0, this.lowFpsCounter - 1);
    }
  }

  private suggestLowerQuality(): void {
    const current = SettingsManager.getInstance().getSettings().qualityTier;
    if (current === 'high') {
      console.log('[PerformanceManager] Automatically scaling quality to balanced');
      SettingsManager.getInstance().setQualityTier('balanced');
    } else if (current === 'balanced') {
      console.log('[PerformanceManager] Automatically scaling quality to low');
      SettingsManager.getInstance().setQualityTier('low');
    }
  }

  public getAverageFps(): number {
    if (this.fpsHistory.length === 0) return 60;
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return Math.round((sum / this.fpsHistory.length) * 10) / 10;
  }
}
