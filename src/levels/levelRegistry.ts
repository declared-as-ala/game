import type { GameMode, LevelConfig } from '@/data/types';
import { ESCAPE_LEVELS } from './escapeLevels';
import { MAZE_LEVELS } from './mazeLevels';
import { IMPACT_LEVELS } from './impactLevels';
import { SPIKES_LEVELS } from './spikesLevels';
import { SHATTER_LEVELS } from './shatterLevels';
import { MARBLE_ESCAPE_LEVELS } from './marbleEscapeLevels';
import { generateDailyChallenge } from './dailyChallenge';

export class LevelRegistry {
  private static allLevels: Record<GameMode, LevelConfig[]> = {
    escape: ESCAPE_LEVELS,
    'neon-maze': MAZE_LEVELS,
    'neon-impact': IMPACT_LEVELS,
    'evolution-spikes': SPIKES_LEVELS,
    'neon-shatter': SHATTER_LEVELS,
    'orbit-leap': MARBLE_ESCAPE_LEVELS,
  };

  public static getLevelsForMode(mode: GameMode): LevelConfig[] {
    return this.allLevels[mode] || [];
  }

  public static getLevel(mode: GameMode, levelNumber: number): LevelConfig | null {
    const list = this.allLevels[mode];
    if (!list) return null;
    return list.find((lvl) => lvl.levelNumber === levelNumber) || null;
  }

  public static getLevelById(id: string): LevelConfig | null {
    if (id.startsWith('daily_')) {
      const dateKey = id.replace('daily_', '');
      return generateDailyChallenge(dateKey);
    }

    for (const mode in this.allLevels) {
      const found = this.allLevels[mode as GameMode].find((lvl) => lvl.id === id);
      if (found) return found;
    }
    return null;
  }

  public static getEndlessConfig(mode: 'neon-impact' | 'evolution-spikes'): LevelConfig {
    if (mode === 'neon-impact') {
      return {
        id: 'endless_impact',
        mode: 'neon-impact',
        levelNumber: 0,
        name: 'Endless Impact',
        description: 'Endless high score mode. How many impacts can you sustain?',
        arenaShape: 'hexagon',
        arenaSize: 170,
        ballCount: 1,
        obstacles: [],
        objective: {
          type: 'touch_walls_impact',
          targetCount: 999999, // Endless
        },
        stars: {
          oneStar: 5,
          twoStar: 20,
          threeStar: 50,
          criteriaDescription: {
            star1: '5 Impacts',
            star2: '20 Impacts',
            star3: '50 Impacts',
          },
        },
      };
    }

    return {
      id: 'endless_spikes',
      mode: 'evolution-spikes',
      levelNumber: 0,
      name: 'Endless Survival',
      description: 'Endless survival against moving spikes. Maximize rebounds and score!',
      arenaShape: 'circle',
      arenaSize: 165,
      ballCount: 1,
      obstacles: [
        {
          id: 'endless_spike_1',
          type: 'spike',
          x: 0,
          y: 0,
          size: 16,
          rotationSpeed: 1.8,
        },
      ],
      objective: {
        type: 'survive_rebounds',
        targetCount: 999999,
      },
      stars: {
        oneStar: 30,
        twoStar: 60,
        threeStar: 100,
        criteriaDescription: {
          star1: '30 Rebounds',
          star2: '60 Rebounds',
          star3: '100 Rebounds',
        },
      },
    };
  }
}
