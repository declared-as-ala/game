import { BaseMode } from './BaseMode';
import { Arena } from '@/entities/Arena';
import { ExitPortal } from '@/entities/ExitPortal';

export class NeonMazeMode extends BaseMode {
  public init(): void {
    const cx = 0;
    const cy = 0;

    // Balls launch noticeably slower in this mode than the rest of the game
    this.aimSystem.speedMultiplier = 1 / 3;

    // 1. Build Concentric Arena
    this.arena = new Arena(this.physics, this.worldContainer, {
      shape: 'concentric-rings',
      centerX: cx,
      centerY: cy,
      radius: this.config.arenaSize,
      color: 0xa855f7,
      rings: this.config.rings,
    });

    // 2. Build Central Goal Portal strictly inside the innermost ring
    const rings = this.config.rings || [];
    const innermostRatio = rings.length > 0
      ? rings.reduce((min, r) => (r.radiusRatio < min ? r.radiusRatio : min), rings[0].radiusRatio)
      : 0.25;
    const coreRadius = Math.max(16, Math.min(28, this.config.arenaSize * innermostRatio * 0.75));

    this.exitPortal = new ExitPortal(this.physics, this.worldContainer, {
      id: 'maze_core_exit',
      x: cx,
      y: cy,
      radius: coreRadius,
      color: 0x00ff88,
    });

    // 3. Build Obstacles
    this.buildObstacles();

    // 4. Spawn Player Ball in the outermost corridor (inside the closed outer circle)
    const startY = cy + this.config.arenaSize * 0.91;
    const ball = this.createPlayerBall(cx, startY, 11);
    if (ball && ball.fixture) {
      ball.fixture.setRestitution(0.96);
      ball.fixture.setFriction(0.0);
    }
  }
}
