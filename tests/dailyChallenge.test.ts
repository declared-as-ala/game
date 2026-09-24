import { describe, it, expect } from 'vitest';
import { generateDailyChallenge, hashDateString } from '@/levels/dailyChallenge';

describe('DailyChallenge Generator', () => {
  it('should deterministically generate the exact same challenge for a given date', () => {
    const dateKey = '2026-08-22';
    const challenge1 = generateDailyChallenge(dateKey);
    const challenge2 = generateDailyChallenge(dateKey);

    expect(challenge1.id).toBe('daily_2026-08-22');
    expect(challenge1.mode).toBe(challenge2.mode);
    expect(challenge1.arenaShape).toBe(challenge2.arenaShape);
    expect(challenge1.ballCount).toBe(challenge2.ballCount);
    expect(challenge1.rotationSpeed).toBe(challenge2.rotationSpeed);
    expect(challenge1.name).toBe(challenge2.name);
  });

  it('should generate different challenges for different dates', () => {
    const challengeA = generateDailyChallenge('2026-08-22');
    const challengeB = generateDailyChallenge('2026-11-15');

    expect(challengeA.id).not.toBe(challengeB.id);
    const hashA = hashDateString('2026-08-22');
    const hashB = hashDateString('2026-11-15');
    expect(hashA).not.toBe(hashB);
  });
});
