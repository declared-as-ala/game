import type { LevelConfig } from '@/data/types';
import type { Ball } from '@/entities/Ball';

export interface ObjectiveProgress {
  current: number;
  target: number;
  label: string;
  isWon: boolean;
  isLost: boolean;
  timeRemaining?: number;
  shotsRemaining?: number;
}

export class ObjectiveSystem {
  private config: LevelConfig;
  private timeElapsed = 0;
  private shotsUsed = 0;

  // Trackers
  private escapedCount = 0;
  private wallImpacts = 0;
  private currentBallPopulation = 1;
  private peakBallPopulation = 1;
  private isPlayerAlive = true;
  private boxesRemaining = 6;
  private totalBoxes = 6;
  private shatteredBricks = 0;
  private orbitStation = 1;
  private totalOrbitStations = 4;
  private nextOrbitLabel = '02';

  constructor(config: LevelConfig) {
    this.config = config;
    if (config.nestedSquares) {
      this.totalBoxes = config.nestedSquares.length;
      this.boxesRemaining = this.totalBoxes;
    } else if (config.objective.totalSquares) {
      this.totalBoxes = config.objective.totalSquares;
      this.boxesRemaining = this.totalBoxes;
    }
    if (config.orbitStations) {
      this.totalOrbitStations = config.orbitStations.length;
    }
  }

  public onOrbitReached(stationIndex: number, totalStations: number, nextLabel = ''): void {
    this.orbitStation = stationIndex + 1;
    this.totalOrbitStations = totalStations;
    this.nextOrbitLabel = nextLabel;
  }

  public registerShot(): void {
    this.shotsUsed++;
  }

  public onBallEscaped(): void {
    this.escapedCount++;
  }

  public setEscapedCount(count: number): void {
    this.escapedCount = count;
  }

  public onSquareEscaped(remaining: number, total: number): void {
    this.boxesRemaining = remaining;
    this.totalBoxes = total;
    this.escapedCount = total - remaining;
  }

  public onWallImpact(): void {
    this.wallImpacts++;
  }

  public updatePopulation(count: number): void {
    this.currentBallPopulation = count;
    if (count > this.peakBallPopulation) {
      this.peakBallPopulation = count;
    }
  }

  public getCurrentPopulation(): number {
    return this.currentBallPopulation;
  }

  public setPlayerDead(): void {
    this.isPlayerAlive = false;
  }

  public setShatteredBricks(count: number): void {
    this.shatteredBricks = count;
  }

  public getShatteredBricks(): number {
    return this.shatteredBricks;
  }

  private getShapeNoun(plural = false): string {
    const shape = this.config.nestedSquares?.[0]?.shape || this.config.arenaShape || 'square';
    switch (shape) {
      case 'diamond':
        return plural ? 'losanges' : 'losange';
      case 'heart':
        return plural ? 'hearts' : 'heart';
      case 'hexagon':
        return plural ? 'hexagons' : 'hexagon';
      case 'circle':
        return plural ? 'circles' : 'circle';
      case 'triangle':
        return plural ? 'triangles' : 'triangle';
      case 'pentagon':
        return plural ? 'pentagons' : 'pentagon';
      case 'square':
      case 'nested-boxes':
        return plural ? 'squares' : 'square';
      default:
        return plural ? 'shapes' : 'shape';
    }
  }

