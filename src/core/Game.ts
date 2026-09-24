import { Application, Container } from 'pixi.js';
import { PhysicsWorld } from './PhysicsWorld';
import { GameLoop } from './GameLoop';
import { InputManager } from './InputManager';
import { PerformanceManager } from './PerformanceManager';
import { ScreenShake } from '@/effects/ScreenShake';
import type { BaseMode } from '@/modes/BaseMode';
import { ModeFactory } from '@/modes/ModeFactory';
import type { LevelConfig, LevelResult } from '@/data/types';
import type { ObjectiveProgress } from '@/systems/ObjectiveSystem';
import { SaveManager } from './SaveManager';
import { COSMETICS_DATA } from '@/data/cosmeticsData';

export interface GameCallbacks {
  onLevelCompleted: (result: LevelResult) => void;
  onLevelFailed: (result: LevelResult) => void;
  onProgressUpdate: (progress: ObjectiveProgress) => void;
}

export class Game {
  public app!: Application;
  public physics!: PhysicsWorld;
  public gameLoop!: GameLoop;
  public inputManager!: InputManager;
  public screenShake!: ScreenShake;

  public cameraContainer!: Container;
  public shakeContainer!: Container;
  public worldContainer!: Container;
  public currentMode: BaseMode | null = null;
  public currentConfig: LevelConfig | null = null;

  private canvasContainer: HTMLElement;
  private callbacks: GameCallbacks;
  private isPaused = false;

  constructor(canvasContainer: HTMLElement, callbacks: GameCallbacks) {
    this.canvasContainer = canvasContainer;
    this.callbacks = callbacks;
  }

  public async init(): Promise<void> {
    // 1. Initialize PixiJS Application (v8)
    this.app = new Application();
    await this.app.init({
      resizeTo: this.canvasContainer,
      backgroundColor: 0x07070c,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      powerPreference: 'high-performance',
    });

    this.canvasContainer.appendChild(this.app.canvas);

    // 2. Camera & Shake Hierarchy (Centered and scaled)
    this.cameraContainer = new Container();
    this.shakeContainer = new Container();
    this.worldContainer = new Container();

    this.app.stage.addChild(this.cameraContainer);
    this.cameraContainer.addChild(this.shakeContainer);
    this.shakeContainer.addChild(this.worldContainer);

    this.screenShake = new ScreenShake(this.shakeContainer);

    // 3. Physics & Input
    this.physics = new PhysicsWorld({ x: 0, y: 0 });
    this.inputManager = new InputManager(this.canvasContainer, this.cameraContainer);

    // 4. Game Loop
    this.gameLoop = new GameLoop(
      (dt) => this.updatePhysics(dt),
      (interp) => this.render(interp)
    );

    // 5. Handle Resize
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    this.gameLoop.start();
  }

  public handleResize(): void {
    if (!this.app || !this.app.renderer) return;

    const width = this.canvasContainer.clientWidth || window.innerWidth;
    const height = this.canvasContainer.clientHeight || window.innerHeight;

    // Center the camera container
    this.cameraContainer.x = width / 2;
    this.cameraContainer.y = height / 2;

    // Responsive scale based on standard 400x700 portrait viewport
    const targetW = 400;
    const targetH = 700;
    const scale = Math.min(width / targetW, height / targetH, 1.25);
    this.cameraContainer.scale.set(scale, scale);
  }

  public loadLevel(config: LevelConfig): void {
    this.currentConfig = config;

    // Apply equipped arena theme
    const cos = SaveManager.getInstance().getData().cosmetics;
    const theme = COSMETICS_DATA.themes.find((t) => t.id === cos?.selectedArenaTheme) || COSMETICS_DATA.themes[0];
    if (this.app?.renderer?.background && theme) {
      this.app.renderer.background.color = theme.bgHex;
    }

    // Cleanup previous mode
    if (this.currentMode) {
      this.currentMode.destroy();
      this.currentMode = null;
    }
    this.physics.clear();

    // Create and init new mode
    this.currentMode = ModeFactory.createMode(
      config,
      this.physics,
      this.worldContainer,
      this.screenShake
    );
    this.currentMode.init();
    this.inputManager.setMode(this.currentMode);
    this.isPaused = false;
  }

  public clearLevel(): void {
    if (this.currentMode) {
      this.currentMode.destroy();
      this.currentMode = null;
    }
    this.physics.clear();
    this.inputManager.setMode(null);
    this.currentConfig = null;
    this.isPaused = false;
    this.screenShake.reset();
  }

  public restartCurrentLevel(): void {
    if (this.currentConfig) {
      this.loadLevel(this.currentConfig);
    }
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  private updatePhysics(dt: number): void {
    if (this.isPaused || !this.currentMode) return;

    // Step physics world
    this.physics.step(dt);

    // Update active game mode
    const { progress, result } = this.currentMode.update(dt);

    // Update camera shake
    this.screenShake.update(dt);

    // Broadcast HUD progress
    this.callbacks.onProgressUpdate(progress);

    // Check completion/failure
    if (result) {
      if (result.completed) {
        if (this.currentConfig) {
          SaveManager.getInstance().saveLevelResult(this.currentConfig.id, result);
        }
        this.callbacks.onLevelCompleted(result);
      } else {
        this.callbacks.onLevelFailed(result);
      }
    }
  }

  private render(_interpolation: number): void {
    PerformanceManager.getInstance().recordFps(this.gameLoop.currentFps);

    // Dev debug overlay updater
    if (import.meta.env.DEV) {
      const fpsEl = document.getElementById('debug-fps');
      const bodiesEl = document.getElementById('debug-bodies');
      const ballsEl = document.getElementById('debug-balls');
      const particlesEl = document.getElementById('debug-particles');

      if (fpsEl) fpsEl.textContent = `FPS: ${this.gameLoop.currentFps}`;
      if (bodiesEl) bodiesEl.textContent = `Bodies: ${this.physics.getWorld().getBodyCount()}`;
      if (ballsEl) ballsEl.textContent = `Balls: ${this.currentMode?.balls.length || 0}`;
      if (particlesEl) particlesEl.textContent = `Particles: ${this.currentMode?.particles.getActiveCount() || 0}`;
    }
  }

  public destroy(): void {
    this.gameLoop.stop();
    if (this.currentMode) {
      this.currentMode.destroy();
    }
    this.physics.clear();
    this.app.destroy(true, { children: true });
  }
}
