import { describe, it, expect } from 'vitest';
import { ScoreSystem } from '@/systems/ScoreSystem';
import { ESCAPE_LEVELS } from '@/levels/escapeLevels';
import { SPIKES_LEVELS } from '@/levels/spikesLevels';
import { LevelRegistry } from '@/levels/levelRegistry';

describe('ScoreSystem', () => {
  it('should calculate correct 3-star score for Escape Mode based on attempts', () => {
    const level1 = ESCAPE_LEVELS[0];
    const scoreSystem = new ScoreSystem(level1);

    scoreSystem.addPoints(5000);

    // 1 attempt = 3 stars
    const result3 = scoreSystem.finalizeResult({
      completed: true,
      timeSeconds: 8.5,
      attemptsUsed: 1,
      rebounds: 12,
      ballsSaved: 10,
    });
    expect(result3.completed).toBe(true);
    expect(result3.starsEarned).toBe(3);
    expect(result3.score).toBeGreaterThan(5000);

    // 3 attempts = 2 stars
    const result2 = scoreSystem.finalizeResult({
      completed: true,
      timeSeconds: 15.0,
      attemptsUsed: 3,
      rebounds: 25,
      ballsSaved: 10,
    });
    expect(result2.starsEarned).toBe(2);

    // 5 attempts / > 22s = 1 star
    const result1 = scoreSystem.finalizeResult({
      completed: true,
      timeSeconds: 24.0,
      attemptsUsed: 5,
      rebounds: 40,
      ballsSaved: 10,
    });
    expect(result1.starsEarned).toBe(1);
  });

  it('should calculate correct stars for Spikes Mode based on rebound milestones', () => {
    const spikes1 = SPIKES_LEVELS[0]; // 1 star: 15, 2 stars: 22, 3 stars: 30
    const scoreSystem = new ScoreSystem(spikes1);

    expect(scoreSystem.calculateStars({
      completed: true,
      timeSeconds: 10,
      attemptsUsed: 1,
      rebounds: 32,
      ballsSaved: 1,
    })).toBe(3);

    expect(scoreSystem.calculateStars({
      completed: true,
      timeSeconds: 10,
      attemptsUsed: 1,
      rebounds: 24,
      ballsSaved: 1,
    })).toBe(2);

    expect(scoreSystem.calculateStars({
      completed: true,
      timeSeconds: 10,
      attemptsUsed: 1,
      rebounds: 16,
      ballsSaved: 1,
    })).toBe(1);
  });

  it('should return 0 stars when standard level is failed', () => {
    const level1 = ESCAPE_LEVELS[0];
    const scoreSystem = new ScoreSystem(level1);

    const result = scoreSystem.finalizeResult({
      completed: false,
      timeSeconds: 30,
      attemptsUsed: 3,
      rebounds: 5,
      ballsSaved: 2,
    });
    expect(result.starsEarned).toBe(0);
    expect(result.completed).toBe(false);
  });

  it('should calculate 1, 2, and 3 stars for Endless Impact at 5, 20, and 50 impacts', () => {
    const endlessConfig = LevelRegistry.getEndlessConfig('neon-impact');
    const scoreSystem = new ScoreSystem(endlessConfig);

    // < 5 impacts -> 0 stars
    expect(scoreSystem.calculateStars({
      completed: false,
      timeSeconds: 5,
      attemptsUsed: 1,
      rebounds: 4,
      ballsSaved: 1,
    })).toBe(0);

    // 5 impacts -> 1 star
    expect(scoreSystem.calculateStars({
      completed: false,
      timeSeconds: 6,
      attemptsUsed: 1,
      rebounds: 5,
      ballsSaved: 1,
    })).toBe(1);

    // 20 impacts -> 2 stars
    expect(scoreSystem.calculateStars({
      completed: false,
      timeSeconds: 15,
      attemptsUsed: 1,
      rebounds: 20,
      ballsSaved: 1,
    })).toBe(2);

    // 50 impacts -> 3 stars
    expect(scoreSystem.calculateStars({
      completed: false,
      timeSeconds: 35,
      attemptsUsed: 1,
      rebounds: 50,
      ballsSaved: 1,
    })).toBe(3);
  });

  it('should calculate correct stars for Orbit Leap Mode based on completion time', () => {
    const orbit1 = LevelRegistry.getLevel('orbit-leap', 1)!;
    const scoreSystem = new ScoreSystem(orbit1);

    expect(scoreSystem.calculateStars({
      completed: true,
      timeSeconds: 10,
      attemptsUsed: 1,
      rebounds: 0,
      ballsSaved: 1,
    })).toBe(3);

    expect(scoreSystem.calculateStars({
      completed: true,
      timeSeconds: 16,
      attemptsUsed: 1,
      rebounds: 0,
      ballsSaved: 1,
    })).toBe(2);

    expect(scoreSystem.calculateStars({
      completed: true,
      timeSeconds: 28,
      attemptsUsed: 1,
      rebounds: 0,
      ballsSaved: 1,
    })).toBe(1);
  });
});
