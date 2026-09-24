import { App as CapApp } from '@capacitor/app';
import { SaveManager } from '@/core/SaveManager';
import { SceneManager } from '@/core/SceneManager';
import { AudioManager } from '@/core/AudioManager';

export class App {
  private sceneManager!: SceneManager;

  public async start(): Promise<void> {
    try {
      // 1. Initialize Save Data & Profile
      await SaveManager.getInstance().init();

      // 2. Locate DOM Containers
      const canvasContainer = document.getElementById('game-canvas-container');
      const uiContainer = document.getElementById('ui-container');

      if (!canvasContainer || !uiContainer) {
        throw new Error('Required DOM containers (#game-canvas-container, #ui-container) not found in DOM.');
      }

      // 3. Initialize Scene & Game Coordinator
      this.sceneManager = new SceneManager(canvasContainer, uiContainer);
      await this.sceneManager.init();

      // 4. Register Native Lifecycle Handlers
      this.setupLifecycle();

      console.log('[SatisfyBall] Bootstrapped successfully in production mode.');
    } catch (e) {
      console.error('[SatisfyBall] Failed to bootstrap game:', e);
      this.showFallbackError(e);
    }
  }

  private setupLifecycle(): void {
    try {
      CapApp.addListener('appStateChange', (state) => {
        if (!state.isActive) {
          console.log('[SatisfyBall] App backgrounded - pausing physics and audio');
        } else {
          console.log('[SatisfyBall] App foregrounded - resuming safely');
        }
      });

      CapApp.addListener('backButton', () => {
        const handled = this.sceneManager.handleBack();
        if (!handled) {
          CapApp.exitApp();
        }
      });
    } catch {
      // Running on web without Capacitor native bridge
    }

    // Web Escape key listener for desktop/browser testing
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.sceneManager.handleBack();
      }
    });

    // Web visibility change fallback
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Mute/pause
      } else {
        AudioManager.getInstance().unlock();
      }
    });
  }

  private showFallbackError(error: unknown): void {
    console.error('[SatisfyBall] Boot fallback error:', error);
    const uiContainer = document.getElementById('ui-container');
    if (uiContainer) {
      uiContainer.innerHTML = `
        <div class="modal-overlay">
          <div class="modal-content" style="border-color: #ff2244;">
            <h2 class="neon-title" style="color: #ff2244;">BOOT ERROR</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 12px 0;">
              SatisfyBall encountered an initialization issue.
            </p>
            <button onclick="window.location.reload()" class="btn-primary" style="margin-top: 10px;">
              RELOAD GAME
            </button>
          </div>
        </div>
      `;
    }
  }
}
