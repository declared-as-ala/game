import type { UserSettings } from '@/data/types';

export const APP_CONFIG = {
  appName: 'SatisfyBall',
  version: '1.0.0',
  
  // Physics constants
  PHYSICS: {
    SCALE: 50, // 50 pixels = 1 meter in Planck.js
    TIME_STEP: 1 / 60,
    VELOCITY_ITERATIONS: 8,
    POSITION_ITERATIONS: 3,
    MAX_SUB_STEPS: 4,
    MAX_DELTA_TIME: 0.1, // Clamp spiral of death
    DEFAULT_RESTITUTION: 0.98,
    DEFAULT_FRICTION: 0.0,
    MAX_BALL_SPEED: 45.0, // m/s
    MIN_BALL_SPEED_CUTOFF: 0.15,
  },

  // Slingshot Aim constants
  AIM: {
    MIN_DRAG_DISTANCE: 12, // px threshold before registering aim
    MAX_DRAG_DISTANCE: 180, // px max slingshot pull
    MAX_LAUNCH_IMPULSE: 5.0, // N*s
    TRAJECTORY_POINTS: 28,
    TRAJECTORY_STEP_DT: 0.035,
    TRAJECTORY_MAX_BOUNCES: 2,
  },

  // Population and Object Pool Limits
  LIMITS: {
    MAX_BALLS_HIGH: 140,
    MAX_BALLS_BALANCED: 100,
    MAX_BALLS_LOW: 60,
    MAX_PARTICLES_HIGH: 600,
    MAX_PARTICLES_BALANCED: 350,
    MAX_PARTICLES_LOW: 150,
    COLLISION_PAIR_COOLDOWN_MS: 160, // Minimum delay between 2 specific balls re-spawning
    MAX_CONCURRENT_AUDIO_HITS: 4,
    AUDIO_HIT_COOLDOWN_MS: 35,
  },

  // Aesthetic Colors
  COLORS: {
    BG_DARK: 0x07070c,
    ARENA_NEON_DEFAULT: 0x00f0ff,
    ARENA_NEON_MAGENTA: 0xff007f,
    ARENA_NEON_PURPLE: 0xa855f7,
    ARENA_NEON_LIME: 0x10b981,
    ARENA_NEON_GOLD: 0xffd700,
    ARENA_NEON_WHITE: 0xffffff,
    BALL_DEFAULT: 0x00f0ff,
    BALL_PLAYER: 0x00f0ff,
    BALL_ENEMY: 0xff0055,
    BALL_OFFSPRING: 0xa855f7,
    SPIKE_HAZARD: 0xff2244,
    EXIT_PORTAL: 0x00ff88,
  },

  // Default User Settings
  DEFAULT_SETTINGS: {
    masterVolume: 0.85,
    sfxVolume: 0.9,
    musicVolume: 0.7,
    hapticsEnabled: true,
    screenShakeEnabled: true,
    slowMotionEnabled: true,
    qualityTier: 'high',
    reducedMotion: false,
  } as UserSettings,
};
