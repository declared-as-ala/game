import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import * as planck from 'planck';
import { APP_CONFIG } from '@/app/config';
import type { Ball } from '@/entities/Ball';
import type { PhysicsWorld } from '@/core/PhysicsWorld';
import { AudioManager } from '@/core/AudioManager';
import { HapticsManager } from '@/core/HapticsManager';

export interface AimState {
  isAiming: boolean;
  anchorX: number;
  anchorY: number;
  ballVisualX: number;
  ballVisualY: number;
  dragDistance: number;
  powerPercent: number; // 0 to 1
  launchDirection: { x: number; y: number };
  launchImpulse: planck.Vec2;
}

export type LaunchCallback = (impulse: planck.Vec2, powerPercent: number) => void;

export class AimSystem {
  /** Per-mode launch speed tuning; 1 = default, e.g. 1/3 for a slower mode. */
  public speedMultiplier = 1;

  private targetBall: Ball | null = null;
  private container: Container;
  private bandsGraphics: Graphics;
  private arrowGraphics: Graphics;
  private powerText: Text;

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private currentDragX = 0;
  private currentDragY = 0;

  private onLaunchCallback: LaunchCallback | null = null;

  constructor(_physics: PhysicsWorld, parent: Container) {
    this.container = new Container();
    this.bandsGraphics = new Graphics();
    this.arrowGraphics = new Graphics();
    this.container.addChild(this.bandsGraphics);
    this.container.addChild(this.arrowGraphics);

    const style = new TextStyle({
      fontFamily: 'Orbitron, Outfit, sans-serif',
      fontSize: 14,
      fontWeight: '800',
      fill: 0x00f0ff,
      dropShadow: {
        alpha: 0.8,
        blur: 6,
        color: 0x000000,
        distance: 2,
      },
    });
    this.powerText = new Text({ text: '', style });
    this.powerText.anchor.set(0.5, 0.5);
    this.container.addChild(this.powerText);

    parent.addChild(this.container);
  }

  public setTargetBall(ball: Ball | null): void {
    this.targetBall = ball;
    this.cancelAim();
  }

  public onLaunch(cb: LaunchCallback): void {
    this.onLaunchCallback = cb;
  }

  public handlePointerDown(worldX: number, worldY: number): boolean {
    if (!this.targetBall || this.targetBall.isDestroyed) return false;

    this.isDragging = true;
    this.dragStartX = worldX;
    this.dragStartY = worldY;
    this.currentDragX = worldX;
    this.currentDragY = worldY;

    HapticsManager.getInstance().selection();
    return true;
  }

  public handlePointerMove(worldX: number, worldY: number): void {
    if (!this.isDragging) return;
    this.currentDragX = worldX;
    this.currentDragY = worldY;
  }

  public handlePointerUp(): boolean {
    if (!this.isDragging) return false;

    // Retrieve state BEFORE clearing isDragging
    const state = this.getAimState();
    this.isDragging = false;
    this.clearVisuals();

    if (this.targetBall) {
      // Reset visual offset to body position
      const physPos = this.targetBall.body.getPosition();
      this.targetBall.view.x = physPos.x * APP_CONFIG.PHYSICS.SCALE;
      this.targetBall.view.y = physPos.y * APP_CONFIG.PHYSICS.SCALE;
    }

    if (state && state.dragDistance >= APP_CONFIG.AIM.MIN_DRAG_DISTANCE && this.targetBall) {
      // Direct high-velocity launch + impulse for satisfying kinetic punch
      const speed = (2.3 + state.powerPercent * 6) * this.speedMultiplier; // m/s
      const vx = state.launchDirection.x * speed;
      const vy = state.launchDirection.y * speed;

      this.targetBall.body.setAwake(true);
      this.targetBall.body.setLinearVelocity(planck.Vec2(vx, vy));
      this.targetBall.applyImpulse(state.launchImpulse);

      AudioManager.getInstance().playLaunch(state.powerPercent);
      HapticsManager.getInstance().lightImpact();

      if (this.onLaunchCallback) {
        this.onLaunchCallback(state.launchImpulse, state.powerPercent);
      }
      return true;
    }
    return false;
  }

  public cancelAim(): void {
    this.isDragging = false;
    if (this.targetBall) {
      const physPos = this.targetBall.body.getPosition();
      this.targetBall.view.x = physPos.x * APP_CONFIG.PHYSICS.SCALE;
      this.targetBall.view.y = physPos.y * APP_CONFIG.PHYSICS.SCALE;
    }
    this.clearVisuals();
  }

