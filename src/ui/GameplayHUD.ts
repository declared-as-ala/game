import type { LevelConfig } from '@/data/types';
import type { ObjectiveProgress } from '@/systems/ObjectiveSystem';
import { MODES_DATA } from '@/data/modesData';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';

export interface GameplayHUDCallbacks {
  onPauseClick: () => void;
  onQuickRestartClick: () => void;
}

export class GameplayHUDView {
  private container: HTMLElement;
  private callbacks: GameplayHUDCallbacks;
  private element: HTMLElement | null = null;

  private pointsEl: HTMLElement | null = null;
  private remainingEl: HTMLElement | null = null;
  private timerEl: HTMLElement | null = null;
  private currentScore = 0;

  constructor(container: HTMLElement, callbacks: GameplayHUDCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public show(config: LevelConfig): void {
    this.hide();
    this.currentScore = 0;

    const modeInfo = MODES_DATA[config.mode];
    const totalSquares = config.nestedSquares?.length || config.objective.totalSquares || 6;
    const shapeType = config.nestedSquares?.[0]?.shape || config.arenaShape || 'square';
    let shapePlural = 'shapes';
    if (shapeType === 'diamond') shapePlural = 'losanges';
    else if (shapeType === 'heart') shapePlural = 'hearts';
    else if (shapeType === 'hexagon') shapePlural = 'hexagons';
    else if (shapeType === 'circle') shapePlural = 'circles';
    else if (shapeType === 'triangle') shapePlural = 'triangles';
    else if (shapeType === 'pentagon') shapePlural = 'pentagons';
    else if (shapeType === 'square' || shapeType === 'nested-boxes') shapePlural = 'squares';

    let initialObjectiveBadge = '';
    if (config.mode === 'neon-shatter') {
      initialObjectiveBadge = `Shatter All Bricks`;
    } else if (config.mode === 'orbit-leap') {
      initialObjectiveBadge = `Reach Golden Core 🌌`;
    } else {
      switch (config.objective.type) {
        case 'touch_walls_impact':
          initialObjectiveBadge = (config.objective.targetCount && config.objective.targetCount >= 9999)
            ? `Impacts: 0`
            : `Goal: ${config.objective.targetCount || 20} Impacts`;
          break;
        case 'reach_core':
        case 'reach_target_point':
          initialObjectiveBadge = `Reach The Core`;
          break;
        case 'survive_rebounds':
          initialObjectiveBadge = (config.objective.targetCount && config.objective.targetCount >= 9999)
            ? `Bounces: 0`
            : `Goal: ${config.objective.targetCount || 15} Bounces`;
          break;
        case 'shatter_bricks':
          initialObjectiveBadge = `Shatter All Bricks`;
          break;
        case 'escape_balls':
          initialObjectiveBadge = `Escape: 0/${config.objective.targetCount || config.ballCount || 1}`;
          break;
        case 'escape_squares':
        default:
          initialObjectiveBadge = `${totalSquares} ${shapePlural} remaining`;
          break;
      }
    }

    const modeTitle = modeInfo ? modeInfo.title.toUpperCase() : config.mode.toUpperCase();
    const modeColor = modeInfo ? modeInfo.colorHex : 'var(--neon-cyan)';
    const levelTitle = config.name || `Level ${config.levelNumber || 1}`;

    this.element = document.createElement('div');
    this.element.className = 'hud-container';
    this.element.innerHTML = `
      <div class="hud-top-section">
        <div class="hud-top-bar">
          <button id="btn-hud-pause" class="btn-icon" aria-label="Pause">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          </button>

          <div class="hud-timer-badge" id="hud-timer-wrap" style="display: ${config.objective.timeLimit ? 'flex' : 'none'};">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span id="hud-timer">${config.objective.timeLimit || 0}s</span>
          </div>

          <button id="btn-hud-restart" class="btn-quick-restart" aria-label="Quick Restart">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            RETRY
          </button>
        </div>

        ${
          config.mode === 'orbit-leap'
            ? `
          <div class="hud-hero-center hud-orbit-minimal" style="text-align: center;">
            <div style="font-family: var(--font-display); font-size: 0.95rem; font-weight: 900; color: #ffffff; letter-spacing: 3px; text-shadow: 0 0 12px rgba(0, 240, 255, 0.6);">ORBIT</div>
            <div style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 800; color: #00f0ff; letter-spacing: 2px; opacity: 0.9; margin-top: 2px;">LEVEL ${config.levelNumber < 10 ? '0' + config.levelNumber : config.levelNumber}</div>
            <div id="hud-remaining-badge" class="hud-remaining-badge" style="display: none;">${initialObjectiveBadge}</div>
            <div id="hud-points-display" style="display: none;">0 POINTS</div>
          </div>
        `
            : `
          <div class="hud-hero-center">
            <div class="hud-mode-pill" style="font-size: 0.72rem; font-weight: 700; color: ${modeColor}; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.95; text-align: center;">${modeTitle} • LEVEL ${config.levelNumber || 1}</div>
            <h1 id="hud-game-title" class="hud-escape-title" style="text-align: center;">${levelTitle}</h1>
            <div id="hud-points-display" class="hud-points-badge" style="text-align: center;">0 POINTS</div>
            <div id="hud-remaining-badge" class="hud-remaining-badge" style="text-align: center;">${initialObjectiveBadge}</div>
          </div>
        `
        }
      </div>
    `;

    this.container.appendChild(this.element);

    this.pointsEl = this.element.querySelector('#hud-points-display');
    this.remainingEl = this.element.querySelector('#hud-remaining-badge');
    this.timerEl = this.element.querySelector('#hud-timer');

    this.element.querySelector('#btn-hud-pause')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onPauseClick();
    });

    this.element.querySelector('#btn-hud-restart')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().lightImpact();
      this.callbacks.onQuickRestartClick();
    });
  }

  public updateProgress(progress: ObjectiveProgress, score = 0): void {
    if (this.pointsEl && score !== this.currentScore) {
      this.currentScore = score;
      this.pointsEl.textContent = `${score.toLocaleString()} POINTS`;
      this.pointsEl.classList.remove('pulse-bump');
      void this.pointsEl.offsetWidth; // trigger reflow
      this.pointsEl.classList.add('pulse-bump');
    }

    if (this.remainingEl && progress.label) {
      if (this.remainingEl.textContent !== progress.label) {
        this.remainingEl.textContent = progress.label;
        this.remainingEl.classList.remove('pulse-bump');
        void this.remainingEl.offsetWidth;
        this.remainingEl.classList.add('pulse-bump');
      }
    }

    if (this.timerEl && progress.timeRemaining !== undefined) {
      this.timerEl.textContent = `${Math.ceil(progress.timeRemaining)}s`;
    }
  }

  public hide(): void {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
      this.element = null;
    }
  }
}
