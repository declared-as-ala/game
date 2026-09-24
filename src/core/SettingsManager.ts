import type { QualityTier, UserSettings } from '@/data/types';
import { SaveManager } from './SaveManager';

export class SettingsManager {
  private static instance: SettingsManager;
  private settings: UserSettings;
  private listeners: Array<(settings: UserSettings) => void> = [];

  private constructor() {
    this.settings = SaveManager.getInstance().getData().settings;
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  public getSettings(): UserSettings {
    return { ...this.settings };
  }

  public async updateSettings(updates: Partial<UserSettings>): Promise<void> {
    this.settings = { ...this.settings, ...updates };
    await SaveManager.getInstance().updateSettings(updates);
    this.notify();
  }

  public async setMasterVolume(vol: number): Promise<void> {
    await this.updateSettings({ masterVolume: Math.max(0, Math.min(1, vol)) });
  }

  public async setSfxVolume(vol: number): Promise<void> {
    await this.updateSettings({ sfxVolume: Math.max(0, Math.min(1, vol)) });
  }

  public async setMusicVolume(vol: number): Promise<void> {
    await this.updateSettings({ musicVolume: Math.max(0, Math.min(1, vol)) });
  }

  public async setHapticsEnabled(enabled: boolean): Promise<void> {
    await this.updateSettings({ hapticsEnabled: enabled });
  }

  public async setScreenShakeEnabled(enabled: boolean): Promise<void> {
    await this.updateSettings({ screenShakeEnabled: enabled });
  }

  public async setSlowMotionEnabled(enabled: boolean): Promise<void> {
    await this.updateSettings({ slowMotionEnabled: enabled });
  }

  public async setQualityTier(tier: QualityTier): Promise<void> {
    await this.updateSettings({ qualityTier: tier });
  }

  public async setReducedMotion(reduced: boolean): Promise<void> {
    await this.updateSettings({ reducedMotion: reduced });
  }

  public subscribe(listener: (settings: UserSettings) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.settings);
    }
  }
}