  public isCurrentlyAiming(): boolean {
    return this.isDragging;
  }

  public getAimState(): AimState | null {
    if (!this.isDragging || !this.targetBall) return null;

    const physPos = this.targetBall.body.getPosition();
    const anchorX = physPos.x * APP_CONFIG.PHYSICS.SCALE;
    const anchorY = physPos.y * APP_CONFIG.PHYSICS.SCALE;

    const rawDx = this.currentDragX - this.dragStartX;
    const rawDy = this.currentDragY - this.dragStartY;
    const dist = Math.hypot(rawDx, rawDy);

    if (dist < 3) return null;

    // Clamped pull distance
    const clampedDist = Math.min(dist, APP_CONFIG.AIM.MAX_DRAG_DISTANCE);
    const powerPercent = Math.max(
      0,
      Math.min(
        1,
        (clampedDist - APP_CONFIG.AIM.MIN_DRAG_DISTANCE) /
          (APP_CONFIG.AIM.MAX_DRAG_DISTANCE - APP_CONFIG.AIM.MIN_DRAG_DISTANCE)
      )
    );

    // Pull direction (towards finger)
    const pullDirX = rawDx / dist;
    const pullDirY = rawDy / dist;

    // Launch direction (opposite to pull)
    const launchDirX = -pullDirX;
    const launchDirY = -pullDirY;

    const ballVisualX = anchorX;
    const ballVisualY = anchorY;

    const totalImpulse = Math.max(2.5, powerPercent * APP_CONFIG.AIM.MAX_LAUNCH_IMPULSE) * this.speedMultiplier;
    const impulse = planck.Vec2(launchDirX * totalImpulse, launchDirY * totalImpulse);

    return {
      isAiming: true,
      anchorX,
      anchorY,
      ballVisualX,
      ballVisualY,
      dragDistance: dist,
      powerPercent,
      launchDirection: { x: launchDirX, y: launchDirY },
      launchImpulse: impulse,
    };
  }

  public update(): void {
    const state = this.getAimState();
    if (!state || state.dragDistance < APP_CONFIG.AIM.MIN_DRAG_DISTANCE || !this.targetBall) {
      this.clearVisuals();
      return;
    }

    this.bandsGraphics.clear();
    this.arrowGraphics.clear();

    const ax = state.anchorX;
    const ay = state.anchorY;
    const power = state.powerPercent;
    const color = power > 0.75 ? 0xff007f : power > 0.4 ? 0xfacc15 : 0x00f0ff;

    // 1. Draw Anchor Reticle
    this.bandsGraphics
      .circle(ax, ay, this.targetBall.radius + 3)
      .stroke({ width: 1.5, color: 0xffffff, alpha: 0.4 });

    // 2. Draw Launch Directional Arrow projecting forward from anchor
    const arrowLen = 45 + power * 85;
    const arrowEndX = ax + state.launchDirection.x * arrowLen;
    const arrowEndY = ay + state.launchDirection.y * arrowLen;

    // Arrow line
    this.arrowGraphics
      .moveTo(ax, ay)
      .lineTo(arrowEndX, arrowEndY)
      .stroke({ width: 4.5, color, alpha: 0.95, cap: 'round' });

    // Arrow head
    const headAngle = Math.atan2(state.launchDirection.y, state.launchDirection.x);
    const headLen = 16;
    const h1X = arrowEndX - Math.cos(headAngle - 0.5) * headLen;
    const h1Y = arrowEndY - Math.sin(headAngle - 0.5) * headLen;
    const h2X = arrowEndX - Math.cos(headAngle + 0.5) * headLen;
    const h2Y = arrowEndY - Math.sin(headAngle + 0.5) * headLen;

    this.arrowGraphics
      .poly([arrowEndX, arrowEndY, h1X, h1Y, h2X, h2Y])
      .fill({ color, alpha: 0.95 });

    // 3. Power percentage text
    const percentInt = Math.round(power * 100);
    this.powerText.text = `${percentInt}%`;
    this.powerText.style.fill = color;
    this.powerText.x = ax;
    this.powerText.y = ay + this.targetBall.radius + 20;
    this.powerText.visible = true;
  }

  private clearVisuals(): void {
    this.bandsGraphics.clear();
    this.arrowGraphics.clear();
    this.powerText.visible = false;
  }
}
