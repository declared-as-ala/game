export type BallSizeType = 'small' | 'medium' | 'big';

export type BallRenderStyle = 'marble' | 'classic';

export interface BallSkinItem {
  id: string;
  name: string;
  color: number;
  glowColor: number;
  sizeType: BallSizeType;
  sizeMultiplier: number;
  unlockedByDefault: boolean;
  unlockCondition: string;
  starsRequired?: number;
  description?: string;
  renderStyle?: BallRenderStyle;
}

export interface TrailItem {
  id: string;
  name: string;
  type: 'line' | 'sparks' | 'plasma' | 'rainbow';
  unlockedByDefault: boolean;
  unlockCondition: string;
  starsRequired?: number;
  description?: string;
}

export interface ImpactEffectItem {
  id: string;
  name: string;
  type: 'ring' | 'sparks' | 'shockwave' | 'burst';
  unlockedByDefault: boolean;
  unlockCondition: string;
  starsRequired?: number;
  description?: string;
}

export interface ArenaThemeItem {
  id: string;
  name: string;
  bgHex: string;
  neonPrimary: number;
  neonSecondary: number;
  unlockedByDefault: boolean;
  unlockCondition: string;
  starsRequired?: number;
  description?: string;
}

export const COSMETICS_DATA = {
  skins: [
    // ==========================================
    // SMALL BALLS (Nimble, fast-feeling, compact)
    // ==========================================
    {
      id: 'skin_neon_pulse',
      name: 'Nano Emerald',
      color: 0x00ff88,
      glowColor: 0x00aa55,
      sizeType: 'small',
      sizeMultiplier: 0.72,
      unlockedByDefault: true,
      unlockCondition: 'Free Starter Ball',
      description: 'Nimble micro pulse orb — slips easily through tight gaps',
    },
    {
      id: 'skin_ice_comet',
      name: 'Glacial Dart',
      color: 0xfde047,
      glowColor: 0xca8a04,
      sizeType: 'small',
      sizeMultiplier: 0.70,
      unlockedByDefault: false,
      unlockCondition: 'Earn 6 Stars',
      starsRequired: 6,
      description: 'Cryogenic micro ice dart with streamlined velocity',
    },
    {
      id: 'skin_quantum_azure',
      name: 'Quantum Azure',
      color: 0x6f9bff,
      glowColor: 0x2952cc,
      sizeType: 'small',
      sizeMultiplier: 0.72,
      unlockedByDefault: false,
      unlockCondition: 'Earn 18 Stars',
      starsRequired: 18,
      description: 'Sub-atomic tachyon-charged compact blue sphere',
    },
    {
      id: 'skin_toxic_violet',
      name: 'Toxic Nano',
      color: 0xa16eff,
      glowColor: 0x6d28d9,
      sizeType: 'small',
      sizeMultiplier: 0.72,
      unlockedByDefault: false,
      unlockCondition: 'Earn 36 Stars',
      starsRequired: 36,
      description: 'Radioactive compact bio-hazard neon isotope',
    },
    {
      id: 'skin_prism',
      name: 'Micro Prism',
      color: 0xff7cc6,
      glowColor: 0xd6336c,
      sizeType: 'small',
      sizeMultiplier: 0.68,
      unlockedByDefault: false,
      unlockCondition: 'Earn 60 Stars',
      starsRequired: 60,
      description: 'Ultra-compact hyper-speed chromatic refraction crystal',
    },
    {
      id: 'skin_photon_spark',
      name: 'Photon Spark',
      color: 0xffc15b,
      glowColor: 0xff9900,
      sizeType: 'small',
      sizeMultiplier: 0.68,
      unlockedByDefault: false,
      unlockCondition: 'Earn 90 Stars',
      starsRequired: 90,
      description: 'Blindingly fast pinpoint photon core with laser precision',
    },
  ] as BallSkinItem[],

  trails: [
    {
      id: 'trail_default',
      name: 'Neon Ribbon',
      type: 'line',
      unlockedByDefault: true,
      unlockCondition: 'Free Default Trail',
      description: 'Clean aerodynamic neon slipstream',
    },
    {
      id: 'trail_sparks',
      name: 'Stardust Ember',
      type: 'sparks',
      unlockedByDefault: true,
      unlockCondition: 'Free Starter Trail',
      description: 'Sparkling kinetic dust particles',
    },
    {
      id: 'trail_pulse',
      name: 'Sonic Pulse',
      type: 'plasma',
      unlockedByDefault: true,
      unlockCondition: 'Free Starter Trail',
      description: 'Dual-frequency acoustic wavelength slipstream',
    },
    {
      id: 'trail_plasma',
      name: 'Plasma Flow',
      type: 'plasma',
      unlockedByDefault: false,
      unlockCondition: 'Earn 15 Stars',
      starsRequired: 15,
      description: 'Viscous high-temperature ion plume',
    },
    {
      id: 'trail_lightning',
      name: 'Volt Arc Streak',
      type: 'line',
      unlockedByDefault: false,
      unlockCondition: 'Earn 30 Stars',
      starsRequired: 30,
      description: 'High-frequency electric arc trail',
    },
    {
      id: 'trail_rainbow',
      name: 'Prismatic Beam',
      type: 'rainbow',
      unlockedByDefault: false,
      unlockCondition: 'Earn 45 Stars',
      starsRequired: 45,
      description: 'Chromatic rainbow speed flare',
    },
    {
      id: 'trail_meteor',
      name: 'Meteor Tail',
      type: 'sparks',
      unlockedByDefault: false,
      unlockCondition: 'Earn 60 Stars',
      starsRequired: 60,
      description: 'Burning atmospheric re-entry cinder trail',
    },
    {
      id: 'trail_warp',
      name: 'Warp Drive Vapor',
      type: 'plasma',
      unlockedByDefault: false,
      unlockCondition: 'Earn 75 Stars',
      starsRequired: 75,
      description: 'Sub-space antimatter wake',
    },
    {
      id: 'trail_aurora',
      name: 'Aurora Borealis',
      type: 'rainbow',
      unlockedByDefault: false,
      unlockCondition: 'Earn 90 Stars',
      starsRequired: 90,
      description: 'Mystic polar geomagnetic curtain',
    },
    {
      id: 'trail_tachyon',
      name: 'Tachyon Beam',
      type: 'line',
      unlockedByDefault: false,
      unlockCondition: 'Earn 105 Stars',
      starsRequired: 105,
      description: 'Faster-than-light hyper-focused laser streak',
    },
  ] as TrailItem[],

  impacts: [
    {
      id: 'impact_ring',
      name: 'Kinetic Shock Ring',
      type: 'ring',
      unlockedByDefault: true,
      unlockCondition: 'Free Default Burst',
      description: 'Expanding holographic shock ring',
    },
    {
      id: 'impact_sparks',
      name: 'Spark Shower',
      type: 'sparks',
      unlockedByDefault: true,
      unlockCondition: 'Free Starter Burst',
      description: 'Directional incandescent spark fountain',
    },
    {
      id: 'impact_ripple',
      name: 'Pulse Ripple',
      type: 'ring',
      unlockedByDefault: true,
      unlockCondition: 'Free Starter Burst',
      description: 'Resonant harmonic perimeter shock wave',
    },
    {
      id: 'impact_shockwave',
      name: 'Nova Shockwave',
      type: 'shockwave',
      unlockedByDefault: false,
      unlockCondition: 'Earn 15 Stars',
      starsRequired: 15,
      description: 'Concentric high-energy distortion wave',
    },
    {
      id: 'impact_burst',
      name: 'Supernova Detonation',
      type: 'burst',
      unlockedByDefault: false,
      unlockCondition: 'Earn 30 Stars',
      starsRequired: 30,
      description: 'Dense particle cluster explosion',
    },
    {
      id: 'impact_crystal',
      name: 'Prism Shatter',
      type: 'burst',
      unlockedByDefault: false,
      unlockCondition: 'Earn 45 Stars',
      starsRequired: 45,
      description: 'Shattered crystal shards with prismatic glare',
    },
    {
      id: 'impact_lightning',
      name: 'Lightning Flash',
      type: 'sparks',
      unlockedByDefault: false,
      unlockCondition: 'Earn 60 Stars',
      starsRequired: 60,
      description: 'Violent high-voltage electrical spark burst',
    },
    {
      id: 'impact_quantum',
      name: 'Quantum Implosion',
      type: 'shockwave',
      unlockedByDefault: false,
      unlockCondition: 'Earn 75 Stars',
      starsRequired: 75,
      description: 'Dual inverted spatial ripple with white core',
    },
    {
      id: 'impact_flare',
      name: 'Cosmic Flare',
      type: 'burst',
      unlockedByDefault: false,
      unlockCondition: 'Earn 90 Stars',
      starsRequired: 90,
      description: 'High-density radial hyper-nova burst',
    },
    {
      id: 'impact_singularity',
      name: 'Singularity Collapse',
      type: 'shockwave',
      unlockedByDefault: false,
      unlockCondition: 'Earn 105 Stars',
      starsRequired: 105,
      description: 'Gravitational shockwave with blinding center',
    },
  ] as ImpactEffectItem[],

  themes: [
    {
      id: 'theme_void',
      name: 'Midnight Void',
      bgHex: '#07070c',
      neonPrimary: 0x00f0ff,
      neonSecondary: 0xff007f,
      unlockedByDefault: true,
      unlockCondition: 'Free Default Theme',
      description: 'Deep obsidian arena with neon glow',
    },
    {
      id: 'theme_grid',
      name: 'Cyber Grid',
      bgHex: '#090b16',
      neonPrimary: 0x00ff88,
      neonSecondary: 0x00f0ff,
      unlockedByDefault: true,
      unlockCondition: 'Free Starter Theme',
      description: 'Futuristic digital arcade simulation',
    },
    {
      id: 'theme_nebula',
      name: 'Dark Nebula',
      bgHex: '#0d0718',
      neonPrimary: 0xa855f7,
      neonSecondary: 0x38bdf8,
      unlockedByDefault: true,
      unlockCondition: 'Free Starter Theme',
      description: 'Mystic deep-space violet cosmos',
    },
    {
      id: 'theme_synthwave',
      name: 'Synthwave Sunset',
      bgHex: '#140826',
      neonPrimary: 0xff007f,
      neonSecondary: 0x00f0ff,
      unlockedByDefault: false,
      unlockCondition: 'Earn 15 Stars',
      starsRequired: 15,
      description: 'Retro 80s dusk with magenta highlights',
    },
    {
      id: 'theme_matrix',
      name: 'Emerald Matrix',
      bgHex: '#03140e',
      neonPrimary: 0x10b981,
      neonSecondary: 0xfacc15,
      unlockedByDefault: false,
      unlockCondition: 'Earn 30 Stars',
      starsRequired: 30,
      description: 'Encrypted cyberspace with golden energy',
    },
    {
      id: 'theme_crimson',
      name: 'Blood Neon',
      bgHex: '#18050c',
      neonPrimary: 0xff2244,
      neonSecondary: 0xff8800,
      unlockedByDefault: false,
      unlockCondition: 'Earn 45 Stars',
      starsRequired: 45,
      description: 'High-threat red laser arena',
    },
    {
      id: 'theme_abyss',
      name: 'Deep Abyss',
      bgHex: '#040f1a',
      neonPrimary: 0x0ea5e9,
      neonSecondary: 0x06b6d4,
      unlockedByDefault: false,
      unlockCondition: 'Earn 60 Stars',
      starsRequired: 60,
      description: 'Bioluminescent deep ocean trench',
    },
    {
      id: 'theme_solar',
      name: 'Solar Flare Core',
      bgHex: '#1a0c02',
      neonPrimary: 0xf97316,
      neonSecondary: 0xfacc15,
      unlockedByDefault: false,
      unlockCondition: 'Earn 75 Stars',
      starsRequired: 75,
      description: 'Blazing chromospheric nuclear furnace',
    },
    {
      id: 'theme_tokyo',
      name: 'Cyberpunk Tokyo',
      bgHex: '#12081d',
      neonPrimary: 0xf43f5e,
      neonSecondary: 0x06b6d4,
      unlockedByDefault: false,
      unlockCondition: 'Earn 90 Stars',
      starsRequired: 90,
      description: 'Rain-soaked futuristic metropolis',
    },
    {
      id: 'theme_frost',
      name: 'Hyperborean Frost',
      bgHex: '#04121b',
      neonPrimary: 0x38bdf8,
      neonSecondary: 0xe0e7ff,
      unlockedByDefault: false,
      unlockCondition: 'Earn 105 Stars',
      starsRequired: 105,
      description: 'Sub-zero cryo-frozen glacial arena',
    },
  ] as ArenaThemeItem[],
};
