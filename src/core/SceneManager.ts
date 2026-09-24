import type { GameMode, LevelConfig, LevelResult } from '@/data/types';
import { Game } from './Game';
import { LevelRegistry } from '@/levels/levelRegistry';
import { generateDailyChallenge, getTodayDateKey } from '@/levels/dailyChallenge';
import { SaveManager } from './SaveManager';
import { MODES_DATA } from '@/data/modesData';

const MODES_ORDER: GameMode[] = ['orbit-leap', 'escape', 'neon-impact', 'neon-maze', 'evolution-spikes', 'neon-shatter'];

import { MainMenuView } from '@/ui/MainMenu';
import { ModeSelectView } from '@/ui/ModeSelect';
import { LevelSelectView } from '@/ui/LevelSelect';
import { GameplayHUDView } from '@/ui/GameplayHUD';
import { PauseModalView } from '@/ui/PauseModal';
import { ResultModalView } from '@/ui/ResultModal';
import { DailyChallengeModalView } from '@/ui/DailyChallengeModal';
import { CosmeticsModalView } from '@/ui/CosmeticsModal';
import { SettingsModalView } from '@/ui/SettingsModal';
import { OnboardingOverlay } from '@/ui/OnboardingOverlay';
import { PrivacyPolicyPage } from '@/ui/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from '@/ui/legal/TermsOfServicePage';
import { AboutPage } from '@/ui/legal/AboutPage';

export type AppScreen =
  | 'main-menu'
  | 'mode-select'
  | 'level-select'
  | 'gameplay'
  | 'daily-modal'
  | 'cosmetics'
  | 'settings'
  | 'privacy-policy'
  | 'terms-of-service'
  | 'about';

export class SceneManager {
  private uiContainer: HTMLElement;
  private canvasContainer: HTMLElement;
  private game: Game;

  // Views
  private mainMenu: MainMenuView;
  private modeSelect: ModeSelectView;
  private levelSelect: LevelSelectView;
  private hud: GameplayHUDView;
  private pauseModal: PauseModalView;
  private resultModal: ResultModalView;
  private dailyModal: DailyChallengeModalView;
  private cosmeticsModal: CosmeticsModalView;
  private settingsModal: SettingsModalView;
  private privacyPolicy: PrivacyPolicyPage;
  private termsOfService: TermsOfServicePage;
  private aboutPage: AboutPage;
  private onboarding: OnboardingOverlay;

  private currentScreen: AppScreen = 'main-menu';
  private activeMode: GameMode = 'escape';
  private activeLevelNumber = 1;
  private activeConfig: LevelConfig | null = null;
  private returnFromSettings: 'main-menu' | 'pause' = 'main-menu';
  private legalReturnScreen: 'settings' | 'about' = 'settings';

