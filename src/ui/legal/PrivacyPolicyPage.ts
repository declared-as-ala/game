import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';
import { getPrivacyPolicy } from '@/legal/privacyPolicy';

export interface PrivacyPolicyCallbacks {
  onBack: () => void;
}

export class PrivacyPolicyPage {
  private container: HTMLElement;
  private callbacks: PrivacyPolicyCallbacks;
  private element: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: PrivacyPolicyCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public show(): void {
    this.hide();

    const doc = getPrivacyPolicy();

    this.element = document.createElement('div');
    this.element.className = 'screen legal-screen';

    const sectionsHtml = doc.sections
      .map((sec) => {
        const paragraphsHtml = sec.paragraphs
          .map((p) => `<p class="legal-p">${p}</p>`)
          .join('');

        const bulletsHtml = sec.bullets && sec.bullets.length > 0
          ? `<ul class="legal-list">${sec.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`
          : '';

        return `
          <div class="legal-card">
            <h3 class="legal-h2">${sec.title}</h3>
            ${paragraphsHtml}
            ${bulletsHtml}
          </div>
        `;
      })
      .join('');

    this.element.innerHTML = `
      <div class="top-bar">
        <button id="btn-privacy-back" class="btn-icon" aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div class="top-bar-title" style="font-size: 1.05rem;">PRIVACY POLICY</div>
        <div style="width: 46px;"></div>
      </div>

      <div class="legal-scroll-container">
        <div style="text-align: center; margin-bottom: 6px;">
          <div style="font-size: 0.78rem; color: var(--neon-cyan); font-weight: 700; letter-spacing: 1px;">OFFLINE-FIRST PRIVACY PROMISE</div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Last Updated: ${doc.lastUpdated}</div>
        </div>

        ${sectionsHtml}

        <div style="text-align: center; font-size: 0.72rem; color: var(--text-muted); padding: 12px 0 20px 0; line-height: 1.5;">
          SatisfyBall &bull; Pure Offline Gameplay &bull; No Tracking
        </div>
      </div>
    `;

    this.container.appendChild(this.element);

    this.element.querySelector('#btn-privacy-back')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onBack();
    });
  }

  public hide(): void {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
      this.element = null;
    }
  }
}
