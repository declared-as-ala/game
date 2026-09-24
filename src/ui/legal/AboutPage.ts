import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';
import { APP_CONFIG } from '@/app/config';
import { getLegalCompanyName } from '@/legal/legalConfig';
import { getOpenSourceNotices } from '@/legal/openSourceNotices';

export interface AboutPageCallbacks {
  onBack: () => void;
  onPrivacyPolicy: () => void;
  onTermsOfService: () => void;
}

export class AboutPage {
  private container: HTMLElement;
  private callbacks: AboutPageCallbacks;
  private element: HTMLElement | null = null;
  private showLicenses = false;

  constructor(container: HTMLElement, callbacks: AboutPageCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public show(): void {
    this.hide();

    const company = getLegalCompanyName();
    const version = APP_CONFIG.version;
    const licenses = getOpenSourceNotices();

    this.element = document.createElement('div');
    this.element.className = 'screen legal-screen';

    const licensesHtml = licenses
      .map((pkg) => `
        <div class="legal-card" style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <div style="font-weight: 700; color: var(--neon-cyan);">${pkg.name} <span style="font-size: 0.75rem; color: var(--text-muted);">v${pkg.version}</span></div>
            <span style="font-size: 0.72rem; padding: 2px 8px; border-radius: 6px; background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.25); color: var(--neon-cyan);">${pkg.license}</span>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); margin: 4px 0 6px 0;">${pkg.description}</div>
          <pre class="license-pre">${pkg.noticeText}</pre>
        </div>
      `)
      .join('');

    this.element.innerHTML = `
      <div class="top-bar">
        <button id="btn-about-back" class="btn-icon" aria-label="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div class="top-bar-title" style="font-size: 1.05rem;">ABOUT SATISFYBALL</div>
        <div style="width: 46px;"></div>
      </div>

      <div class="legal-scroll-container">
        <!-- Hero App Card -->
        <div class="legal-card" style="text-align: center; padding: 24px 16px; border-color: var(--border-neon-cyan);">
          <div style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 900; letter-spacing: 2px; background: linear-gradient(135deg, #00f0ff 0%, #a855f7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            SatisfyBall
          </div>
          <div style="font-size: 0.8rem; color: var(--neon-cyan); font-weight: 600; margin-top: 4px;">
            App Version: ${version}
          </div>
          <div style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 8px; line-height: 1.5;">
            A satisfying physics puzzle game with deterministic simulation, dynamic neon visuals, and haptic feedback.
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 10px;">
            &copy; ${new Date().getFullYear()} ${company}. All rights reserved.
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div class="setting-item clickable-setting" id="btn-about-privacy">
            <div>
              <div style="font-weight: 700;">Privacy Policy</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Read our offline data and privacy commitments</div>
            </div>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>

          <div class="setting-item clickable-setting" id="btn-about-terms">
            <div>
              <div style="font-weight: 700;">Terms of Service</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Review end user terms and licensing</div>
            </div>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>

          <div class="setting-item clickable-setting" id="btn-toggle-licenses">
            <div>
              <div style="font-weight: 700;">Licenses / Open Source Notices</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${this.showLicenses ? 'Hide open source licenses' : 'View third-party software attributions'}</div>
            </div>
            <svg id="arrow-licenses" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: ${this.showLicenses ? 'rotate(90deg)' : 'none'}; transition: transform 0.2s ease;">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>

        <!-- Collapsible Licenses Container -->
        <div id="licenses-container" style="display: ${this.showLicenses ? 'block' : 'none'};">
          <div style="font-family: var(--font-display); font-size: 0.8rem; font-weight: 800; color: var(--text-muted); margin: 12px 0 8px 4px; letter-spacing: 1px;">
            THIRD-PARTY LICENSES
          </div>
          ${licensesHtml}
        </div>

        <div style="text-align: center; font-size: 0.72rem; color: var(--text-muted); padding: 12px 0 20px 0; line-height: 1.5;">
          Crafted with PixiJS, Planck.js & Capacitor
        </div>
      </div>
    `;

    this.container.appendChild(this.element);

    // Event Handlers
    this.element.querySelector('#btn-about-back')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onBack();
    });

    this.element.querySelector('#btn-about-privacy')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onPrivacyPolicy();
    });

    this.element.querySelector('#btn-about-terms')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onTermsOfService();
    });

    this.element.querySelector('#btn-toggle-licenses')?.addEventListener('click', () => {
      this.showLicenses = !this.showLicenses;
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.show();
    });
  }

  public hide(): void {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
      this.element = null;
    }
  }
}
