import { SaveManager } from '@/core/SaveManager';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';
import { SettingsManager } from '@/core/SettingsManager';
import { getTodayDateKey } from '@/levels/dailyChallenge';
import { COSMETICS_DATA } from '@/data/cosmeticsData';

export interface MainMenuCallbacks {
  onPlayClick: () => void;
  onDailyClick: () => void;
  onEndlessClick: () => void;
  onCosmeticsClick: () => void;
  onSettingsClick: () => void;
}

export class MainMenuView {
  private container: HTMLElement;
  private callbacks: MainMenuCallbacks;
  private element: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: MainMenuCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public show(): void {
    this.hide();

    const save = SaveManager.getInstance().getData();
    const totalStars = save.totalStars || 0;
    const maxStars = 36 * 3; // 108 total stars
    const starPercent = Math.min(100, Math.round((totalStars / maxStars) * 100));

    const todayKey = getTodayDateKey();
    const isDailyDone = !!save.dailyChallengeHistory[todayKey]?.completed;

    const currentSkinId = save.cosmetics?.selectedBallSkin || 'skin_neon_pulse';
    const currentSkin = COSMETICS_DATA.skins.find((s) => s.id === currentSkinId) || COSMETICS_DATA.skins[0];
    const skinName = `${currentSkin.name} (${currentSkin.sizeType.toUpperCase()})`;

    const settings = SettingsManager.getInstance().getSettings();
    const isMuted = settings.masterVolume === 0;

    this.element = document.createElement('div');
    this.element.className = 'screen screen-home';
    this.element.innerHTML = `
      <!-- Top HUD Header -->
      <div class="top-bar">
        <div class="hud-pill" style="gap: 8px; padding: 6px 14px;">
          <svg class="mini-star earned" viewBox="0 0 24 24" width="18" height="18">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <div style="display: flex; flex-direction: column; align-items: flex-start;">
            <span style="font-family: var(--font-display); font-size: 0.88rem; font-weight: 800; color: #ffffff;">${totalStars} <span style="font-size: 0.72rem; color: var(--text-muted);">/ ${maxStars}</span></span>
            <div style="width: 54px; height: 3px; background: rgba(255,255,255,0.15); border-radius: 2px; overflow: hidden; margin-top: 2px;">
              <div style="width: ${starPercent}%; height: 100%; background: var(--neon-gold); box-shadow: 0 0 6px #ffd700;"></div>
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="btn-quick-sound" class="btn-icon" aria-label="Toggle Sound" title="Toggle Sound">
            ${
              isMuted
                ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
                : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`
            }
          </button>
          <button id="btn-menu-settings" class="btn-icon" aria-label="Settings" title="Settings">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Hero Centerpiece: 3D Kinetic Neon Sphere Emblem & Title -->
      <div style="display: flex; flex-direction: column; align-items: center; margin: auto 0; text-align: center; max-width: 100%;">
        <div class="hero-emblem-wrapper">
          <div class="hero-ring hero-ring-3"></div>
          <div class="hero-ring hero-ring-2"></div>
          <div class="hero-ring hero-ring-1"></div>
          <div class="hero-orb"></div>
          <div class="hero-spark hero-spark-1"></div>
          <div class="hero-spark hero-spark-2"></div>
          <div class="hero-spark hero-spark-3"></div>
        </div>

        <div class="arcade-status-badge">
          <span class="status-dot-pulse"></span>
          <span>SEASON 1: NEON OVERDRIVE</span>
        </div>

        <h1 class="neon-title" style="font-size: clamp(1.75rem, 6.2vw, 2.3rem); margin: 0; line-height: 1.1; letter-spacing: clamp(1px, 0.6vw, 2.2px); white-space: nowrap;">SatisfyBall</h1>
        <p class="neon-subtitle" style="letter-spacing: 1.2px; font-size: 0.76rem; font-weight: 600; text-transform: uppercase; margin-top: 4px;">
          TACTILE NEON PHYSICS
        </p>
      </div>

