import { generateDailyChallenge, getTodayDateKey } from '@/levels/dailyChallenge';
import { SaveManager } from '@/core/SaveManager';
import { MODES_DATA } from '@/data/modesData';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';

export interface DailyChallengeModalCallbacks {
  onStartChallenge: (dateKey: string) => void;
  onBack: () => void;
}

export class DailyChallengeModalView {
  private container: HTMLElement;
  private callbacks: DailyChallengeModalCallbacks;
  private element: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: DailyChallengeModalCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public show(): void {
    this.hide();

    const todayKey = getTodayDateKey();
    const challenge = generateDailyChallenge(todayKey);
    const modeInfo = MODES_DATA[challenge.mode];
    const history = SaveManager.getInstance().getData().dailyChallengeHistory[todayKey];
    const isCompleted = history?.completed || false;

    this.element = document.createElement('div');
    this.element.className = 'modal-overlay';
    this.element.innerHTML = `
      <div class="modal-content" style="border-color: #facc15; box-shadow: 0 0 25px rgba(250, 204, 21, 0.35);">
        <div class="top-bar" style="margin-bottom: 8px;">
          <button id="btn-daily-back" class="btn-icon" aria-label="Back">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div style="font-family: var(--font-display); font-size: 1.1rem; color: #facc15; font-weight: 800;">DAILY CHALLENGE</div>
          <div style="width: 46px;"></div>
        </div>

        <div style="text-align: center; margin: 12px 0;">
          <div style="font-size: 0.85rem; color: var(--text-secondary);">${todayKey}</div>
          <h3 style="font-family: var(--font-display); font-size: 1.3rem; margin-top: 4px; color: ${modeInfo.colorHex};">
            ${challenge.name}
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 6px; padding: 0 8px;">
            ${challenge.description}
          </p>
        </div>

        <div class="glass-panel" style="width: 100%; padding: 14px; margin: 12px 0; background: rgba(18, 18, 30, 0.6);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem;">
            <span style="color: var(--text-secondary);">Mode:</span>
            <span style="font-weight: 700; color: ${modeInfo.colorHex};">${modeInfo.title}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem;">
            <span style="color: var(--text-secondary);">Shape:</span>
            <span style="font-weight: 700; text-transform: capitalize;">${challenge.arenaShape}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
            <span style="color: var(--text-secondary);">Status:</span>
            <span style="font-weight: 700; color: ${isCompleted ? '#10b981' : '#facc15'};">
              ${isCompleted ? `Completed (${history?.score.toLocaleString()} pts)` : 'Unattempted'}
            </span>
          </div>
        </div>

        <button id="btn-daily-start" class="btn-primary" style="width: 100%; background: linear-gradient(135deg, #facc15 0%, #ff8800 100%); color: #07070c; box-shadow: 0 0 20px rgba(250, 204, 21, 0.4);">
          ${isCompleted ? 'PLAY AGAIN' : 'START CHALLENGE'}
        </button>
      </div>
    `;

    this.container.appendChild(this.element);

    this.element.querySelector('#btn-daily-back')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onBack();
    });

    this.element.querySelector('#btn-daily-start')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onStartChallenge(todayKey);
    });
  }

  public hide(): void {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
      this.element = null;
    }
  }
}
