import type { GameMode } from './types';

export interface ModeInfo {
  id: GameMode;
  title: string;
  subtitle: string;
  tagline: string;
  colorHex: string;
  colorNumber: number;
  iconSvg: string;
  description: string;
  totalLevels: number;
}

export const MODES_DATA: Record<GameMode, ModeInfo> = {
  escape: {
    id: 'escape',
    title: 'Escape Squares',
    subtitle: 'Concentric Boxes',
    tagline: 'Break out of nested neon square boxes',
    colorHex: '#00f0ff',
    colorNumber: 0x00f0ff,
    description:
      'Aim and launch the glowing sphere from the innermost core out of all concentric square boxes. Enjoy satisfying ASMR ascending chimes as each box dissolves!',
    totalLevels: 6,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/><rect x="10" y="10" width="4" height="4"/></svg>`,
  },
  'neon-maze': {
    id: 'neon-maze',
    title: 'Neon Maze',
    subtitle: 'Concentric Rings',
    tagline: 'Navigate through rotating neon gates',
    colorHex: '#a855f7',
    colorNumber: 0xa855f7,
    description:
      'Time your launch to penetrate through multiple rotating concentric rings and reach the inner glowing core.',
    totalLevels: 6,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  },
  'neon-impact': {
    id: 'neon-impact',
    title: 'Neon Impact',
    subtitle: 'Evolution VS Spikes',
    tagline: 'Expand your sphere, weave neon webs & reach target impacts',
    colorHex: '#ff007f',
    colorNumber: 0xff007f,
    description:
      'Reach the target number of wall impacts to win! Your sphere expands and shifts color with harmonic synth notes on every bounce. Dodge the moving perimeter spikes as your growing ball fills the arena!',
    totalLevels: 6,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  },
  'evolution-spikes': {
    id: 'evolution-spikes',
    title: 'Evolution Spikes',
    subtitle: 'Bounce & Evolve',
    tagline: 'Ricochet safely to evolve your sphere • Dodge spikes',
    colorHex: '#10b981',
    colorNumber: 0x10b981,
    description:
      'Aim & launch your kinetic sphere! Each safe wall bounce charges energy to evolve your sphere through 3 Ascension Tiers (Emerald -> Cyber Cyan -> Astral Violet -> Solar Supernova). Dodge all red hazard spikes to reach the target evolution!',
    totalLevels: 6,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  },
  'neon-shatter': {
    id: 'neon-shatter',
    title: 'Neon Shatter',
    subtitle: 'Kinetic Crystal Destroyer',
    tagline: 'Shatter neon bricks with glass ASMR harmonics',
    colorHex: '#ffe000',
    colorNumber: 0xffe000,
    description:
      'Shatter glowing geometric crystal bricks with satisfying kinetic ricochets! Enjoy ascending glass chime notes, screen shake impacts, and power-up explosions as you clear each chamber.',
    totalLevels: 6,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  },
  'orbit-leap': {
    id: 'orbit-leap',
    title: 'Marble Escape',
    subtitle: 'Spin The Needle',
    tagline: 'Spin the needle to knock marbles out through the rotating gap',
    colorHex: '#ffaa00',
    colorNumber: 0xffaa00,
    description:
      'Drag left or right to spin a glowing needle through the center of the arena! Use it to knock the bouncing marbles toward the rotating exit gap in the outer wall before time runs out.',
    totalLevels: 6,
    iconSvg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>`,
  },
};
