import type { LevelConfig, LevelResult } from '@/data/types';

export class ScoreSystem {
  private levelConfig: LevelConfig;
  private currentScore = 0;
  private combo = 1;
  private lastActionTime = 0;

  constructor(levelConfig: LevelConfig) {
    this.levelConfig = levelConfig;
  }

  public addPoints(basePoints: number, applyCombo = true): void {
    const now = performance.now();
    if (now - this.lastActionTime < 1800) {
      this.combo = Math.min(8, this.combo + 0.25);
    } else {
      this.combo = 1;
    }
    this.lastActionTime = now;

    const added = Math.round(basePoints * (applyCombo ? this.combo : 1));
    this.currentScore += added;
  }

  public getScore(): number {
    return this.currentScore;
  }

  public getCombo(): number {
    return Math.round(this.combo * 10) / 10;
  }

  public calculateStars(result: {
    completed: boolean;
    timeSeconds: number;
    attemptsUsed: number;
    rebounds: number;
    ballsSaved: number;
  }): number {
    const isEndless = this.levelConfig.id.startsWith('endless') || this.levelConfig.levelNumber === 0;
    if (!result.completed && !isEndless) return 0;

    const t = this.levelConfig.stars;
    const mode = this.levelConfig.mode;

    switch (mode) {
      case 'escape': {
        if (this.levelConfig.objective.type === 'escape_squares') {
          if (result.timeSeconds <= t.threeStar) return 3;
          if (result.timeSeconds <= t.twoStar) return 2;
          return 1;
        }
        if (result.attemptsUsed <= t.threeStar) return 3;
        if (result.attemptsUsed <= t.twoStar) return 2;
        return 1;
      }
      case 'evolution-spikes': {
        // Star 1: Survived min rebounds (t.oneStar)
        // Star 2: >= t.twoStar rebounds
        // Star 3: >= t.threeStar rebounds
        if (result.rebounds >= t.threeStar) return 3;
        if (result.rebounds >= t.twoStar) return 2;
        if (result.rebounds >= t.oneStar) return 1;
        return isEndless ? 0 : 1;
      }
      case 'neon-maze': {
        // Star 1: Reached goal
        // Star 2: Time <= t.twoStar
        // Star 3: Time <= t.threeStar
        if (result.timeSeconds <= t.threeStar) return 3;
        if (result.timeSeconds <= t.twoStar) return 2;
        return 1;
      }
      case 'neon-impact': {
        // Based on rebounds / score
        if (result.rebounds >= t.threeStar) return 3;
        if (result.rebounds >= t.twoStar) return 2;
        if (result.rebounds >= t.oneStar) return 1;
        return isEndless ? 0 : 1;
      }
      case 'neon-shatter': {
        // Star 1: Cleared bricks
        // Star 2: Time <= t.twoStar
        // Star 3: Time <= t.threeStar
        if (result.timeSeconds <= t.threeStar) return 3;
        if (result.timeSeconds <= t.twoStar) return 2;
        return 1;
      }
      case 'orbit-leap': {
        // Star 1: Reached golden arrival core
        // Star 2: Time <= t.twoStar
        // Star 3: Time <= t.threeStar
        if (result.timeSeconds <= t.threeStar) return 3;
        if (result.timeSeconds <= t.twoStar) return 2;
        return 1;
      }
      default:
        return 1;
    }
  }

  public finalizeResult(data: {
    completed: boolean;
    timeSeconds: number;
    attemptsUsed: number;
    rebounds: number;
    ballsSaved: number;
  }): LevelResult {
    const stars = this.calculateStars(data);
    const isEndless = this.levelConfig.id.startsWith('endless') || this.levelConfig.levelNumber === 0;

    // Add time bonus
    const timeBonus = data.completed ? Math.max(0, Math.round((60 - data.timeSeconds) * 40)) : 0;
    const finalScore = this.currentScore + timeBonus;

    return {
      completed: isEndless ? stars > 0 : data.completed,
      starsEarned: stars,
      score: finalScore,
      timeSeconds: Math.round(data.timeSeconds * 100) / 100,
      attemptsUsed: data.attemptsUsed,
      rebounds: data.rebounds,
      ballsSavedOrRemaining: data.ballsSaved,
    };
  }

  public reset(): void {
    this.currentScore = 0;
    this.combo = 1;
    this.lastActionTime = 0;
  }
}
