import type { Container } from 'pixi.js';
import type { PhysicsWorld } from '@/core/PhysicsWorld';
import type { LevelConfig } from '@/data/types';
import type { ScreenShake } from '@/effects/ScreenShake';
import type { BaseMode } from './BaseMode';
import { EscapeMode } from './EscapeMode';
import { NeonMazeMode } from './NeonMazeMode';
import { NeonImpactMode } from './NeonImpactMode';
import { EvolutionSpikesMode } from './EvolutionSpikesMode';
import { NeonShatterMode } from './NeonShatterMode';
import { MarbleEscapeMode } from './MarbleEscapeMode';

export class ModeFactory {
  public static createMode(
    config: LevelConfig,
    physics: PhysicsWorld,
    worldContainer: Container,
    screenShake: ScreenShake
  ): BaseMode {
    switch (config.mode) {
      case 'escape':
        return new EscapeMode(physics, worldContainer, config, screenShake);
      case 'neon-maze':
        return new NeonMazeMode(physics, worldContainer, config, screenShake);
      case 'neon-impact':
        return new NeonImpactMode(physics, worldContainer, config, screenShake);
      case 'evolution-spikes':
        return new EvolutionSpikesMode(physics, worldContainer, config, screenShake);
      case 'neon-shatter':
        return new NeonShatterMode(physics, worldContainer, config, screenShake);
      case 'orbit-leap':
        return new MarbleEscapeMode(physics, worldContainer, config, screenShake);
      default:
        return new EscapeMode(physics, worldContainer, config, screenShake);
    }
  }
}
