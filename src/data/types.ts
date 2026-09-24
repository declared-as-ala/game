export type GameMode =
  | 'escape'
  | 'neon-maze'
  | 'neon-impact'
  | 'evolution-spikes'
  | 'neon-shatter'
  | 'orbit-leap';

export type ArenaShape =
  | 'nested-boxes'
  | 'square'
  | 'circle'
  | 'triangle'
  | 'pentagon'
  | 'hexagon'
  | 'diamond'
  | 'heart'
  | 'concentric-rings';

export type QualityTier = 'high' | 'balanced' | 'low';

export interface Vector2D {
  x: number;
  y: number;
}

export interface BrickConfig {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp?: number;
  color?: number;
  isArmored?: boolean;
}

export interface SingularityConfig {
  x: number;
  y: number;
  mass: number;
  eventHorizonRadius: number;
  color?: number;
}

export interface OrbitalCoreConfig {
  id: string;
  radius: number;
  angle: number;
  orbitSpeed: number;
  color?: number;
}

export interface NestedSquareConfig {
  id?: number | string;
  shape?: ArenaShape;
  size: number; // Half-side / radius in pixels
  color: number; // Neon hex color
  speed?: number; // Speed of moving gap along perimeter
  gap?: number; // Initial normalized gap position (0.0 to 1.0)
  openingSide?: 'top' | 'right' | 'bottom' | 'left' | 'angle';
  openingAngle?: number; // radians
  openingWidth?: number; // opening gap width in pixels
  rotationSpeed?: number; // rad/s
  initialRotation?: number;
}

export interface ObstacleConfig {
  id: string;
  type: 'static-wall' | 'moving-bar' | 'rotating-cross' | 'spike' | 'exit-portal' | 'ring-gate';
  x: number; // Normalized -1 to 1 (arena space)
  y: number;
  width?: number;
  height?: number;
  size?: number;
  radius?: number;
  rotation?: number;
  rotationSpeed?: number; // rad/s
  movePath?: Vector2D[];
  moveSpeed?: number;
  openingAngle?: number; // for ring gates (rad)
  openingWidth?: number; // angle width (rad)
}

export interface ObjectiveConfig {
  type:
    | 'escape_squares'
    | 'escape_balls'
    | 'reach_target_point'
    | 'reach_core'
    | 'touch_walls_impact'
    | 'survive_rebounds'
    | 'shatter_bricks'
    | 'collect_cores'
    | 'last_ball_standing';
  targetCount?: number; // e.g. 6 squares, 10 balls escaped, 25 rebounds, 20 bricks, 4 stations
  totalSquares?: number;
  timeLimit?: number; // in seconds (optional)
  shotLimit?: number; // in shots (optional)
  maxOverflow?: number;
  minRebounds?: number;
  sectorsRequired?: number;
}

export interface StarThresholds {
  oneStar: number; // Base condition met
  twoStar: number; // e.g. <= 3 attempts, or <= 20s, or 20 rebounds
  threeStar: number; // e.g. <= 1 attempt, or <= 10s, or 30 rebounds
  criteriaDescription: {
    star1: string;
    star2: string;
    star3: string;
  };
}

export interface LevelConfig {
  id: string; // e.g. "escape_1", "orbit_1"
  mode: GameMode;
  levelNumber: number; // 1 to 6
  name: string;
  description: string;
  arenaShape: ArenaShape;
  arenaSize: number; // Radius/Half-width in pixels (scaled)
  arenaOpening?: {
    side: 'top' | 'right' | 'bottom' | 'left' | 'angle';
    angle?: number;
    width: number; // normalized opening size or radians
    moves?: boolean;
    moveSpeed?: number;
  };
  rotationSpeed?: number; // Arena rotation speed rad/s
  rings?: Array<{
    radiusRatio: number; // 0.3, 0.6, 0.9
    openingAngle?: number;
    openingWidth?: number;
    rotationSpeed?: number;
    closed?: boolean;
    color?: number;
  }>;
  nestedSquares?: NestedSquareConfig[];
  arenaColor?: number;
  spikeCount?: number;
  spikeSpeed?: number;
  ballCount: number;
  initialBallPositions?: Vector2D[];
  obstacles: ObstacleConfig[];
  bricks?: BrickConfig[];
  singularities?: SingularityConfig[];
  orbitalCores?: OrbitalCoreConfig[];
  objective: ObjectiveConfig;
  stars: StarThresholds;
  gravity?: Vector2D;
  restitution?: number; // Bounce elasticity (default 0.98)
  friction?: number; // default 0.0

