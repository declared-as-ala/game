import { Container, Graphics } from 'pixi.js';
import * as planck from 'planck';
import type { PhysicsWorld } from '@/core/PhysicsWorld';
import type { ArenaShape, NestedSquareConfig, Vector2D } from '@/data/types';

export interface ArenaOptions {
  shape: ArenaShape;
  centerX: number; // Pixels
  centerY: number;
  radius: number; // Pixels
  color?: number;
  opening?: {
    side?: 'top' | 'right' | 'bottom' | 'left' | 'angle';
    angle?: number;
    width: number;
    moves?: boolean;
    moveSpeed?: number;
  };
  rotationSpeed?: number;
  rings?: Array<{
    radiusRatio: number;
    openingAngle?: number;
    openingWidth?: number;
    rotationSpeed?: number;
    closed?: boolean;
    color?: number;
  }>;
  nestedSquares?: NestedSquareConfig[];
  gapAngle?: number; // radians (default -Math.PI / 2)
  gapWidth?: number; // radians
  gapRotationSpeed?: number; // rad/s
  gatePulseOpenDuration?: number; // seconds
  gatePulseCloseDuration?: number; // seconds
}

export interface CrackLine {
  a: Vector2D;
  b: Vector2D;
  color: number;
  life: number;
  max: number;
}

export interface FlashArc {
  x: number;
  y: number;
  color: number;
  life: number;
  max: number;
}

export interface BoxLayer {
  id: number;
  shape: ArenaShape;
  size: number;
  color: number;
  speed: number;
  gap: number; // 0.0 to 1.0 (normalized perimeter position)
  gapLength: number; // in pixels
  rotationSpeed: number;
  rotation: number;
  body: planck.Body | null;
  fixtures: planck.Fixture[];
  active: boolean;
  cracking: boolean;
  crackTime: number;
  split: number;
  dissolveAlpha: number;
  dissolveScale: number;
  baseVertices: Vector2D[];
  perimeter: number;
  wallSegments: Array<{ p1: Vector2D; p2: Vector2D }>;
}

export class Arena {
  public shape: ArenaShape;
  public centerX: number;
  public centerY: number;
  public radius: number;
  public color: number;
  public rotation = 0;
  public rotationSpeed = 0;

  // Dynamic Circular Gap & Gate Pulse (for Marble Escape)
  public gapAngle = -Math.PI / 2;
  public gapWidth = 0;
  public gapRotationSpeed = 0;
  public gatePulseOpenDuration = 0;
  public gatePulseCloseDuration = 0;
  public isGateOpen = true;
  private gatePulseTimer = 0;
  private circularFixtures: planck.Fixture[] = [];

  public container: Container;
  public graphics: Graphics;
  public glowGraphics: Graphics;
  public effectsGraphics: Graphics;

  private physics: PhysicsWorld;
  private rootBody: planck.Body;
  private options: ArenaOptions;

  // Concentric Rings for Neon Maze
  private ringData: Array<{
    radiusRatio: number;
    openingAngle: number;
    openingWidth: number;
    rotationSpeed: number;
    closed: boolean;
    color: number;
    body: planck.Body;
    fixtures: planck.Fixture[];
  }> = [];

  // Nested Shapes for Escape Mode
  private boxLayers: BoxLayer[] = [];
  private flashes: FlashArc[] = [];
  private cracks: CrackLine[] = [];