  public update(dt: number, activeBalls: Ball[]): ObjectiveProgress {
    this.timeElapsed += dt;
    const obj = this.config.objective;
    const timeLimit = obj.timeLimit;
    const shotLimit = obj.shotLimit;

    const timeRemaining = timeLimit !== undefined ? Math.max(0, timeLimit - this.timeElapsed) : undefined;
    const shotsRemaining = shotLimit !== undefined ? Math.max(0, shotLimit - this.shotsUsed) : undefined;

    let current = 0;
    let target = obj.targetCount || 1;
    let label = '';
    let isWon = false;
    let isLost = false;

    // Time limit failure
    if (timeLimit !== undefined && this.timeElapsed >= timeLimit) {
      isLost = true;
    }

    // Shot limit failure (if out of shots and balls have stopped moving)
    const allBallsStopped = activeBalls.every((b) => b.getSpeed() < 0.2);
    if (shotLimit !== undefined && this.shotsUsed >= shotLimit && allBallsStopped) {
      isLost = true;
    }

    switch (obj.type) {
      case 'escape_squares': {
        current = this.totalBoxes - this.boxesRemaining;
        target = this.totalBoxes;
        const shapeSingular = this.getShapeNoun(false);
        const shapePlural = this.getShapeNoun(true);
        if (this.boxesRemaining <= 0) {
          label = `ALL ${shapePlural.toUpperCase()} ESCAPED! ✨`;
          isWon = true;
        } else {
          label = this.boxesRemaining === 1 ? `1 ${shapeSingular} remaining` : `${this.boxesRemaining} ${shapePlural} remaining`;
        }
        if (!this.isPlayerAlive) isLost = true;
        break;
      }
      case 'escape_balls': {
        current = this.escapedCount;
        target = obj.targetCount || this.config.ballCount || 1;
        const inBox = activeBalls.length;
        label = `Escaped: ${current}/${target}${inBox > 0 ? ` (${inBox} in box)` : ''}`;
        if (current >= target) {
          isWon = true;
        } else if (activeBalls.length === 0) {
          isLost = true;
        }
        break;
      }
      case 'reach_target_point': {
        current = this.escapedCount >= 1 ? 1 : 0;
        target = 1;
        if (this.escapedCount >= 1) {
          isWon = true;
          label = 'CORE REACHED! 🌟';
        } else if (!this.isPlayerAlive || (activeBalls.length === 0 && this.shotsUsed > 0)) {
          isLost = true;
          label = 'FAILED';
        } else {
          label = 'Reach The Core';
        }
        break;
      }
      case 'touch_walls_impact': {
        const playerBall = activeBalls.find((b) => b.type === 'player' && !b.isDestroyed);
        current = playerBall ? playerBall.rebounds : this.wallImpacts;
        target = obj.targetCount || 20;
        const isEndless = target >= 9999;
        if (!isEndless && current >= target) {
          isWon = true;
          label = `GOAL REACHED! 🌟 (${current}/${target})`;
        } else if (isEndless) {
          let starBadge = '';
          if (current >= 50) {
            starBadge = ' ⭐⭐⭐';
          } else if (current >= 20) {
            starBadge = ' ⭐⭐';
          } else if (current >= 5) {
            starBadge = ' ⭐';
          }
          label = `Impacts: ${current}${starBadge}`;
        } else {
          label = `Impacts: ${current}/${target}`;
        }
        if (!this.isPlayerAlive || (activeBalls.length === 0 && !isWon)) {
          isLost = true;
        }
        break;
      }
      case 'survive_rebounds': {
        const playerBall = activeBalls.find((b) => b.type === 'player' && !b.isDestroyed);
        current = playerBall ? playerBall.rebounds : 0;
        target = obj.targetCount || 20;

        const tier = playerBall ? playerBall.evolutionTier : 0;
        const tierNames = ['', ' • Aura Tier 1', ' • Plasma Tier 2', ' • Supernova Tier 3'];
        const tierSuffix = tier > 0 ? tierNames[Math.min(tier, 3)] : '';

        if (current >= target) {
          isWon = true;
          label = `EVOLUTION TRANSCENDED! (${current}/${target})`;
        } else {
          label = `Bounces: ${current}/${target}${tierSuffix}`;
        }

        if (!this.isPlayerAlive || (activeBalls.length === 0 && !isWon)) {
          isLost = true;
        }
        break;
      }
      case 'shatter_bricks': {
        current = this.shatteredBricks;
        target = obj.targetCount || 16;
        if (current >= target) {
          isWon = true;
          label = `ALL BRICKS SHATTERED! 🌟 (${current}/${target})`;
        } else {
          label = `Bricks: ${current}/${target} Shattered 🧱`;
        }
        if (!this.isPlayerAlive || (activeBalls.length === 0 && !isWon)) {
          isLost = true;
        }
        break;
      }
      case 'reach_core': {
        current = this.orbitStation || 1;
        target = this.totalOrbitStations || obj.targetCount || 4;
        if (current >= target) {
          isWon = true;
          label = `GOLDEN CORE REACHED! 🌟 (${current}/${target})`;
        } else {
          label = `Waypoint ${current}/${target} • Leap to ${this.nextOrbitLabel || `0${current + 1}`} 🚀`;
        }
        if (!this.isPlayerAlive) {
          isLost = true;
        }
        break;
      }
    }

    if (isWon) isLost = false;

    return {
      current,
      target,
      label,
      isWon,
      isLost,
      timeRemaining,
      shotsRemaining,
    };
  }

  public getTimeElapsed(): number {
    return this.timeElapsed;
  }

  public getShotsUsed(): number {
    return this.shotsUsed;
  }

  public getEscapedCount(): number {
    return this.escapedCount;
  }

  public getWallImpacts(): number {
    return this.wallImpacts;
  }

  public reset(): void {
    this.timeElapsed = 0;
    this.shotsUsed = 0;
    this.escapedCount = 0;
    this.wallImpacts = 0;
    this.currentBallPopulation = 1;
    this.peakBallPopulation = 1;
    this.isPlayerAlive = true;
    this.shatteredBricks = 0;
  }
}
