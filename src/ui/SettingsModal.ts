import { SettingsManager } from '@/core/SettingsManager';
import { SaveManager } from '@/core/SaveManager';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';
import type { QualityTier } from '@/data/types';

export interface SettingsModalCallbacks {
  onBack: () => void;
  onPrivacyPolicy?: () => void;
  onTermsOfService?: () => void;
  onAbout?: () => void;
}

export class SettingsModalView {
  private container: HTMLElement;
  private callbacks: SettingsModalCallbacks;
  private element: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: SettingsModalCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public show(): void {
    this.hide();

    const sm = SettingsManager.getInstance();
    const s = sm.getSettings();

    this.element = document.createElement('div');
    this.element.className = 'screen';
    this.element.innerHTML = `
      <div class="top-bar">
        <button id="btn-settings-back" class="btn-icon" aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div class="top-bar-title">SETTINGS</div>
        <div style="width: 46px;"></div>
      </div>

      <div class="settings-list">
        <!-- SFX Volume -->
        <div class="setting-item">
          <div>
            <div style="font-weight: 700;">SFX Volume</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Sound effects & collision chimes</div>
          </div>
          <input type="range" id="range-sfx" min="0" max="1" step="0.05" value="${s.sfxVolume}" style="width: 110px; accent-color: var(--neon-cyan);">
        </div>

        <!-- Graphics Quality -->
        <div class="setting-item" style="flex-direction: column; align-items: flex-start; gap: 10px;">
          <div>
            <div style="font-weight: 700;">Graphics Quality</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Particle density and glow fidelity</div>
          </div>
          <div style="display: flex; gap: 8px; width: 100%;">
            <button class="quality-btn ${s.qualityTier === 'high' ? 'active' : ''}" data-quality="high">HIGH</button>
            <button class="quality-btn ${s.qualityTier === 'balanced' ? 'active' : ''}" data-quality="balanced">BALANCED</button>
            <button class="quality-btn ${s.qualityTier === 'low' ? 'active' : ''}" data-quality="low">LOW</button>
          </div>
        </div>

        <!-- Reset Progress -->
        <div class="setting-item" style="border-color: rgba(255, 34, 68, 0.3);">
          <div>
            <div style="font-weight: 700; color: #ff2244;">Reset Game Data</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Clear all stars and unlocked skins</div>
          </div>
          <button id="btn-reset-data" class="btn-secondary" style="color: #ff2244; padding: 6px 12px; font-size: 0.75rem; border-color: rgba(255, 34, 68, 0.4);">
            RESET
          </button>
        </div>

        <!-- Legal Section -->
        <div style="margin-top: 10px; margin-bottom: 2px; font-family: var(--font-display); font-size: 0.8rem; font-weight: 800; letter-spacing: 1.5px; color: var(--neon-cyan);">
          LEGAL
        </div>

        <div class="setting-item clickable-setting" id="btn-settings-privacy">
          <div>
            <div style="font-weight: 700;">Privacy Policy</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Offline privacy and local storage details</div>
          </div>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>

        <div class="setting-item clickable-setting" id="btn-settings-terms">
          <div>
            <div style="font-weight: 700;">Terms of Service</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Rules, rights, and usage terms</div>
          </div>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>

        <div class="setting-item clickable-setting" id="btn-settings-about">
          <div>
            <div style="font-weight: 700;">About SatisfyBall</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Version, licenses, and architecture</div>
          </div>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>

      <div style="text-align: center; font-size: 0.75rem; color: var(--text-muted); margin-top: 20px; padding-bottom: calc(var(--safe-bottom) + 40px); line-height: 1.5;">
        SatisfyBall &bull; Built with TypeScript, PixiJS, Planck.js & Capacitor<br/>
        Deterministic 2D Mobile Game Architecture
      </div>
    `;

    // Quality buttons style
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .quality-btn {
        flex: 1;
        padding: 8px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid var(--border-glass);
        color: var(--text-secondary);
        font-family: var(--font-display);
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
      }
      .quality-btn.active {
        background: var(--neon-cyan);
        color: #07070c;
        border-color: var(--neon-cyan);
      }
    `;
    this.element.appendChild(styleEl);

    this.container.appendChild(this.element);

    // Event handlers
    this.element.querySelector('#btn-settings-back')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onBack();
    });

    const sfxRange = this.element.querySelector('#range-sfx') as HTMLInputElement;
    sfxRange?.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      sm.setSfxVolume(val);
    });

    this.element.querySelectorAll('.quality-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const q = (btn as HTMLElement).dataset.quality as QualityTier;
        await sm.setQualityTier(q);
        AudioManager.getInstance().playUIClick();
        HapticsManager.getInstance().selection();
        this.show();
      });
    });

    this.element.querySelector('#btn-reset-data')?.addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset all game stars and unlocks? This cannot be undone.')) {
        await SaveManager.getInstance().resetProgress();
        AudioManager.getInstance().playSpikeHit();
        HapticsManager.getInstance().heavyImpact();
        this.show();
      }
    });

    // Legal handlers
    this.element.querySelector('#btn-settings-privacy')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onPrivacyPolicy?.();
    });

    this.element.querySelector('#btn-settings-terms')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onTermsOfService?.();
    });

    this.element.querySelector('#btn-settings-about')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onAbout?.();
    });
  }

  public hide(): void {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
      this.element = null;
    }
  }
}
