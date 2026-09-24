import type { GameMode } from '@/data/types';
import { MODES_DATA } from '@/data/modesData';
import { LevelRegistry } from '@/levels/levelRegistry';
import { SaveManager } from '@/core/SaveManager';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';

export interface LevelSelectCallbacks {
  onSelectLevel: (mode: GameMode, levelNumber: number) => void;
  onBack: () => void;
}

export class LevelSelectView {
  private container: HTMLElement;
  private callbacks: LevelSelectCallbacks;
  private element: HTMLElement | null = null;
  private currentMode: GameMode = 'escape';

  constructor(container: HTMLElement, callbacks: LevelSelectCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public show(mode: GameMode): void {
    this.hide();
    this.currentMode = mode;

    const modeInfo = MODES_DATA[mode];
    const levels = LevelRegistry.getLevelsForMode(mode);
    const save = SaveManager.getInstance();
    const modeStars = save.getStarsForMode(mode);
    const maxModeStars = levels.length * 3;
    const percent = Math.min(100, Math.round((modeStars / maxModeStars) * 100));

    const rgb = this.hexToRgb(modeInfo.colorHex);

    this.element = document.createElement('div');
    this.element.className = 'screen screen-level-select';
    this.element.style.setProperty('--mode-color', modeInfo.colorHex);
    this.element.style.setProperty('--mode-glow-soft', `rgba(${rgb}, 0.35)`);
    this.element.style.setProperty('--mode-border', `rgba(${rgb}, 0.4)`);

    const currentActiveLevel =
      levels.find(
        (l) =>
          save.isLevelUnlocked(mode, l.levelNumber) &&
          (!save.getData().completedLevels[l.id] || save.getData().completedLevels[l.id].stars === 0)
      )?.levelNumber || 1;

    const tilesHtml = levels
      .map((lvl) => {
        const isUnlocked = save.isLevelUnlocked(mode, lvl.levelNumber);
        const isCurrent = lvl.levelNumber === currentActiveLevel && isUnlocked;
        const record = save.getData().completedLevels[lvl.id];
        const stars = record?.stars || 0;

        const starsHtml = [1, 2, 3]
          .map(
            (i) => `
            <svg class="mini-star ${i <= stars ? 'earned' : ''}" viewBox="0 0 24 24" width="13" height="13">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          `
          )
          .join('');

        const formattedNum = lvl.levelNumber < 10 ? `0${lvl.levelNumber}` : `${lvl.levelNumber}`;

        if (!isUnlocked) {
          return `
            <div class="level-card-pro locked" title="Locked - Complete previous sector to unlock">
              <div class="level-card-header">
                <span class="level-sector-tag" style="color: var(--text-muted);">SECTOR</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#64748b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="level-card-num" style="opacity: 0.4;">${formattedNum}</div>
              <div class="level-card-title">${lvl.name}</div>
              <div class="level-card-stars" style="opacity: 0.25;">${starsHtml}</div>
              <div class="level-card-status status-locked">🔒 CLEAR SECTOR ${lvl.levelNumber - 1}</div>
            </div>
          `;
        }

        let statusClass = 'status-play';
        let statusText = isCurrent ? 'NEXT ▶' : 'PLAY ▶';
        if (stars === 3) {
          statusClass = 'status-perfect';
          statusText = 'PERFECT ★';
        } else if (stars > 0) {
          statusClass = 'status-cleared';
          statusText = `${record.bestScore.toLocaleString()} PTS`;
        }

        return `
          <div class="level-card-pro unlocked ${isCurrent ? 'is-current' : ''}" data-level="${lvl.levelNumber}" role="button" tabindex="0" style="${isCurrent ? `border-color: ${modeInfo.colorHex}; box-shadow: 0 0 18px var(--mode-glow-soft);` : ''}">
            <div class="level-card-header">
              <span class="level-sector-tag" style="color: ${isCurrent ? '#ffffff' : modeInfo.colorHex};">${isCurrent ? '⚡ CURRENT' : 'SECTOR'}</span>
              <span style="font-size: 0.60rem; color: var(--text-muted); font-weight: 700;">3★ MAX</span>
            </div>
            <div class="level-card-num" style="${isCurrent ? `color: ${modeInfo.colorHex};` : ''}">${formattedNum}</div>
            <div class="level-card-title">${lvl.name}</div>
            <div class="level-card-stars">${starsHtml}</div>
            <div class="level-card-status ${statusClass}">${statusText}</div>
          </div>
        `;
      })
      .join('');

    this.element.innerHTML = `
      <!-- Top Header Bar -->
      <div class="top-bar">
        <button id="btn-level-back" class="btn-icon" aria-label="Back to Mode Selection" title="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>

        <div style="text-align: center;">
          <div class="top-bar-title" style="font-size: 1.15rem; letter-spacing: 1.5px; color: ${modeInfo.colorHex};">
            ${modeInfo.title.toUpperCase()}
          </div>
          <div style="font-size: 0.70rem; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase;">
            ${modeInfo.subtitle}
          </div>
        </div>

        <div class="hud-pill" style="gap: 6px; padding: 6px 12px;">
          <svg class="mini-star earned" viewBox="0 0 24 24" width="14" height="14">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span style="font-size: 0.82rem; font-weight: 700; color: #ffffff;">${modeStars}/${maxModeStars}</span>
        </div>
      </div>

      <!-- Mode Mission Briefing Banner -->
      <div class="level-mission-banner">
        <div class="level-banner-top">
          <div class="level-banner-icon" style="background: rgba(${rgb}, 0.16); color: ${modeInfo.colorHex}; border: 1px solid rgba(${rgb}, 0.35);">
            ${modeInfo.iconSvg}
          </div>
          <div class="level-banner-title-group">
            <div class="level-banner-tag" style="color: ${modeInfo.colorHex};">ACTIVE</div>
            <div class="level-banner-name">${modeInfo.title}</div>
            <p class="level-banner-desc">${modeInfo.tagline}</p>
          </div>
        </div>

        <!-- Sector Progress Meter -->
        <div class="level-progress-meter">
          <div class="level-meter-header">
            <span style="font-weight: 700; color: #ffffff;">Sector Mastery</span>
            <span style="color: ${modeInfo.colorHex}; font-weight: 800;">${modeStars} / ${maxModeStars} Stars (${percent}%)</span>
          </div>
          <div class="level-meter-bar-bg">
            <div class="level-meter-bar-fill" style="width: ${percent}%; background: ${modeInfo.colorHex};"></div>
          </div>
        </div>
      </div>

      <!-- 2-Column Responsive Level Grid -->
      <div class="level-grid-pro">
        ${tilesHtml}
      </div>

      <!-- Footer Quick Tip -->
      <div style="text-align: center; font-size: 0.70rem; color: var(--text-muted); margin-top: auto; padding-top: 8px; letter-spacing: 0.3px;">
        ⚡ Complete all 6 sectors with 3 stars to achieve Mastery
      </div>
    `;

    this.container.appendChild(this.element);

    // Event Bindings
    this.element.querySelector('#btn-level-back')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onBack();
    });

    this.element.querySelectorAll('.level-card-pro.unlocked').forEach((card) => {
      card.addEventListener('click', () => {
        const lvlNum = parseInt((card as HTMLElement).dataset.level || '1', 10);
        AudioManager.getInstance().playUIClick();
        HapticsManager.getInstance().selection();
        this.callbacks.onSelectLevel(this.currentMode, lvlNum);
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
