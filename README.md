# SatisfyBall 🔮

> **SatisfyBall** is a 2D physics-based satisfying neon mobile game built with TypeScript, PixiJS v8, Planck.js (Box2D), and Capacitor for Android & iOS.

[![CI / Production Build](https://github.com/satisfyball/satisfyball/actions/workflows/ci.yml/badge.svg)](https://github.com/satisfyball/satisfyball/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![PixiJS](https://img.shields.io/badge/PixiJS-v8-ff007f.svg)](https://pixijs.com/)
[![Planck.js](https://img.shields.io/badge/Physics-Planck.js%20(Box2D)-00f0ff.svg)](https://piqnt.com/planck.js/)
[![Capacitor](https://img.shields.io/badge/Capacitor-v7-3880ff.svg)](https://capacitorjs.com/)

---

## 🎮 Core Gameplay Concept

SatisfyBall is engineered around a tactile slingshot launch loop:
1. **Touch & Select** the glowing sphere.
2. **Drag Backward** to aim direction and choose shot power.
3. **Inspect Real-time Trajectory Preview** with specular first-bounce reflection.
4. **Release** to start deterministic Box2D physics simulation.
5. **Watch Satisfying Cascades**: Glow trails, dynamic pitch collision chimes, additive particle explosions, and evolving neon geometry.
6. **Instant Retry**: One-tap restart in `< 100ms`.

---

## 🌟 6 Game Modes (36 Levels)

1. **Escape (6 Levels)**: Guide glowing spheres out of geometric enclosures (Square, Circle, Rotating Triangle, Pentagon Shot Pressure, Moving Heart, Quantum Diamond).
2. **Neon Maze (6 Levels)**: Penetrate through concentric counter-rotating neon gates to reach the core.
3. **Neon Impact (6 Levels + Endless)**: Every wall collision weaves persistent glowing laser web art.
4. **Evolution vs Spikes (6 Levels + Endless)**: Avoid lethal spike hazards while evolving through 4 visual transcendence tiers.
5. **Every Contact = New Ball (6 Levels)**: Trigger controlled chain reactions and exponential population growth with object pooling limits.
6. **Last Ball Wins (6 Levels)**: Gladiatorial battle royale with orbiting health pips against AI steering opponents and boss encounters.

---

## 🛠 Technology Stack

- **Frontend & Rendering**: [PixiJS v8](https://pixijs.com/) (WebGL2/WebGPU 2D rendering, custom bloom and additive particles)
- **Physics Engine**: [Planck.js](https://piqnt.com/planck.js/) (Box2D port, deterministic fixed 60 FPS timestep)
- **Language**: TypeScript 5.7 (Strict Mode)
- **Build Tool**: Vite 6.x
- **Audio**: Web Audio API Procedural Synthesizer + Howler.js (dynamic pitch modulation & concurrency limiter)
- **Haptics & Native Integration**: Capacitor 7 (`@capacitor/haptics`, `@capacitor/app`, `@capacitor/status-bar`)
- **Persistence**: Versioned IndexedDB schema with LocalStorage fallback
- **Testing**: Vitest unit test suite

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser or mobile viewport emulator.

### 3. Run Quality Verification
```bash
# Typecheck TypeScript
npm run typecheck

# Lint codebase
npm run lint

# Run Vitest test suite
npm run test:run

# Build production bundle
npm run build
```

---

## 📱 Mobile Deployment (Android & iOS)

SatisfyBall uses Capacitor for native packaging:

```bash
# 1. Build production web bundle
npm run build

# 2. Sync web assets with native mobile projects
npm run cap:sync

# 3. Open in Android Studio
npm run android

# 4. Open in Xcode (macOS)
npm run ios
```

See [MOBILE_BUILD.md](file:///c:/Users/Ala/Desktop/game/MOBILE_BUILD.md) for signing and release instructions.

---

## 📚 Documentation Index

- [ARCHITECTURE.md](file:///c:/Users/Ala/Desktop/game/ARCHITECTURE.md) — Technical engine architecture, coordinate spaces, and audio design
- [GAME_DESIGN.md](file:///c:/Users/Ala/Desktop/game/GAME_DESIGN.md) — Game loops, progression, and scoring philosophy
- [LEVELS.md](file:///c:/Users/Ala/Desktop/game/LEVELS.md) — Complete specifications for all 36 levels & daily challenges
- [PERFORMANCE.md](file:///c:/Users/Ala/Desktop/game/PERFORMANCE.md) — Object pooling, audio throttling, and memory optimization
- [MOBILE_BUILD.md](file:///c:/Users/Ala/Desktop/game/MOBILE_BUILD.md) — Android & iOS packaging, App Store & Google Play release
- [TESTING.md](file:///c:/Users/Ala/Desktop/game/TESTING.md) — Automated testing matrix and verification
- [ROADMAP.md](file:///c:/Users/Ala/Desktop/game/ROADMAP.md) — Future expansions (Backend, online leaderboards, multiplayer)