  // Orbit Gravity Game Types & Parameters
  orbitPlanets?: OrbitPlanetConfig[];
  orbitHazards?: OrbitHazardConfig[];
  tutorialMessage?: string;
  optimalLaunches?: number;
  ballStartAngle?: number;

  // Marble Escape: player-controlled spinning needle through the arena center
  needle?: {
    length?: number; // pixels, spans through the center (default ~1.8x arena radius)
    thickness?: number; // pixels (default 12)
    startAngle?: number; // radians (default 0)
    sensitivity?: number; // drag-pixels to rad/s conversion (default 0.05)
    damping?: number; // per-second angular velocity decay rate (default 0.6)
    maxAngularSpeed?: number; // rad/s clamp (default 7)
    color?: number;
  };

  // Legacy fallback support for orbitStations and hazardSpikes if needed
  orbitStations?: Array<{
    x: number;
    y: number;
    radius: number;
    color?: number;
    label?: string;
  }>;
  orbitSpeed?: number;
  launchSpeed?: number;
  showAim?: boolean;
  hazardSpikes?: Array<{
    x: number;
    y: number;
    size?: number;
    rotationSpeed?: number;
  }>;
}

export interface OrbitPlanetConfig {
  x: number; // Normalized coordinate (-1 to 1 in arena bounds)
  y: number;
  radius?: number; // Visual core radius (default ~14-20)
  orbitRadius: number; // Orbital ring radius in pixels
  angularSpeed?: number; // Angular speed (rad/s, default ~1.25)
  direction?: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
  captureRadius?: number; // Gravitational capture radius in pixels (defaults to orbitRadius + 22)
  gravityStrength?: number; // Gravitational acceleration multiplier (default 1.0)
  color?: number; // Neon color (e.g. 0x00f0ff, 0xa855f7, 0x00ff88, 0xff007f, 0xffda67)
  type?: 'start' | 'normal' | 'goal' | 'switch' | 'temporary';
  label?: string; // Optional label (e.g. "START", "GOAL", "02")
  movePath?: { startX: number; startY: number; endX: number; endY: number; speed: number };
  maxRotations?: number; // For temporary decaying orbits
}

export interface OrbitHazardConfig {
  type?: 'triangle';
  x: number; // Normalized position (-1 to 1)
  y: number;
  size?: number; // Triangle size in pixels (default ~14-18)
  rotation?: number; // Initial angle
  rotationSpeed?: number; // rad/s
  movementType?: 'static' | 'rotate' | 'patrol' | 'orbit_planet';
  patrol?: { startX: number; startY: number; endX: number; endY: number; speed: number };
  orbitPlanetIndex?: number;
  orbitDistance?: number;
  orbitSpeed?: number;
}

export interface LevelResult {
  completed: boolean;
  starsEarned: number;
  score: number;
  timeSeconds: number;
  attemptsUsed: number;
  rebounds: number;
  ballsSavedOrRemaining: number;
}

export interface UserSettings {
  masterVolume: number; // 0 to 1
  sfxVolume: number;
  musicVolume: number;
  hapticsEnabled: boolean;
  screenShakeEnabled: boolean;
  slowMotionEnabled: boolean;
  qualityTier: QualityTier;
  reducedMotion: boolean;
}

export interface CosmeticsState {
  selectedBallSkin: string;
  selectedTrail: string;
  selectedImpactEffect: string;
  selectedArenaTheme: string;
  unlockedSkins: string[];
  unlockedTrails: string[];
  unlockedEffects: string[];
  unlockedThemes: string[];
}

export interface SaveData {
  version: number;
  totalStars: number;
  completedLevels: Record<string, {
    stars: number;
    bestScore: number;
    bestTime: number;
    attempts: number;
    completedAt: number;
  }>;
  unlockedModes: GameMode[];
  cosmetics: CosmeticsState;
  settings: UserSettings;
  dailyChallengeHistory: Record<string, {
    completed: boolean;
    score: number;
    stars: number;
  }>;
  firstTimeOnboardingDone: boolean;
  createdAt: number;
  updatedAt: number;
}
