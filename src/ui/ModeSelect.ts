import type { GameMode } from '@/data/types';
import { MODES_DATA } from '@/data/modesData';
import { SaveManager } from '@/core/SaveManager';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';

export interface ModeSelectCallbacks {
  onSelectMode: (mode: GameMode) => void;
  onBack: () => void;
}

const MODE_CATEGORIES: Record<GameMode, string> = {
  escape: 'BOX2D ESCAPE',
  'neon-maze': 'ORBITAL GATES',
  'neon-impact': 'ASMR WEBS',
  'evolution-spikes': 'TIER ASCENSION',
  'neon-shatter': 'CRYSTAL DESTRUCTION',
  'orbit-leap': 'GRAVITY SLINGSHOT',
};

export class ModeSelectView {
  private container: HTMLElement;
  private callbacks: ModeSelectCallbacks;
  private element: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: ModeSelectCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public show(): void {
    this.hide();

    const save = SaveManager.getInstance();
    const modes: GameMode[] = ['orbit-leap', 'escape', 'neon-impact', 'neon-maze', 'evolution-spikes', 'neon-shatter'];
    const totalStars = save.getData().totalStars || 0;
    const maxGameStars = 36 * 3;

    this.element = document.createElement('div');
    this.element.className = 'screen screen-modes';

    const cardsHtml = modes
      .map((m, idx) => {
        const info = MODES_DATA[m];
        const stars = save.getStarsForMode(m);
        const maxStars = info.totalLevels * 3;
        const percent = Math.round((stars / maxStars) * 100);
        const categoryTag = MODE_CATEGORIES[m] || 'SECTOR';

        let statusClass = 'status-pill-ready';
        let statusText = 'READY';
        if (percent === 100) {
          statusClass = 'status-pill-mastered';
          statusText = '✨ MASTERED';
        } else if (stars > 0) {
          statusClass = 'status-pill-progress';
          statusText = `${percent}% DONE`;
        }

        const rgb = this.hexToRgb(info.colorHex);

        return `
          <div class="mode-card-pro"
               data-mode="${m}"
               style="--card-accent: ${info.colorHex}; --card-accent-glow: rgba(${rgb}, 0.35);${idx === 0 ? ' padding-top: 34px;' : ''}"
               role="button"
               tabindex="0">
            ${idx === 0 ? `<div class="mode-card-featured-badge">★ FEATURED</div>` : ''}
            <!-- Top Section with Icon & Title -->
            <div class="mode-card-top">
              <div class="mode-card-icon" style="background: rgba(${rgb}, 0.15); color: ${info.colorHex}; border: 1px solid rgba(${rgb}, 0.3);">
                ${info.iconSvg}
              </div>
              <div class="mode-card-title-group">
                <div class="mode-card-tag" style="color: ${info.colorHex};">${categoryTag}</div>
                <div class="mode-card-name">${info.title}</div>
                <div style="font-size: 0.72rem; color: var(--text-secondary);">${info.subtitle}</div>
              </div>
            </div>

            <!-- Tagline description -->
            <p class="mode-card-tagline">${info.tagline}</p>

            <!-- Progress Meter -->
            <div class="mode-progress-container">
              <div class="mode-progress-header">
                <div class="mode-progress-stars">
                  <svg class="mini-star earned" viewBox="0 0 24 24" width="13" height="13">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <span>${stars} / ${maxStars} Stars</span>
                </div>
                <span class="mode-progress-status ${statusClass}">${statusText}</span>
              </div>
              <div class="mode-progress-bar-bg">
                <div class="mode-progress-bar-fill" style="width: ${percent}%; background: ${info.colorHex};"></div>
              </div>
            </div>

            <!-- Card Bottom Prompt -->
            <div class="mode-card-bottom">
              <span>ENTER</span>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        `;
      })
      .join('');

    this.element.innerHTML = `
      <!-- Header HUD Bar -->
      <div class="mode-top-hud">
        <button id="btn-mode-back" class="btn-icon" aria-label="Back to Main Menu" title="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>

        <div style="display: flex; flex-direction: column; align-items: center; text-align: center;">
          <div class="top-bar-title" style="font-size: 1.15rem; letter-spacing: 1.5px; color: #ffffff;">MISSION</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase;">6 SECTORS &bull; 36 CHALLENGES</div>
        </div>

        <div class="hud-pill" style="gap: 6px; padding: 6px 12px;">
          <svg class="mini-star earned" viewBox="0 0 24 24" width="14" height="14">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span style="font-size: 0.82rem; font-weight: 700; color: #ffffff;">${totalStars}/${maxGameStars}</span>
        </div>
      </div>

      <!-- Mode Selection Grid -->
      <div class="mode-grid-pro">
        ${cardsHtml}
      </div>

      <!-- Quick Helpful Footer -->
      <div style="text-align: center; font-size: 0.74rem; color: var(--text-muted); margin-top: auto; padding-top: 12px; letter-spacing: 0.3px;">
        ⚡ Master each sector to earn stars & unlock custom ball skins
      </div>
    `;

    this.container.appendChild(this.element);

    // Event Listeners
    this.element.querySelector('#btn-mode-back')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onBack();
    });

    this.element.querySelectorAll('.mode-card-pro').forEach((card) => {
      card.addEventListener('click', () => {
        const mode = (card as HTMLElement).dataset.mode as GameMode;
        AudioManager.getInstance().playUIClick();
        HapticsManager.getInstance().selection();
        this.callbacks.onSelectMode(mode);
      });
    });
  }

  public hide(): void {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
      this.element = null;
    }
  }

  private hexToRgb(hex: string): string {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return `${r}, ${g}, ${b}`;
  }
}
