import { SaveManager } from '@/core/SaveManager';

export class OnboardingOverlay {
  private container: HTMLElement;
  private element: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public showIfFirstTime(): void {
    const isDone = SaveManager.getInstance().getData().firstTimeOnboardingDone;
    if (isDone) return;

    this.element = document.createElement('div');
    this.element.className = 'onboarding-hint';
    this.element.innerHTML = `
      <div style="font-weight: 800; margin-bottom: 2px;">SLINGSHOT AIM</div>
      <div style="font-size: 0.8rem; color: var(--text-secondary);">Touch ball, drag backward & release</div>
    `;

    this.container.appendChild(this.element);

    // Auto dismiss on first user launch
    const dismiss = () => {
      SaveManager.getInstance().setOnboardingDone();
      this.hide();
      window.removeEventListener('pointerdown', dismiss);
    };
    setTimeout(() => {
      window.addEventListener('pointerdown', dismiss, { once: true });
    }, 500);
  }

  public hide(): void {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
      this.element = null;
    }
  }
}
