import confetti from 'canvas-confetti';
import type { LevelResult } from '@/data/types';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';

export interface ResultModalCallbacks {
  onRetry: () => void;
  onNext: () => void;
  onNextMode?: () => void;
  onMenu: () => void;
}

export interface ResultModalOptions {
  hasNextLevel: boolean;
  nextMode?: { id: string; title: string } | null;
  modeCompleted?: boolean;
}

export class ResultModalView {
  private container: HTMLElement;
  private callbacks: ResultModalCallbacks;
  private element: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: ResultModalCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public show(result: LevelResult, options: boolean | ResultModalOptions = true): void {
    this.hide();

    const opts: ResultModalOptions =
      typeof options === 'boolean'
        ? { hasNextLevel: options, nextMode: null, modeCompleted: false }
        : options;

    const isWin = result.completed;
    const stars = result.starsEarned;
    const hasNextLevel = opts.hasNextLevel;
    const nextMode = opts.nextMode;
    const isModeCompleted = Boolean(opts.modeCompleted || (!hasNextLevel && isWin && nextMode));

    // Audio & Haptics
    if (isWin) {
      AudioManager.getInstance().playLevelComplete();
      HapticsManager.getInstance().success();

      // Confetti burst for 3 stars or victory
      try {
        confetti({
          particleCount: stars === 3 ? 120 : 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00f0ff', '#ff007f', '#a855f7', '#ffd700'],
        });
      } catch {
        // Ignore in environments without canvas confetti
      }
    } else {
      AudioManager.getInstance().playDefeat();
      HapticsManager.getInstance().error();
    }

    this.element = document.createElement('div');
    this.element.className = 'modal-overlay';

    const starsHtml = [1, 2, 3]
      .map(
        (i) => `
        <svg id="star-icon-${i}" class="star-icon ${i <= stars ? 'earned' : ''}" viewBox="0 0 24 24">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      `
      )
      .join('');

    const titleText = !isWin
      ? 'TRY AGAIN'
      : isModeCompleted
      ? 'MODE COMPLETED!'
      : 'LEVEL COMPLETE';

    const titleColor = !isWin ? '#ff2244' : 'var(--neon-cyan)';

    this.element.innerHTML = `
      <div class="modal-content">
        <h2 class="neon-title" style="font-size: clamp(1.6rem, 5vw, 2rem); color: ${titleColor}; letter-spacing: 1px; margin-bottom: ${isModeCompleted ? '4px' : '10px'};">
          ${titleText}
        </h2>
        ${
          isModeCompleted
            ? `<div style="font-size: 0.72rem; font-weight: 800; letter-spacing: 1.5px; color: #facc15; margin-bottom: 10px; text-transform: uppercase;">★ CLEARED ★</div>`
            : ''
        }
        
        <div class="star-container">
          ${starsHtml}
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; margin: 12px 0 20px 0;">
          <div class="setting-item" style="padding: 10px 14px;">
            <span style="color: var(--text-secondary);">Score</span>
            <span style="font-weight: 800; font-family: var(--font-display); color: var(--neon-cyan);">${result.score.toLocaleString()}</span>
          </div>
          <div class="setting-item" style="padding: 10px 14px;">
            <span style="color: var(--text-secondary);">Time</span>
            <span style="font-weight: 700;">${result.timeSeconds.toFixed(2)}s</span>
          </div>
          <div class="setting-item" style="padding: 10px 14px;">
            <span style="color: var(--text-secondary);">Attempts</span>
            <span style="font-weight: 700;">${result.attemptsUsed}</span>
          </div>
        </div>

        <div style="display: flex; gap: 10px; width: 100%;">
          <button id="btn-result-retry" class="${isWin && (hasNextLevel || nextMode) ? 'btn-secondary' : 'btn-primary'}" style="flex: 1; font-size: clamp(0.85rem, 3.5vw, 1rem); padding: 12px 14px;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            ${isWin ? 'RETRY' : 'TRY AGAIN'}
          </button>
          
          ${
            isWin && hasNextLevel
              ? `
            <button id="btn-result-next" class="btn-primary" style="flex: 1.2; font-size: clamp(0.85rem, 3.5vw, 1rem); padding: 12px 14px;">
              NEXT LEVEL
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          `
              : ''
          }

          ${
            isWin && !hasNextLevel && nextMode
              ? `
            <button id="btn-result-next-mode" class="btn-primary" style="flex: 1.35; font-size: clamp(0.85rem, 3.5vw, 1rem); padding: 12px 14px; background: linear-gradient(135deg, #00f0ff 0%, #a855f7 100%);">
              NEXT MODE
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
          `
              : ''
          }
        </div>

        <button id="btn-result-menu" class="btn-secondary" style="margin-top: 12px; width: 100%; border: none; background: transparent; font-size: 0.85rem; color: var(--text-muted);">
          ${hasNextLevel ? 'Back to Level Select' : 'Back to Menu'}
        </button>
      </div>
    `;

    this.container.appendChild(this.element);

    // Staggered star animation sounds
    if (isWin && stars > 0) {
      for (let s = 1; s <= stars; s++) {
        setTimeout(() => {
          AudioManager.getInstance().playStarPop(s - 1);
        }, 150 + s * 220);
      }
    }

    this.element.querySelector('#btn-result-retry')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onRetry();
    });

    this.element.querySelector('#btn-result-next')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onNext();
    });

    this.element.querySelector('#btn-result-next-mode')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      if (this.callbacks.onNextMode) {
        this.callbacks.onNextMode();
      } else {
        this.callbacks.onNext();
      }
    });

    this.element.querySelector('#btn-result-menu')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onMenu();
    });
  }

  public hide(): void {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
      this.element = null;
    }
  }
}
