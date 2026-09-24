import { describe, it, expect } from 'vitest';
import { SaveManager } from '@/core/SaveManager';

describe('SaveManager Progression & Unlocks', () => {
  it('should correctly evaluate level unlock progression', async () => {
    const save = SaveManager.getInstance();
    await save.resetProgress();

    // Level 1 should always be unlocked initially
    expect(save.isLevelUnlocked('escape', 1)).toBe(true);
    // Level 2 should initially be locked
    expect(save.isLevelUnlocked('escape', 2)).toBe(false);

    // Complete Level 1 with 3 stars
    await save.saveLevelResult('escape_1', {
      completed: true,
      starsEarned: 3,
      score: 12000,
      timeSeconds: 8.2,
      attemptsUsed: 1,
      rebounds: 10,
      ballsSavedOrRemaining: 10,
    });

    // Level 2 should now be unlocked!
    expect(save.isLevelUnlocked('escape', 2)).toBe(true);
    expect(save.isLevelUnlocked('escape', 3)).toBe(false);

    // Total stars should equal 3
    expect(save.getData().totalStars).toBe(3);
  });
});
