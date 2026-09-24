# Architecture & Technical Design

## 1. System Overview

SatisfyBall is structured with a decoupled engine design separating simulation, rendering, audio, persistence, and UI:

```
┌──────────────────────────────────────────────────────────┐
│                   HTML5 / CSS3 UI Layer                  │
│   (MainMenu, ModeSelect, LevelSelect, HUD, Modals)       │
└────────────────────────────┬─────────────────────────────┘
                             │ Events & Navigation
                             ▼
┌──────────────────────────────────────────────────────────┐
│                      SceneManager                        │
│          Coordinates UI state & Game instance            │
└────────────────────────────┬─────────────────────────────┘
                             │ LevelConfig
                             ▼
┌──────────────────────────────────────────────────────────┐
│                       Game (Core)                        │
│   ┌────────────────────────┬─────────────────────────┐   │
│   │    Planck.js (Box2D)   │     PixiJS v8 Engine    │   │
│   │    Fixed Physics Step  │     WebGL2 / WebGPU     │   │
│   └───────────┬────────────┴────────────┬────────────┘   │
│               │                         │                │
│               ▼                         ▼                │
│      CollisionSystem               Visual Effects        │
│   (Spikes, Exits, Damage)     (Particles, Trails, Bloom) │
└────────────────────────────┬─────────────────────────────┘
                             │ Feedback
                             ▼
┌──────────────────────────────────────────────────────────┐
│              AudioManager & HapticsManager               │
│      Procedural Web Audio + Capacitor Native Haptics     │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Coordinate System & Resolution Independence

To guarantee identical physical trajectories across differing screen sizes (e.g. iPhone SE, iPhone 16 Pro Max, iPad, Android tablets):
- **Physics World**: Coordinate units in meters ($1\text{ m} = 50\text{ px}$).
- **Render Center**: The world container origin `(0, 0)` is anchored to the center of the screen.
- **Viewport Scaling**: `worldContainer.scale` automatically fits a canonical $400 \times 700$ portrait resolution box without stretching geometry.

---

## 3. Procedural Audio Engine

To prevent clipping distortion during dense multi-ball simulations (e.g. 100+ spheres colliding in chain-reaction mode):
1. **Dynamic Pitch Modulation**: Wall collision velocities map to pentatonic musical scales ($C_5 \to E_6$), turning physics impacts into melodic chimes.
2. **Concurrency Limiter**: Max 4 simultaneous active collision oscillators with a $35\text{ ms}$ gate.
3. **Synthesis**: Clean sine and triangle wave envelopes synthesized through the Web Audio API with zero external audio asset latency.