  constructor(physics: PhysicsWorld, parent: Container, options: ArenaOptions) {
    this.physics = physics;
    this.options = options;
    this.shape = options.shape;
    this.centerX = options.centerX;
    this.centerY = options.centerY;
    this.radius = options.radius;
    this.color = options.color ?? 0x00f0ff;
    this.rotationSpeed = options.rotationSpeed ?? 0;

    this.gapAngle = options.gapAngle ?? (options.opening?.angle ?? -Math.PI / 2);
    this.gapWidth = options.gapWidth ?? (options.opening ? (options.opening.width * Math.PI) : 0);
    this.gapRotationSpeed = options.gapRotationSpeed ?? (options.opening?.moves ? (options.opening.moveSpeed ?? 0) : 0);
    this.gatePulseOpenDuration = options.gatePulseOpenDuration ?? 0;
    this.gatePulseCloseDuration = options.gatePulseCloseDuration ?? 0;
    this.isGateOpen = true;
    this.gatePulseTimer = this.gatePulseOpenDuration;

    this.container = new Container();
    this.glowGraphics = new Graphics();
    this.graphics = new Graphics();
    this.effectsGraphics = new Graphics();

    this.container.addChild(this.glowGraphics);
    this.container.addChild(this.graphics);
    this.container.addChild(this.effectsGraphics);
    parent.addChild(this.container);

    this.container.x = this.centerX;
    this.container.y = this.centerY;

    const centerPhys = physics.toPhysicsVec({ x: this.centerX, y: this.centerY });
    this.rootBody = physics.getWorld().createKinematicBody({
      position: centerPhys,
    });

    this.buildGeometry();
    this.render();
  }

  private buildGeometry(): void {
    if (this.shape === 'nested-boxes' && this.options.nestedSquares) {
      this.buildNestedShapes();
      return;
    }

    if (this.shape === 'concentric-rings' && this.options.rings) {
      this.buildConcentricRings();
      return;
    }

    if (this.shape === 'circle' && this.gapWidth > 0) {
      this.rebuildCircularGapFixtures();
      return;
    }

    this.buildStandardShape();
  }

