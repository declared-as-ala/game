import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { SettingsManager } from './SettingsManager';

export class HapticsManager {
  private static instance: HapticsManager;
  private isNativeSupported = false;

  private constructor() {
    this.checkNativeSupport();
  }

  public static getInstance(): HapticsManager {
    if (!HapticsManager.instance) {
      HapticsManager.instance = new HapticsManager();
    }
    return HapticsManager.instance;
  }

  private async checkNativeSupport(): Promise<void> {
    try {
      // In Capacitor native runtime, this resolves cleanly
      this.isNativeSupported = typeof window !== 'undefined' && (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() || false;
    } catch {
      this.isNativeSupported = false;
    }
  }

  private isEnabled(): boolean {
    return SettingsManager.getInstance().getSettings().hapticsEnabled;
  }

  public async selection(): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      if (this.isNativeSupported) {
        await Haptics.selectionStart();
      } else if (navigator.vibrate) {
        navigator.vibrate(8);
      }
    } catch {
      // Ignore vibration errors
    }
  }

  public async lightImpact(): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      if (this.isNativeSupported) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (navigator.vibrate) {
        navigator.vibrate(15);
      }
    } catch {
      // Ignore
    }
  }

  public async mediumImpact(): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      if (this.isNativeSupported) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    } catch {
      // Ignore
    }
  }

  public async heavyImpact(): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      if (this.isNativeSupported) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } else if (navigator.vibrate) {
        navigator.vibrate([40, 20, 50]);
      }
    } catch {
      // Ignore
    }
  }

  public async success(): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      if (this.isNativeSupported) {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (navigator.vibrate) {
        navigator.vibrate([20, 40, 30, 40, 50]);
      }
    } catch {
      // Ignore
    }
  }

  public async error(): Promise<void> {
    if (!this.isEnabled()) return;
    try {
      if (this.isNativeSupported) {
        await Haptics.notification({ type: NotificationType.Error });
      } else if (navigator.vibrate) {
        navigator.vibrate([60, 40, 80]);
      }
    } catch {
      // Ignore
    }
  }
}
