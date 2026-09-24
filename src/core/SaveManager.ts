import type { CosmeticsState, GameMode, LevelResult, SaveData, UserSettings } from '@/data/types';
import { APP_CONFIG } from '@/app/config';
import { COSMETICS_DATA } from '@/data/cosmeticsData';

const DB_NAME = 'SatisfyBallDB';
const DB_VERSION = 1;
const STORE_NAME = 'save_state';
const SAVE_KEY = 'current_profile';
const LOCAL_STORAGE_BACKUP_KEY = 'satisfyball_save_v1';

export class SaveManager {
  private static instance: SaveManager;
  private currentData: SaveData;
  private isInitialized = false;

  private constructor() {
    this.currentData = this.createDefaultSaveData();
  }

  public static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  public createDefaultSaveData(): SaveData {
    return {
      version: 1,
      totalStars: 0,
      completedLevels: {},
      unlockedModes: ['escape', 'neon-maze', 'neon-impact', 'evolution-spikes', 'neon-shatter', 'orbit-leap'],
      cosmetics: {
        selectedBallSkin: 'skin_neon_pulse',
        selectedTrail: 'trail_default',
        selectedImpactEffect: 'impact_ring',
        selectedArenaTheme: 'theme_void',
        unlockedSkins: ['skin_neon_pulse'],
        unlockedTrails: ['trail_default', 'trail_sparks', 'trail_pulse'],
        unlockedEffects: ['impact_ring', 'impact_sparks', 'impact_ripple'],
        unlockedThemes: ['theme_void', 'theme_grid', 'theme_nebula'],
      },
      settings: { ...APP_CONFIG.DEFAULT_SETTINGS },
      dailyChallengeHistory: {},
      firstTimeOnboardingDone: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  public async init(): Promise<SaveData> {
    if (this.isInitialized) return this.currentData;

    try {
      // Try loading from IndexedDB first
      const idbData = await this.loadFromIndexedDB();
      if (idbData) {
        this.currentData = this.migrate(idbData);
        this.isInitialized = true;
        return this.currentData;
      }

      // Fallback to LocalStorage
      const localData = this.loadFromLocalStorage();
      if (localData) {
        this.currentData = this.migrate(localData);
        await this.saveToIndexedDB(this.currentData);
        this.isInitialized = true;
        return this.currentData;
      }

      // First run: save defaults
      this.currentData = this.createDefaultSaveData();
      await this.save();
      this.isInitialized = true;
      return this.currentData;
    } catch (e) {
      console.warn('[SaveManager] Failed to init IndexedDB, falling back to LocalStorage:', e);
      const localData = this.loadFromLocalStorage();
      this.currentData = localData ? this.migrate(localData) : this.createDefaultSaveData();
      this.isInitialized = true;
      return this.currentData;
    }
  }

  public getData(): SaveData {
    return this.currentData;
  }

  public async save(): Promise<void> {
    this.currentData.updatedAt = Date.now();
    this.calculateTotalStars();
    this.checkCosmeticUnlocks();

    try {
      await this.saveToIndexedDB(this.currentData);
    } catch (e) {
      console.warn('[SaveManager] IndexedDB save failed:', e);
    }

    try {
      this.saveToLocalStorage(this.currentData);
    } catch (e) {
      console.error('[SaveManager] LocalStorage save failed:', e);
    }
  }

  public async saveLevelResult(levelId: string, result: LevelResult): Promise<void> {
    const existing = this.currentData.completedLevels[levelId];
    const prevStars = existing?.stars || 0;
    const prevBestScore = existing?.bestScore || 0;
    const prevBestTime = existing?.bestTime || 999999;

    this.currentData.completedLevels[levelId] = {
      stars: Math.max(prevStars, result.starsEarned),
      bestScore: Math.max(prevBestScore, result.score),
      bestTime: Math.min(prevBestTime, result.timeSeconds),
      attempts: (existing?.attempts || 0) + result.attemptsUsed,
      completedAt: Date.now(),
    };

    await this.save();
  }

  public async saveDailyChallenge(dateKey: string, score: number, stars: number): Promise<void> {
    this.currentData.dailyChallengeHistory[dateKey] = {
      completed: true,
      score,
      stars,
    };
    await this.save();
  }

  public async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    this.currentData.settings = {
      ...this.currentData.settings,
      ...settings,
    };
    await this.save();
  }

  public async updateCosmetics(cosmetics: Partial<CosmeticsState>): Promise<void> {
    this.currentData.cosmetics = {
      ...this.currentData.cosmetics,
      ...cosmetics,
    };
    await this.save();
  }

  public async setOnboardingDone(): Promise<void> {
    this.currentData.firstTimeOnboardingDone = true;
    await this.save();
  }

  public async resetProgress(): Promise<void> {
    const currentSettings = { ...this.currentData.settings };
    this.currentData = this.createDefaultSaveData();
    this.currentData.settings = currentSettings;
    await this.save();
  }

  public isLevelUnlocked(mode: GameMode, levelNumber: number): boolean {
    if (levelNumber === 1) return true;
    const prevLevelId = `${mode}_${levelNumber - 1}`;
    const record = this.currentData.completedLevels[prevLevelId];
    return !!record && record.stars > 0;
  }

  public getStarsForMode(mode: GameMode): number {
    let stars = 0;
    const prefix = `${mode}_`;
    for (const key in this.currentData.completedLevels) {
      if (key.startsWith(prefix)) {
        stars += this.currentData.completedLevels[key].stars;
      }
    }
    return stars;
  }

  private calculateTotalStars(): void {
    let total = 0;
    for (const key in this.currentData.completedLevels) {
      total += this.currentData.completedLevels[key].stars;
    }
    this.currentData.totalStars = total;
  }

  private checkCosmeticUnlocks(): void {
    const stars = this.currentData.totalStars;
    const cos = this.currentData.cosmetics;

    // Ensure all default items are always unlocked
    COSMETICS_DATA.skins.filter((s) => s.unlockedByDefault).forEach((s) => {
      if (!cos.unlockedSkins.includes(s.id)) cos.unlockedSkins.push(s.id);
    });
    COSMETICS_DATA.trails.filter((t) => t.unlockedByDefault).forEach((t) => {
      if (!cos.unlockedTrails.includes(t.id)) cos.unlockedTrails.push(t.id);
    });
    COSMETICS_DATA.impacts.filter((i) => i.unlockedByDefault).forEach((i) => {
      if (!cos.unlockedEffects.includes(i.id)) cos.unlockedEffects.push(i.id);
    });
    COSMETICS_DATA.themes.filter((th) => th.unlockedByDefault).forEach((th) => {
      if (!cos.unlockedThemes.includes(th.id)) cos.unlockedThemes.push(th.id);
    });

    // Star-based unlocks for skins
    COSMETICS_DATA.skins.forEach((s) => {
      if (s.starsRequired && stars >= s.starsRequired && !cos.unlockedSkins.includes(s.id)) {
        cos.unlockedSkins.push(s.id);
      }
    });

    // Star-based unlocks for trails
    COSMETICS_DATA.trails.forEach((t) => {
      if (t.starsRequired && stars >= t.starsRequired && !cos.unlockedTrails.includes(t.id)) {
        cos.unlockedTrails.push(t.id);
      }
    });

    // Star-based unlocks for impacts
    COSMETICS_DATA.impacts.forEach((i) => {
      if (i.starsRequired && stars >= i.starsRequired && !cos.unlockedEffects.includes(i.id)) {
        cos.unlockedEffects.push(i.id);
      }
    });

    // Star-based unlocks for themes
    COSMETICS_DATA.themes.forEach((th) => {
      if (th.starsRequired && stars >= th.starsRequired && !cos.unlockedThemes.includes(th.id)) {
        cos.unlockedThemes.push(th.id);
      }
    });
  }

  private migrate(loadedData: Partial<SaveData>): SaveData {
    const defaults = this.createDefaultSaveData();
    return {
      ...defaults,
      ...loadedData,
      unlockedModes: Array.from(
        new Set([
          ...defaults.unlockedModes,
          ...(loadedData.unlockedModes || []).map((m: any) => (m === 'marble-escape' ? 'orbit-leap' : m)),
        ])
      ) as GameMode[],
      cosmetics: {
        ...defaults.cosmetics,
        ...(loadedData.cosmetics || {}),
        unlockedSkins: Array.from(new Set([...defaults.cosmetics.unlockedSkins, ...(loadedData.cosmetics?.unlockedSkins || [])])),
        unlockedTrails: Array.from(new Set([...defaults.cosmetics.unlockedTrails, ...(loadedData.cosmetics?.unlockedTrails || [])])),
        unlockedEffects: Array.from(new Set([...defaults.cosmetics.unlockedEffects, ...(loadedData.cosmetics?.unlockedEffects || [])])),
        unlockedThemes: Array.from(new Set([...defaults.cosmetics.unlockedThemes, ...(loadedData.cosmetics?.unlockedThemes || [])])),
      },
      settings: {
        ...defaults.settings,
        ...(loadedData.settings || {}),
      },
      completedLevels: {
        ...(loadedData.completedLevels || {}),
      },
      dailyChallengeHistory: {
        ...(loadedData.dailyChallengeHistory || {}),
      },
    };
  }

  private loadFromLocalStorage(): SaveData | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignored
    }
    return null;
  }

  private saveToLocalStorage(data: SaveData): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(data));
    } catch {
      // Ignored
    }
  }

  private async loadFromIndexedDB(): Promise<SaveData | null> {
    if (typeof indexedDB === 'undefined') return null;

    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(SAVE_KEY);

        getReq.onsuccess = () => {
          resolve(getReq.result || null);
        };
        getReq.onerror = () => resolve(null);
      };

      request.onerror = () => resolve(null);
    });
  }

  private async saveToIndexedDB(data: SaveData): Promise<void> {
    if (typeof indexedDB === 'undefined') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const putReq = store.put(data, SAVE_KEY);

        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };

      request.onerror = () => reject(request.error);
    });
  }
}