  public rebuildCircularGapFixtures(): void {
    for (const f of this.circularFixtures) {
      this.rootBody.destroyFixture(f);
    }
    this.circularFixtures = [];

    const r = this.radius;
    const segments = 64;
    const isClosed = !this.isGateOpen || this.gapWidth <= 0.01;
    const openingHalf = this.gapWidth / 2;
    const segHalf = (Math.PI * 2 / segments) / 2;

    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      const midA = (a1 + a2) / 2;

      if (!isClosed) {
        const diff = Math.abs(this.normalizeAngle(midA - this.gapAngle));
        if (diff < openingHalf + segHalf * 0.35) continue;
      }

      const p1 = { x: Math.cos(a1) * r, y: Math.sin(a1) * r };
      const p2 = { x: Math.cos(a2) * r, y: Math.sin(a2) * r };

      const physP1 = planck.Vec2(this.physics.toPhysicsX(p1.x), this.physics.toPhysicsY(p1.y));
      const physP2 = planck.Vec2(this.physics.toPhysicsX(p2.x), this.physics.toPhysicsY(p2.y));

      const fixture = this.rootBody.createFixture({
        shape: planck.Edge(physP1, physP2),
        friction: 0.0,
        restitution: 0.98,
      });
      fixture.setUserData({ type: 'wall', arena: this });
      this.circularFixtures.push(fixture);
    }
  }

  private buildNestedShapes(): void {
    if (!this.options.nestedSquares) return;

    for (const layer of this.boxLayers) {
      if (layer.body) {
        this.physics.destroyBody(layer.body);
      }
    }
    this.boxLayers = [];
    this.flashes = [];
    this.cracks = [];

    this.options.nestedSquares.forEach((sq, idx) => {
      const shapeType = sq.shape || this.options.shape === 'nested-boxes' ? (sq.shape || 'square') : 'square';
      const s = sq.size;
      const speed = sq.speed !== undefined ? sq.speed : (idx % 2 === 0 ? 0.22 - idx * 0.02 : -0.20 + idx * 0.02);
      const gap = sq.gap !== undefined ? sq.gap : (0.08 + idx / 6.0) % 1.0;
      const gapLength = sq.openingWidth || 60;

      const baseVertices = this.getVerticesForShape(shapeType, s);
      const perimeter = this.calculatePerimeter(baseVertices);

      // Create kinematic physics body
      const centerPhys = this.physics.toPhysicsVec({ x: this.centerX, y: this.centerY });
      const layerBody = this.physics.getWorld().createKinematicBody({
        position: centerPhys,
      });

      const layer: BoxLayer = {
        id: idx,
        shape: shapeType,
        size: s,
        color: sq.color,
        speed,
        gap,
        gapLength,
        rotationSpeed: sq.rotationSpeed || 0,
        rotation: sq.initialRotation || 0,
        body: layerBody,
        fixtures: [],
        active: true,
        cracking: false,
        crackTime: 0,
        split: 0,
        dissolveAlpha: 1.0,
        dissolveScale: 1.0,
        baseVertices,
        perimeter,
        wallSegments: [],
      };

      this.rebuildLayerSegmentsAndFixtures(layer);
      this.boxLayers.push(layer);
    });
  }

  private calculatePerimeter(vertices: Vector2D[]): number {
    let perim = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % n];
      perim += Math.hypot(v2.x - v1.x, v2.y - v1.y);
    }
    return Math.max(perim, 1.0);
  }

  private rebuildLayerSegmentsAndFixtures(layer: BoxLayer): void {
    if (!layer.body || !layer.active) return;

    // Destroy old fixtures
    for (const f of layer.fixtures) {
      layer.body.destroyFixture(f);
    }
    layer.fixtures = [];
    layer.wallSegments = [];

    const verts = layer.baseVertices;
    const n = verts.length;
    const perim = layer.perimeter;
    const gapCenter = layer.gap * perim;
    const halfGap = layer.gapLength * 0.5;

    let cumulativeDist = 0;

    for (let side = 0; side < n; side++) {
      let a = verts[side];
      let b = verts[(side + 1) % n];

      // Apply outward split if cracking
      if (layer.split > 0) {
        const midX = (a.x + b.x) * 0.5;
        const midY = (a.y + b.y) * 0.5;
        const outLen = Math.hypot(midX, midY) || 1.0;
        const outX = (midX / outLen) * layer.split;
        const outY = (midY / outLen) * layer.split;
        a = { x: a.x + outX, y: a.y + outY };
        b = { x: b.x + outX, y: b.y + outY };
      }

      const sideLen = Math.hypot(b.x - a.x, b.y - a.y);
      if (sideLen < 0.01) continue;

      let local = gapCenter - cumulativeDist;
      while (local < -perim * 0.5) local += perim;
      while (local > perim * 0.5) local -= perim;

      const leftT = Math.max(0, Math.min(1, (local - halfGap) / sideLen));
      const rightT = Math.max(0, Math.min(1, (local + halfGap) / sideLen));

      if (local + halfGap <= 0 || local - halfGap >= sideLen) {
        // Solid wall
        this.addWallSegment(layer, a, b);
      } else {
        // Wall with gap cutout
        if (leftT > 0.02) {
          const seg1End = { x: a.x + (b.x - a.x) * leftT, y: a.y + (b.y - a.y) * leftT };
          this.addWallSegment(layer, a, seg1End);
        }
        if (rightT < 0.98) {
          const seg2Start = { x: a.x + (b.x - a.x) * rightT, y: a.y + (b.y - a.y) * rightT };
          this.addWallSegment(layer, seg2Start, b);
        }
      }

      cumulativeDist += sideLen;
    }
  }

  private addWallSegment(layer: BoxLayer, p1: Vector2D, p2: Vector2D): void {
    layer.wallSegments.push({ p1, p2 });

    if (layer.body && !layer.cracking) {
      const physP1 = planck.Vec2(this.physics.toPhysicsX(p1.x), this.physics.toPhysicsY(p1.y));
      const physP2 = planck.Vec2(this.physics.toPhysicsX(p2.x), this.physics.toPhysicsY(p2.y));

      const fixture = layer.body.createFixture({
        shape: planck.Edge(physP1, physP2),
        friction: 0.0,
        restitution: 0.99,
      });
      fixture.setUserData({ type: 'wall', arena: this, layerId: layer.id });
      layer.fixtures.push(fixture);
    }
  }

  public startCrack(layerId: number, hitPoint?: Vector2D): void {
    const layer = this.boxLayers.find((b) => b.id === layerId && b.active && !b.cracking);
    if (!layer) return;

    layer.cracking = true;
    layer.crackTime = 0.16;
    layer.split = 0;

    // Destroy physical fixtures so ball immediately moves through
    if (layer.body) {
      for (const f of layer.fixtures) {
        layer.body.destroyFixture(f);
      }
      layer.fixtures = [];
    }

    if (hitPoint) {
      this.addFlash(hitPoint.x, hitPoint.y, layer.color);
    }

    // Spawn crack fractures along perimeter
    const verts = layer.baseVertices;
    const n = verts.length;
    for (let i = 0; i < n; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % n];
      const tangentX = (b.x - a.x);
      const tangentY = (b.y - a.y);
      const tanLen = Math.hypot(tangentX, tangentY) || 1.0;
      const normX = -tangentY / tanLen;
      const normY = tangentX / tanLen;

      for (let k = 0; k < 4; k++) {
        const frac = (k + 1) / 5.0;
        const baseX = a.x + tangentX * frac;
        const baseY = a.y + tangentY * frac;
        const offset = (Math.random() - 0.5) * 28;

        this.cracks.push({
          a: { x: baseX - (tangentX / tanLen) * 12, y: baseY - (tangentY / tanLen) * 12 },
          b: { x: baseX + normX * offset, y: baseY + normY * offset },
          color: layer.color,
          life: 0.16,
          max: 0.16,
        });
      }
    }
  }

  public addFlash(x: number, y: number, color: number): void {
    this.flashes.push({
      x: x - this.centerX,
      y: y - this.centerY,
      color,
      life: 0.27,
      max: 0.27,
    });
  }

  public getActiveBoxLayers(): BoxLayer[] {
    return this.boxLayers.filter((b) => b.active);
  }

  public getInnermostActiveBox(): BoxLayer | null {
    const active = this.boxLayers.filter((b) => b.active && !b.cracking);
    if (active.length === 0) return null;
    return active.reduce((min, b) => (b.size < min.size ? b : min), active[0]);
  }

  public getRemainingBoxesCount(): number {
    return this.boxLayers.filter((b) => b.active).length;
  }

  public getRemainingUncrackedBoxesCount(): number {
    return this.boxLayers.filter((b) => b.active && !b.cracking).length;
  }

  public getTotalBoxesCount(): number {
    return this.boxLayers.length;
  }

  public isPointInPolygon(p: Vector2D, verts: Vector2D[]): boolean {
    let inside = false;
    const n = verts.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = verts[i].x, yi = verts[i].y;
      const xj = verts[j].x, yj = verts[j].y;
      const intersect = ((yi > p.y) !== (yj > p.y)) &&
        (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  public getDistanceToPolygon(p: Vector2D, verts: Vector2D[]): number {
    let minSqDist = Infinity;
    const n = verts.length;
    for (let i = 0; i < n; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % n];
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const apx = p.x - a.x;
      const apy = p.y - a.y;
      const abLenSq = abx * abx + aby * aby;
      const t = abLenSq > 0 ? Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq)) : 0;
      const projX = a.x + t * abx;
      const projY = a.y + t * aby;
      const distSq = (p.x - projX) * (p.x - projX) + (p.y - projY) * (p.y - projY);
      if (distSq < minSqDist) {
        minSqDist = distSq;
      }
    }
    return Math.sqrt(minSqDist);
  }

  public isBallOutsideLayer(layer: BoxLayer, ballX: number, ballY: number, _ballRadius = 14): boolean {
    const dx = ballX - this.centerX;
    const dy = ballY - this.centerY;
    const cosR = Math.cos(-layer.rotation);
    const sinR = Math.sin(-layer.rotation);
    const lx = dx * cosR - dy * sinR;
    const ly = dx * sinR + dy * cosR;
    const p = { x: lx, y: ly };

    // If ball center is strictly inside the polygon, it has not escaped
    if (this.isPointInPolygon(p, layer.baseVertices)) {
      return false;
    }

    // Ball center is outside the polygon base boundary -> escaped through the gap!
    return true;
  }

  private buildConcentricRings(): void {
    if (!this.options.rings) return;

    for (const ring of this.ringData) {
      if (ring.body) {
        this.physics.destroyBody(ring.body);
      }
    }
    this.ringData = [];

    const centerPhys = this.physics.toPhysicsVec({ x: this.centerX, y: this.centerY });

    this.options.rings.forEach((ring, idx) => {
      const ringBody = this.physics.getWorld().createKinematicBody({
        position: centerPhys,
      });

      const rotSpeed = ring.rotationSpeed || 0;
      ringBody.setAngularVelocity(rotSpeed);

      const isClosed = ring.closed || ring.openingWidth === 0 || ring.openingWidth === undefined;
      const openingAngle = ring.openingAngle || 0;
      const openingWidth = ring.openingWidth || 0;

      // Color scheme for neon rings
      const defaultColors = [0x00f0ff, 0xa855f7, 0xff007f, 0x00ff88, 0xfacc15, 0x38bdf8, 0xff4848];
      const ringColor = ring.color || defaultColors[idx % defaultColors.length];

      const ringItem = {
        radiusRatio: ring.radiusRatio,
        openingAngle,
        openingWidth,
        rotationSpeed: rotSpeed,
        closed: isClosed,
        color: ringColor,
        body: ringBody,
        fixtures: [] as planck.Fixture[],
      };

      const r = this.radius * ring.radiusRatio;
      const segments = isClosed ? 60 : 64;
      const openingHalf = isClosed ? 0 : openingWidth / 2;
      const segHalf = (Math.PI * 2 / segments) / 2;

      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;
        const midA = (a1 + a2) / 2;

        if (!isClosed) {
          const diff = Math.abs(this.normalizeAngle(midA - openingAngle));
          if (diff < openingHalf + segHalf * 0.4) continue;
        }

        const p1 = { x: Math.cos(a1) * r, y: Math.sin(a1) * r };
        const p2 = { x: Math.cos(a2) * r, y: Math.sin(a2) * r };

        const physP1 = planck.Vec2(this.physics.toPhysicsX(p1.x), this.physics.toPhysicsY(p1.y));
        const physP2 = planck.Vec2(this.physics.toPhysicsX(p2.x), this.physics.toPhysicsY(p2.y));

        const fixture = ringBody.createFixture({
          shape: planck.Edge(physP1, physP2),
          friction: 0.0,
          restitution: 0.98,
        });
        fixture.setUserData({ type: 'wall', arena: this });
        ringItem.fixtures.push(fixture);
      }

      this.ringData.push(ringItem);
    });
  }

  private buildStandardShape(): void {
    const vertices = this.getVerticesForShape(this.shape, this.radius);
    const numVerts = vertices.length;

    for (let i = 0; i < numVerts; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % numVerts];
      const physP1 = planck.Vec2(this.physics.toPhysicsX(v1.x), this.physics.toPhysicsY(v1.y));
      const physP2 = planck.Vec2(this.physics.toPhysicsX(v2.x), this.physics.toPhysicsY(v2.y));

      const fixture = this.rootBody.createFixture({
        shape: planck.Edge(physP1, physP2),
        friction: 0.0,
        restitution: 0.98,
      });
      fixture.setUserData({ type: 'wall', arena: this });
    }
  }

  public update(dt: number): { completedBreaks: BoxLayer[] } {
    const completedBreaks: BoxLayer[] = [];

    // 1. Update Flashes
    this.flashes = this.flashes.filter((f) => {
      f.life -= dt;
      return f.life > 0;
    });

    // 2. Update Cracks
    this.cracks = this.cracks.filter((c) => {
      c.life -= dt;
      return c.life > 0;
    });

    // 3. Update Nested Shapes
    if (this.shape === 'nested-boxes' && this.boxLayers.length > 0) {
      for (const layer of this.boxLayers) {
        if (!layer.active) continue;

        if (!layer.cracking) {
          // Advance moving gap along perimeter
          if (layer.speed !== 0) {
            const step = (layer.speed * 150.0 / layer.perimeter) * dt;
            layer.gap = (layer.gap + step) % 1.0;
            if (layer.gap < 0) layer.gap += 1.0;
            this.rebuildLayerSegmentsAndFixtures(layer);
          }
        } else {
          // Cracking phase
          layer.crackTime -= dt;
          layer.split = Math.min(18.0, layer.split + dt * 95.0);
          this.rebuildLayerSegmentsAndFixtures(layer);

          if (layer.crackTime <= 0) {
            layer.active = false;
            layer.cracking = false;
            if (layer.body) {
              this.physics.destroyBody(layer.body);
              layer.body = null;
            }
            completedBreaks.push(layer);
          }
        }
      }
    }

    // 4. Update Circular Gap & Gate Pulse
    if (this.shape === 'circle' && this.gapWidth > 0) {
      let needsRebuild = false;

      if (this.gapRotationSpeed !== 0) {
        this.gapAngle = this.normalizeAngle(this.gapAngle + this.gapRotationSpeed * dt);
        needsRebuild = true;
      }

      if (this.gatePulseOpenDuration > 0 && this.gatePulseCloseDuration > 0) {
        this.gatePulseTimer -= dt;
        if (this.gatePulseTimer <= 0) {
          this.isGateOpen = !this.isGateOpen;
          this.gatePulseTimer = this.isGateOpen ? this.gatePulseOpenDuration : this.gatePulseCloseDuration;
          needsRebuild = true;
        }
      }

      if (needsRebuild) {
        this.rebuildCircularGapFixtures();
      }
    }

    this.render();
    return { completedBreaks };
  }

  public render(): void {
    this.graphics.clear();
    this.glowGraphics.clear();
    this.effectsGraphics.clear();

    // 1. Draw Nested Shape Layers
    if (this.shape === 'nested-boxes' && this.boxLayers.length > 0) {
      for (const layer of this.boxLayers) {
        if (!layer.active) continue;

        const color = layer.color;
        const alpha = layer.cracking ? 0.45 : 1.0;

        for (const seg of layer.wallSegments) {
          // Glow Outer Line
          this.glowGraphics
            .moveTo(seg.p1.x, seg.p1.y)
            .lineTo(seg.p2.x, seg.p2.y)
            .stroke({ width: 22, color, alpha: 0.08 * alpha, cap: 'round' });

          // Mid Aura
          this.glowGraphics
            .moveTo(seg.p1.x, seg.p1.y)
            .lineTo(seg.p2.x, seg.p2.y)
            .stroke({ width: 12, color, alpha: 0.22 * alpha, cap: 'round' });

          // Crisp Core Line
          this.graphics
            .moveTo(seg.p1.x, seg.p1.y)
            .lineTo(seg.p2.x, seg.p2.y)
            .stroke({ width: 6.5, color, alpha: 0.95 * alpha, cap: 'round' });

          // Crisp Center Line
          this.graphics
            .moveTo(seg.p1.x, seg.p1.y)
            .lineTo(seg.p2.x, seg.p2.y)
            .stroke({ width: 2.2, color: 0xffffff, alpha: 0.9 * alpha, cap: 'round' });
        }
      }
    }

    // 2. Draw Concentric Rings
    if (this.shape === 'concentric-rings' && this.ringData.length > 0) {
      for (const ring of this.ringData) {
        const r = this.radius * ring.radiusRatio;
        const bodyAngle = ring.body.getAngle();
        const color = ring.color;

        if (ring.closed) {
          // Perfectly smooth continuous closed circle - zero joint dots
          this.glowGraphics
            .circle(0, 0, r)
            .stroke({ width: 14, color, alpha: 0.22 });

          this.graphics
            .circle(0, 0, r)
            .stroke({ width: 4.5, color, alpha: 0.95 });

          this.graphics
            .circle(0, 0, r)
            .stroke({ width: 1.8, color: 0xffffff, alpha: 0.85 });
        } else {
          // Smooth continuous mathematical arc - no segment joints or dots
          const openingHalf = ring.openingWidth / 2;
          const startA = ring.openingAngle + bodyAngle + openingHalf;
          const endA = ring.openingAngle + bodyAngle + Math.PI * 2 - openingHalf;
          const startX = Math.cos(startA) * r;
          const startY = Math.sin(startA) * r;

          this.glowGraphics
            .moveTo(startX, startY)
            .arc(0, 0, r, startA, endA)
            .stroke({ width: 14, color, alpha: 0.22, cap: 'round' });

          this.graphics
            .moveTo(startX, startY)
            .arc(0, 0, r, startA, endA)
            .stroke({ width: 4.5, color, alpha: 0.95, cap: 'round' });

          this.graphics
            .moveTo(startX, startY)
            .arc(0, 0, r, startA, endA)
            .stroke({ width: 1.8, color: 0xffffff, alpha: 0.85, cap: 'round' });
        }
      }
    }

    // 3. Draw Standard Shapes & Circular Gap Arena
    if (this.shape !== 'nested-boxes' && this.shape !== 'concentric-rings') {
      if (this.shape === 'circle' && this.gapWidth > 0) {
        const r = this.radius;
        const isClosed = !this.isGateOpen || this.gapWidth <= 0.01;

        if (isClosed) {
          // Closed Circle
          this.glowGraphics
            .circle(0, 0, r)
            .stroke({ width: 24, color: this.color, alpha: 0.16 });

          this.graphics
            .circle(0, 0, r)
            .stroke({ width: 5.5, color: this.color, alpha: 0.95 });

          this.graphics
            .circle(0, 0, r)
            .stroke({ width: 2.0, color: 0xffffff, alpha: 0.85 });

          // Pulsing closed hazard indicator across gate
          const openingHalf = this.gapWidth / 2;
          const startA = this.gapAngle + openingHalf;
          const endA = this.gapAngle + Math.PI * 2 - openingHalf;
          const startX = Math.cos(startA) * r;
          const startY = Math.sin(startA) * r;

          this.effectsGraphics
            .moveTo(startX, startY)
            .arc(0, 0, r, endA, startA)
            .stroke({ width: 4.0, color: 0xff0055, alpha: 0.85, cap: 'round' });
        } else {
          // Open Arc with Gap
          const openingHalf = this.gapWidth / 2;
          const startA = this.gapAngle + openingHalf;
          const endA = this.gapAngle + Math.PI * 2 - openingHalf;
          const startX = Math.cos(startA) * r;
          const startY = Math.sin(startA) * r;

          this.glowGraphics
            .moveTo(startX, startY)
            .arc(0, 0, r, startA, endA)
            .stroke({ width: 24, color: this.color, alpha: 0.16, cap: 'round' });

          this.graphics
            .moveTo(startX, startY)
            .arc(0, 0, r, startA, endA)
            .stroke({ width: 5.5, color: this.color, alpha: 0.95, cap: 'round' });

          this.graphics
            .moveTo(startX, startY)
            .arc(0, 0, r, startA, endA)
            .stroke({ width: 2.0, color: 0xffffff, alpha: 0.9, cap: 'round' });

          // Glowing gate endpoint indicators
          const endX = Math.cos(endA) * r;
          const endY = Math.sin(endA) * r;
          this.glowGraphics.circle(startX, startY, 7).fill({ color: 0x00ffcc, alpha: 0.6 });
          this.graphics.circle(startX, startY, 4).fill({ color: 0xffffff, alpha: 0.95 });
          this.glowGraphics.circle(endX, endY, 7).fill({ color: 0x00ffcc, alpha: 0.6 });
          this.graphics.circle(endX, endY, 4).fill({ color: 0xffffff, alpha: 0.95 });
        }
      } else {
        const vertices = this.getVerticesForShape(this.shape, this.radius);
        const numVerts = vertices.length;
        if (numVerts >= 3) {
          const polyPts: number[] = [];
          for (const v of vertices) {
            polyPts.push(v.x, v.y);
          }
          polyPts.push(vertices[0].x, vertices[0].y);

          // 1. Wide Outer Glow
          this.glowGraphics
            .poly(polyPts)
            .stroke({ width: 28, color: this.color, alpha: 0.08, cap: 'round', join: 'round' });

          // 2. Mid Aura
          this.glowGraphics
            .poly(polyPts)
            .stroke({ width: 14, color: this.color, alpha: 0.22, cap: 'round', join: 'round' });

          // 3. Crisp Core Line
          this.graphics
            .poly(polyPts)
            .stroke({ width: 6.5, color: this.color, alpha: 0.95, cap: 'round', join: 'round' });

          // 4. White Center Accent
          this.graphics
            .poly(polyPts)
            .stroke({ width: 2.2, color: 0xffffff, alpha: 0.85, cap: 'round', join: 'round' });
        }
      }
    }

    // 4. Draw Flashes
    for (const f of this.flashes) {
      const ratio = Math.max(0, Math.min(1, f.life / f.max));
      const rad = 70.0 - ratio * 60.0;
      this.effectsGraphics
        .circle(f.x, f.y, rad)
        .stroke({ width: 3.5, color: f.color, alpha: 0.72 * ratio });
    }

    // 4. Draw Crack Lines
    for (const c of this.cracks) {
      const ratio = Math.max(0, Math.min(1, c.life / c.max));
      this.effectsGraphics
        .moveTo(c.a.x, c.a.y)
        .lineTo(c.b.x, c.b.y)
        .stroke({ width: 3.0, color: c.color, alpha: ratio });
    }
  }

  public getVerticesForShape(shape: ArenaShape, r: number): Vector2D[] {
    const vertices: Vector2D[] = [];

    switch (shape) {
      case 'square':
      case 'nested-boxes': {
        const s = r;
        return [
          { x: -s, y: -s },
          { x: s, y: -s },
          { x: s, y: s },
          { x: -s, y: s },
        ];
      }
      case 'diamond': {
        // Losange format
        return [
          { x: 0, y: -r * 1.25 },
          { x: r * 0.95, y: 0 },
          { x: 0, y: r * 1.25 },
          { x: -r * 0.95, y: 0 },
        ];
      }
      case 'triangle': {
        const segments = 3;
        for (let i = 0; i < segments; i++) {
          const a = (i / segments) * Math.PI * 2 - Math.PI / 2;
          vertices.push({ x: Math.cos(a) * r * 1.28, y: Math.sin(a) * r * 1.28 });
        }
        return vertices;
      }
      case 'heart': {
        // Parametric heart formula centered cleanly at (0, 0)
        const segments = 28;
        const scale = r / 18.5;
        for (let i = 0; i < segments; i++) {
          const t = (i / segments) * Math.PI * 2;
          const x = 16 * Math.pow(Math.sin(t), 3);
          const yRaw = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          const y = yRaw - 2.25;
          vertices.push({ x: x * scale, y: y * scale });
        }
        return vertices;
      }
      case 'hexagon': {
        const segments = 6;
        for (let i = 0; i < segments; i++) {
          const a = (i / segments) * Math.PI * 2 - Math.PI / 6;
          vertices.push({ x: Math.cos(a) * r * 1.05, y: Math.sin(a) * r * 1.05 });
        }
        return vertices;
      }
      case 'circle': {
        const segments = 24;
        for (let i = 0; i < segments; i++) {
          const a = (i / segments) * Math.PI * 2;
          vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
        }
        return vertices;
      }
      case 'pentagon': {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
        }
        return vertices;
      }
      default:
        return this.getVerticesForShape('square', r);
    }
  }

  private normalizeAngle(angle: number): number {
    let a = angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  public destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    for (const layer of this.boxLayers) {
      if (layer.body) {
        this.physics.destroyBody(layer.body);
      }
    }
    this.boxLayers = [];

    for (const ring of this.ringData) {
      if (ring.body) {
        this.physics.destroyBody(ring.body);
      }
    }
    this.ringData = [];

    for (const f of this.circularFixtures) {
      try {
        this.rootBody.destroyFixture(f);
      } catch {}
    }
    this.circularFixtures = [];

    this.physics.destroyBody(this.rootBody);
  }
}