  constructor(canvasContainer: HTMLElement, uiContainer: HTMLElement) {
    this.canvasContainer = canvasContainer;
    this.uiContainer = uiContainer;

    this.game = new Game(this.canvasContainer, {
      onLevelCompleted: (res) => this.handleLevelCompleted(res),
      onLevelFailed: (res) => this.handleLevelFailed(res),
      onProgressUpdate: (prog) => {
        this.hud.updateProgress(prog, this.game.currentMode?.scoreSystem.getScore() || 0);
      },
    });

    // Initialize UI Views
    this.mainMenu = new MainMenuView(this.uiContainer, {
      onPlayClick: () => this.showScreen('mode-select'),
      onDailyClick: () => this.showScreen('daily-modal'),
      onEndlessClick: () => this.startEndlessMode('neon-impact'),
      onCosmeticsClick: () => this.showScreen('cosmetics'),
      onSettingsClick: () => this.openSettings('main-menu'),
    });

    this.modeSelect = new ModeSelectView(this.uiContainer, {
      onSelectMode: (mode) => {
        this.activeMode = mode;
        this.showScreen('level-select');
      },
      onBack: () => this.showScreen('main-menu'),
    });

    this.levelSelect = new LevelSelectView(this.uiContainer, {
      onSelectLevel: (mode, lvlNum) => {
        this.activeMode = mode;
        this.activeLevelNumber = lvlNum;
        this.startLevel(mode, lvlNum);
      },
      onBack: () => this.showScreen('mode-select'),
    });

    this.hud = new GameplayHUDView(this.uiContainer, {
      onPauseClick: () => {
        this.game.pause();
        this.pauseModal.show(this.activeConfig?.name || 'SatisfyBall');
      },
      onQuickRestartClick: () => {
        this.restartLevel();
      },
    });

    this.pauseModal = new PauseModalView(this.uiContainer, {
      onResume: () => {
        this.pauseModal.hide();
        this.game.resume();
      },
      onRestart: () => {
        this.pauseModal.hide();
        this.restartLevel();
      },
      onSettings: () => {
        this.openSettings('pause');
      },
      onQuit: () => {
        this.pauseModal.hide();
        this.hud.hide();
        this.showScreen('level-select');
      },
    });

    this.resultModal = new ResultModalView(this.uiContainer, {
      onRetry: () => {
        this.resultModal.hide();
        this.restartLevel();
      },
      onNext: () => {
        this.resultModal.hide();
        this.nextLevel();
      },
      onNextMode: () => {
        this.resultModal.hide();
        this.nextMode();
      },
      onMenu: () => {
        this.resultModal.hide();
        this.hud.hide();
        if (this.activeConfig?.id.startsWith('endless')) {
          this.showScreen('main-menu');
        } else {
          this.showScreen('level-select');
        }
      },
    });

    this.dailyModal = new DailyChallengeModalView(this.uiContainer, {
      onStartChallenge: (dateKey) => {
        this.dailyModal.hide();
        const challenge = generateDailyChallenge(dateKey);
        this.activeConfig = challenge;
        this.startConfig(challenge);
      },
      onBack: () => this.showScreen('main-menu'),
    });

    this.cosmeticsModal = new CosmeticsModalView(this.uiContainer, {
      onBack: () => this.showScreen('main-menu'),
    });

    this.settingsModal = new SettingsModalView(this.uiContainer, {
      onBack: () => {
        this.closeSettings();
      },
      onPrivacyPolicy: () => this.openPrivacyPolicy('settings'),
      onTermsOfService: () => this.openTermsOfService('settings'),
      onAbout: () => this.openAbout('settings'),
    });

    this.privacyPolicy = new PrivacyPolicyPage(this.uiContainer, {
      onBack: () => {
        this.showScreen(this.legalReturnScreen);
      },
    });

    this.termsOfService = new TermsOfServicePage(this.uiContainer, {
      onBack: () => {
        this.showScreen(this.legalReturnScreen);
      },
    });

    this.aboutPage = new AboutPage(this.uiContainer, {
      onBack: () => {
        this.showScreen('settings');
      },
      onPrivacyPolicy: () => this.openPrivacyPolicy('about'),
      onTermsOfService: () => this.openTermsOfService('about'),
    });

    this.onboarding = new OnboardingOverlay(this.uiContainer);
  }

  public async init(): Promise<void> {
    await this.game.init();
    this.showScreen('main-menu');
  }

  public openSettings(from: 'main-menu' | 'pause'): void {
    this.returnFromSettings = from;
    this.hideAllScreens();
    this.hud.hide();
    this.currentScreen = 'settings';
    this.settingsModal.show();
  }

  public closeSettings(): void {
    if (this.returnFromSettings === 'pause') {
      this.hideAllScreens();
      this.currentScreen = 'gameplay';
      if (this.activeConfig) {
        this.hud.show(this.activeConfig);
        this.pauseModal.show(this.activeConfig.name || 'SatisfyBall');
      } else {
        this.showScreen('main-menu');
      }
    } else {
      this.showScreen('main-menu');
    }
  }

  public openPrivacyPolicy(from: 'settings' | 'about'): void {
    this.legalReturnScreen = from;
    this.hideAllScreens();
    this.currentScreen = 'privacy-policy';
    this.privacyPolicy.show();
  }

  public openTermsOfService(from: 'settings' | 'about'): void {
    this.legalReturnScreen = from;
    this.hideAllScreens();
    this.currentScreen = 'terms-of-service';
    this.termsOfService.show();
  }

  public openAbout(from: 'settings' = 'settings'): void {
    this.legalReturnScreen = from;
    this.hideAllScreens();
    this.currentScreen = 'about';
    this.aboutPage.show();
  }

  public handleBack(): boolean {
    if (this.currentScreen === 'privacy-policy' || this.currentScreen === 'terms-of-service') {
      this.showScreen(this.legalReturnScreen);
      return true;
    }
    if (this.currentScreen === 'about') {
      this.showScreen('settings');
      return true;
    }
    if (this.currentScreen === 'settings') {
      this.closeSettings();
      return true;
    }
    if (this.currentScreen === 'cosmetics' || this.currentScreen === 'daily-modal') {
      this.showScreen('main-menu');
      return true;
    }
    if (this.currentScreen === 'level-select') {
      this.showScreen('mode-select');
      return true;
    }
    if (this.currentScreen === 'mode-select') {
      this.showScreen('main-menu');
      return true;
    }
    return false;
  }