      <!-- Action Grid -->
      <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 340px; margin: 0 auto;">
        <!-- Primary Action: Big Hero Play Button -->
        <button id="btn-menu-play" class="btn-hero-play" aria-label="Play Game">
          <div class="hero-play-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <polygon points="6 3 20 12 6 21 6 3"/>
            </svg>
          </div>
          <div class="hero-play-content">
            <div class="hero-play-title">PLAY GAME</div>
            <div class="hero-play-sub">36 LEVELS</div>
          </div>
          <div class="hero-play-arrow">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </button>

        <!-- Secondary Action Cards Grid -->
        <div class="home-cards-container">
          <!-- Daily Challenge Card -->
          <div id="btn-menu-daily" class="home-card-item gold-theme" role="button" tabindex="0">
            <div class="home-card-icon-pill" style="background: rgba(250, 204, 21, 0.15); color: #facc15;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div class="home-card-tag" style="color: #facc15;">
              ${isDailyDone ? 'COMPLETED ✓' : 'DAILY QUEST'}
            </div>
            <div class="home-card-title">DAILY CHALLENGE</div>
            <div class="home-card-desc">
              ${isDailyDone ? 'Done today! Next at 00:00' : 'Bonus +3 Stars'}
            </div>
          </div>

          <!-- Endless Mode Card -->
          <div id="btn-menu-endless" class="home-card-item magenta-theme" role="button" tabindex="0">
            <div class="home-card-icon-pill" style="background: rgba(255, 0, 127, 0.15); color: #ff007f;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div class="home-card-tag" style="color: #ff007f;">SURVIVAL</div>
            <div class="home-card-title">ENDLESS IMPACT</div>
            <div class="home-card-desc">Infinite Combo Attack</div>
          </div>

          <!-- Cosmetics Vault Card -->
          <div id="btn-menu-cosmetics" class="home-card-item violet-theme" role="button" tabindex="0">
            <div class="home-card-icon-pill" style="background: rgba(168, 85, 247, 0.15); color: #a855f7; margin-bottom: 0; margin-right: 10px; flex-shrink: 0;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
              </svg>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div class="home-card-tag" style="color: #a855f7;">SKINS & TRAILS</div>
              <div class="home-card-title" style="font-size: 0.88rem;">SKINS VAULT</div>
              <div class="home-card-desc" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                Active Skin: <span style="color: #ffffff; font-weight: 600;">${skinName}</span>
              </div>
            </div>
            <div style="color: #a855f7; padding-left: 6px;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Tagline & Version -->
      <div style="text-align: center; font-size: 0.68rem; color: var(--text-muted); margin-top: 6px; letter-spacing: 0.4px;">
        SatisfyBall v1.0.0 &bull; 36 Neon Sectors &bull; Box2D ASMR
      </div>
    `;

    this.container.appendChild(this.element);

    // Bind Button Click Handlers
    this.element.querySelector('#btn-menu-play')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onPlayClick();
    });

    this.element.querySelector('#btn-menu-daily')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onDailyClick();
    });

    this.element.querySelector('#btn-menu-endless')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onEndlessClick();
    });

    this.element.querySelector('#btn-menu-cosmetics')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onCosmeticsClick();
    });

    this.element.querySelector('#btn-menu-settings')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onSettingsClick();
    });

    // Quick sound toggle handler
    this.element.querySelector('#btn-quick-sound')?.addEventListener('click', () => {
      const sm = SettingsManager.getInstance();
      const current = sm.getSettings();
      const newVol = current.masterVolume === 0 ? 0.9 : 0;
      sm.setMasterVolume(newVol);
      HapticsManager.getInstance().selection();
      if (newVol > 0) {
        AudioManager.getInstance().playUIClick();
      }
      this.show(); // Refresh view state
    });
  }

  public hide(): void {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
      this.element = null;
    }
  }
}
