import type { Container } from 'pixi.js';
import type { BaseMode } from '@/modes/BaseMode';
import { AudioManager } from './AudioManager';

export class InputManager {
  private element: HTMLElement;
  private cameraContainer: Container;
  private currentMode: BaseMode | null = null;
  private isPointerDown = false;

  constructor(element: HTMLElement, cameraContainer: Container) {
    this.element = element;
    this.cameraContainer = cameraContainer;
    this.setupListeners();
  }

  public setMode(mode: BaseMode | null): void {
    this.currentMode = mode;
  }

  private setupListeners(): void {
    const onDown = (e: PointerEvent) => {
      // Don't intercept UI button clicks
      const target = e.target as HTMLElement;
      if (target && target.closest('button, .btn-icon, .btn-primary, .btn-secondary, .btn-quick-restart, .toggle-switch, input, .modal-content, .level-card, .mode-card')) {
        return;
      }

      AudioManager.getInstance().unlock();
      this.isPointerDown = true;

      const { x, y } = this.getRelativeCoords(e.clientX, e.clientY);
      if (this.currentMode) {
        this.currentMode.handlePointerDown(x, y);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!this.isPointerDown) return;
      const { x, y } = this.getRelativeCoords(e.clientX, e.clientY);
      if (this.currentMode) {
        this.currentMode.handlePointerMove(x, y);
      }
    };

    const onUp = () => {
      if (!this.isPointerDown) return;
      this.isPointerDown = false;
      if (this.currentMode) {
        this.currentMode.handlePointerUp();
      }
    };

    window.addEventListener('pointerdown', onDown, { passive: false });
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { passive: false });
    window.addEventListener('pointercancel', onUp, { passive: false });
  }

  private getRelativeCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.element.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    // Convert screen coordinates to cameraContainer local space (centered at origin)
    const localX = (px - this.cameraContainer.x) / this.cameraContainer.scale.x;
    const localY = (py - this.cameraContainer.y) / this.cameraContainer.scale.y;

    return { x: localX, y: localY };
  }
}
