import { COSMETICS_DATA } from '@/data/cosmeticsData';
import { SaveManager } from '@/core/SaveManager';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';

export interface CosmeticsModalCallbacks {
  onBack: () => void;
}

export class CosmeticsModalView {
  private container: HTMLElement;
  private callbacks: CosmeticsModalCallbacks;
  private element: HTMLElement | null = null;

  constructor(container: HTMLElement, callbacks: CosmeticsModalCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  public show(): void {
    this.hide();

    const save = SaveManager.getInstance();
    const cosState = save.getData().cosmetics;
    const totalStars = save.getData().totalStars || 0;

    // Resolve currently equipped skin for the Holographic Inspection Chamber
    const equippedSkin =
      COSMETICS_DATA.skins.find((s) => s.id === cosState.selectedBallSkin) || COSMETICS_DATA.skins[0];

    const skinHex = '#' + equippedSkin.color.toString(16).padStart(6, '0');
    const glowHex = '#' + equippedSkin.glowColor.toString(16).padStart(6, '0');

    this.element = document.createElement('div');
    this.element.className = 'screen screen-cosmetics';

    // Top Header Bar
    const headerHtml = `
      <div class="top-bar">
        <button id="btn-cosmetics-back" class="btn-icon" aria-label="Back" title="Back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div style="text-align: center;">
          <div class="top-bar-title" style="font-size: 1.15rem; letter-spacing: 1.5px; color: #ffffff;">SKINS VAULT</div>
          <div style="font-size: 0.70rem; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase;">LOADOUT CUSTOMIZATION</div>
        </div>
        <div class="hud-pill" style="gap: 6px; padding: 6px 12px;">
          <svg class="mini-star earned" viewBox="0 0 24 24" width="14" height="14">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span style="font-size: 0.82rem; font-weight: 700; color: #ffffff;">${totalStars} ★</span>
        </div>
      </div>
    `;

    // Holographic Inspection Chamber with dynamic size scaling
    const sizeScale = equippedSkin.sizeMultiplier || 1.0;
    const showcaseHtml = `
      <div class="cosmetics-showcase-box">
        <div class="showcase-ball-wrapper">
          <div class="showcase-ball-ring" style="transform: scale(${Math.min(1.3, sizeScale * 1.05).toFixed(2)});"></div>
          <div class="showcase-ball-orb" style="
            transform: scale(${sizeScale.toFixed(2)});
            background: radial-gradient(circle at 35% 35%, #ffffff 0%, ${skinHex} 50%, ${glowHex} 100%);
            box-shadow: 0 0 16px ${skinHex}, 0 0 30px ${glowHex}, inset 0 0 8px rgba(255,255,255,0.8);
          "></div>
        </div>
        <div class="showcase-info-col">
          <div style="font-size: 0.62rem; font-weight: 800; color: var(--neon-cyan); letter-spacing: 1px;">ACTIVE LOADOUT</div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-family: var(--font-display); font-size: 1rem; font-weight: 900; color: #ffffff;">${equippedSkin.name}</span>
            <span class="size-badge ${equippedSkin.sizeType}">
              ${equippedSkin.sizeType === 'small' ? '⚡ SMALL' : equippedSkin.sizeType === 'big' ? '💥 BIG' : '🎯 MEDIUM'}
            </span>
          </div>
          <div class="showcase-active-grid">
            <div class="showcase-chip">⚖️ Size: <span>${equippedSkin.sizeType.toUpperCase()} (${equippedSkin.sizeMultiplier}x)</span></div>
          </div>
        </div>
      </div>
    `;

    // Content Grid (skins only — small size only, no filter needed)
    let listHtml = '';

    {
      listHtml = COSMETICS_DATA.skins
        .map((s) => {
          const isUnlocked = cosState.unlockedSkins.includes(s.id);
          const isSelected = cosState.selectedBallSkin === s.id;
          const colorHex = '#' + s.color.toString(16).padStart(6, '0');
          const glow = '#' + s.glowColor.toString(16).padStart(6, '0');

          return `
            <div class="cosmetic-card-pro ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}" style="--accent: ${colorHex}; --accent-glow: ${glow};">
              <div class="cosmetic-card-orb-wrap">
                <div class="cosmetic-preview-circle" style="
                  background: radial-gradient(circle at 35% 35%, #ffffff 0%, ${colorHex} 55%, ${glow} 100%);
                "></div>
              </div>
              <div class="cosmetic-card-body">
                <span class="cosmetic-item-name">${s.name}</span>
                <span class="cosmetic-item-desc">${s.description || 'Satisfying neon kinetic sphere'}</span>
                ${
                  s.unlockedByDefault
                    ? `<span class="cosmetic-badge-free">FREE GIFT</span>`
                    : isUnlocked
                    ? `<span class="cosmetic-badge-free" style="background: rgba(0,240,255,0.15); border-color: rgba(0,240,255,0.3); color: #00f0ff;">UNLOCKED</span>`
                    : `<span class="cosmetic-badge-req">🔒 ${s.unlockCondition}</span>`
                }
              </div>
              <div class="cosmetic-card-footer">
                ${
                  isSelected
                    ? `<span class="cosmetic-equipped-badge">EQUIPPED</span>`
                    : isUnlocked
                    ? `<button class="btn-equip-pro" data-type="skin" data-id="${s.id}">EQUIP</button>`
                    : `<button class="btn-secondary" disabled style="opacity: 0.45; font-size: 0.72rem; padding: 6px 12px; width: 100%;">LOCKED</button>`
                }
              </div>
            </div>
          `;
        })
        .join('');
    }

    this.element.innerHTML = `
      ${headerHtml}
      ${showcaseHtml}
      <div class="cosmetics-scroll-area">
        <div class="cosmetics-grid-pro">
          ${listHtml}
        </div>
      </div>
      <div class="cosmetics-footer-tip">
        Earn stars in any game mode to unlock more custom loadouts
      </div>
    `;

    this.container.appendChild(this.element);

    // Event Bindings
    this.element.querySelector('#btn-cosmetics-back')?.addEventListener('click', () => {
      AudioManager.getInstance().playUIClick();
      HapticsManager.getInstance().selection();
      this.callbacks.onBack();
    });

    // Equip buttons
    this.element.querySelectorAll('.btn-equip-pro').forEach((equipBtn) => {
      equipBtn.addEventListener('click', async () => {
        const id = (equipBtn as HTMLElement).dataset.id;
        if (!id) return;

        AudioManager.getInstance().playUIClick();
        HapticsManager.getInstance().selection();

        await save.updateCosmetics({ selectedBallSkin: id });

        this.show();
      });
    });
  }

  public hide(): void {
    if (this.element && this.element.parentElement) {
      this.element.parentElement.removeChild(this.element);
      this.element = null;
    }
  }
}