  public showScreen(screen: AppScreen): void {
    this.currentScreen = screen;
    this.hideAllScreens();

    const isLegalOrSettings =
      screen === 'settings' ||
      screen === 'privacy-policy' ||
      screen === 'terms-of-service' ||
      screen === 'about';

    if (screen !== 'gameplay' && !isLegalOrSettings) {
      this.hud.hide();
      this.game.clearLevel();
    }

    switch (screen) {
      case 'main-menu':
        this.mainMenu.show();
        break;
      case 'mode-select':
        this.modeSelect.show();
        break;
      case 'level-select':
        this.levelSelect.show(this.activeMode);
        break;
      case 'daily-modal':
        this.dailyModal.show();
        break;
      case 'cosmetics':
        this.cosmeticsModal.show();
        break;
      case 'settings':
        this.settingsModal.show();
        break;
      case 'privacy-policy':
        this.privacyPolicy.show();
        break;
      case 'terms-of-service':
        this.termsOfService.show();
        break;
      case 'about':
        this.aboutPage.show();
        break;
      case 'gameplay':
        // Gameplay uses HUD
        break;
    }
  }

  private hideAllScreens(): void {
    this.mainMenu.hide();
    this.modeSelect.hide();
    this.levelSelect.hide();
    this.dailyModal.hide();
    this.cosmeticsModal.hide();
    this.settingsModal.hide();
    this.privacyPolicy.hide();
    this.termsOfService.hide();
    this.aboutPage.hide();
    this.pauseModal.hide();
    this.resultModal.hide();
  }

  public startLevel(mode: GameMode, levelNumber: number): void {
    const config = LevelRegistry.getLevel(mode, levelNumber);
    if (!config) return;
    this.activeMode = mode;
    this.activeLevelNumber = levelNumber;
    this.activeConfig = config;
    this.startConfig(config);
  }

  public startEndlessMode(mode: 'neon-impact' | 'evolution-spikes'): void {
    const config = LevelRegistry.getEndlessConfig(mode);
    this.activeConfig = config;
    this.startConfig(config);
  }

  private startConfig(config: LevelConfig): void {
    this.hideAllScreens();
    this.currentScreen = 'gameplay';
    this.hud.show(config);
    this.game.loadLevel(config);
    this.onboarding.showIfFirstTime();
  }

  private restartLevel(): void {
    if (this.activeConfig) {
      this.hud.show(this.activeConfig);
      this.game.restartCurrentLevel();
    }
  }

  private nextMode(): void {
    const currentModeIndex = MODES_ORDER.indexOf(this.activeMode);
    const nextModeIndex = (currentModeIndex + 1) % MODES_ORDER.length;
    const nextModeId = MODES_ORDER[nextModeIndex];
    this.startLevel(nextModeId, 1);
  }

  private nextLevel(): void {
    if (this.activeConfig && this.activeConfig.id.startsWith('daily_')) {
      this.showScreen('main-menu');
      return;
    }

    const levels = LevelRegistry.getLevelsForMode(this.activeMode);
    const maxLevels = levels.length > 0 ? levels.length : 6;

    if (this.activeLevelNumber < maxLevels) {
      this.activeLevelNumber++;
      this.startLevel(this.activeMode, this.activeLevelNumber);
    } else {
      this.nextMode();
    }
  }

  private handleLevelCompleted(result: LevelResult): void {
    if (this.activeConfig?.id.startsWith('daily_')) {
      const todayKey = getTodayDateKey();
      SaveManager.getInstance().saveDailyChallenge(todayKey, result.score, result.starsEarned);
      this.resultModal.show(result, { hasNextLevel: false, nextMode: null });
      return;
    }

    const isEndless = Boolean(this.activeConfig?.id.startsWith('endless') || this.activeConfig?.levelNumber === 0);
    if (isEndless) {
      this.resultModal.show(result, { hasNextLevel: false, nextMode: null });
      return;
    }

    const levels = LevelRegistry.getLevelsForMode(this.activeMode);
    const maxLevels = levels.length > 0 ? levels.length : 6;
    const hasNextLevel = this.activeLevelNumber < maxLevels;

    const currentModeIndex = MODES_ORDER.indexOf(this.activeMode);
    const nextModeIndex = (currentModeIndex + 1) % MODES_ORDER.length;
    const nextModeId = MODES_ORDER[nextModeIndex];
    const nextModeInfo = MODES_DATA[nextModeId];

    this.resultModal.show(result, {
      hasNextLevel,
      nextMode: { id: nextModeId, title: nextModeInfo?.title || 'Next Mode' },
      modeCompleted: !hasNextLevel,
    });
  }

  private handleLevelFailed(result: LevelResult): void {
    this.resultModal.show(result, { hasNextLevel: false, nextMode: null });
  }
}
