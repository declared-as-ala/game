import type { ArenaShape, GameMode, LevelConfig } from '@/data/types';

// Deterministic Pseudo-Random Generator (Mulberry32)
export function createPRNG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashDateString(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTodayDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function generateDailyChallenge(dateKey = getTodayDateKey()): LevelConfig {
  const seed = hashDateString(dateKey);
  const rand = createPRNG(seed);

  const modes: GameMode[] = ['orbit-leap', 'escape', 'neon-impact', 'neon-maze', 'evolution-spikes', 'neon-shatter'];
  const mode = modes[Math.floor(rand() * modes.length)];

  const shapes: ArenaShape[] = ['square', 'circle', 'triangle', 'pentagon', 'hexagon', 'diamond', 'heart'];
  const shape = mode === 'neon-maze' ? 'concentric-rings' : (mode === 'orbit-leap' ? 'circle' : shapes[Math.floor(rand() * shapes.length)]);

  const rotating = rand() > 0.45;
  const rotationSpeed = rotating ? 0.4 + rand() * 0.8 : 0;

  const names = ['Eclipse', 'Nebula', 'Vortex', 'Pulsar', 'Supernova', 'Chronos', 'Aegis', 'Titan'];
  const challengeName = `Daily: ${names[Math.floor(rand() * names.length)]} ${dateKey}`;

  let objective;
  let ballCount = 1;

  switch (mode) {
    case 'escape':
      ballCount = 15 + Math.floor(rand() * 15);
      objective = { type: 'escape_balls' as const, targetCount: ballCount };
      break;
    case 'neon-maze':
      ballCount = 1;
      objective = { type: 'reach_target_point' as const };
      break;
    case 'neon-impact':
      ballCount = 1;
      objective = { type: 'touch_walls_impact' as const, targetCount: 35 + Math.floor(rand() * 30) };
      break;
    case 'evolution-spikes':
      ballCount = 1;
      objective = { type: 'survive_rebounds' as const, targetCount: 25 + Math.floor(rand() * 15) };
      break;
    case 'neon-shatter':
      ballCount = 1;
      objective = { type: 'shatter_bricks' as const, targetCount: 20 };
      break;
    case 'orbit-leap':
      ballCount = 4 + Math.floor(rand() * 3);
      objective = { type: 'escape_balls' as const, targetCount: ballCount, timeLimit: 50 + Math.floor(rand() * 20) };
      break;
  }

  return {
    id: `daily_${dateKey}`,
    mode,
    levelNumber: 99,
    name: challengeName,
    description: `Special daily challenge for ${dateKey}. Earn maximum points on the daily leaderboard!`,
    arenaShape: shape,
    arenaSize: 165,
    arenaOpening: mode === 'escape' ? { side: 'right', width: 80 }
      : mode === 'orbit-leap' ? { side: 'angle' as const, angle: -Math.PI / 2, width: 0.16 + rand() * 0.08, moves: true, moveSpeed: 0.4 + rand() * 0.4 }
      : undefined,
    needle: mode === 'orbit-leap' ? { sensitivity: 0.06, damping: 0.5, maxAngularSpeed: 5.5 } : undefined,
    rings: mode === 'neon-maze' ? [
      { radiusRatio: 1.0, openingAngle: 0, openingWidth: 0, rotationSpeed: 0, closed: true, color: 0x00f0ff },
      { radiusRatio: 0.72, openingAngle: rand() * Math.PI * 2, openingWidth: 0.85, rotationSpeed: 0.75 },
      { radiusRatio: 0.44, openingAngle: rand() * Math.PI * 2, openingWidth: 1.05, rotationSpeed: -0.85 },
      { radiusRatio: 0.24, openingAngle: rand() * Math.PI * 2, openingWidth: 1.40, rotationSpeed: 0.95 },
    ] : undefined,
    rotationSpeed,
    ballCount,
    obstacles: mode === 'evolution-spikes' ? [
      { id: 'daily_spike_1', type: 'spike', x: 0, y: 0, size: 16, rotationSpeed: 1.5 },
    ] : [],
    objective,
    stars: {
      oneStar: 1,
      twoStar: 2,
      threeStar: 3,
      criteriaDescription: {
        star1: 'Complete objective',
        star2: 'Great score',
        star3: 'Master score',
      },
    },
  };
}
