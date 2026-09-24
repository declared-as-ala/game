import * as planck from 'planck';
import { APP_CONFIG } from '@/app/config';
import type { Vector2D } from '@/data/types';

export interface CollisionEvent {
  bodyA: planck.Body;
  bodyB: planck.Body;
  fixtureA: planck.Fixture;
  fixtureB: planck.Fixture;
  contact: planck.Contact;
  normal?: planck.Vec2;
  point?: planck.Vec2;
}

export type ContactCallback = (event: CollisionEvent) => void;

export class PhysicsWorld {
  private world: planck.World;
  private scale: number;
  private contactListeners: ContactCallback[] = [];
  private endContactListeners: ContactCallback[] = [];

  constructor(gravity: Vector2D = { x: 0, y: 0 }) {
    this.scale = APP_CONFIG.PHYSICS.SCALE;
    this.world = new planck.World({
      gravity: planck.Vec2(gravity.x, gravity.y),
    });

    this.setupContactListeners();
  }

  private setupContactListeners(): void {
    this.world.on('begin-contact', (contact: planck.Contact) => {
      const fixtureA = contact.getFixtureA();
      const fixtureB = contact.getFixtureB();
      const bodyA = fixtureA.getBody();
      const bodyB = fixtureB.getBody();

      const manifold = contact.getWorldManifold(null);
      const normal = manifold && manifold.normal ? planck.Vec2(manifold.normal.x, manifold.normal.y) : undefined;
      const points = manifold ? manifold.points : [];
      const point = points && points.length > 0 && points[0] ? planck.Vec2(points[0].x, points[0].y) : undefined;

      const event: CollisionEvent = {
        bodyA,
        bodyB,
        fixtureA,
        fixtureB,
        contact,
        normal,
        point,
      };

      for (const listener of this.contactListeners) {
        listener(event);
      }
    });

    this.world.on('end-contact', (contact: planck.Contact) => {
      const fixtureA = contact.getFixtureA();
      const fixtureB = contact.getFixtureB();
      const bodyA = fixtureA.getBody();
      const bodyB = fixtureB.getBody();

      const event: CollisionEvent = {
        bodyA,
        bodyB,
        fixtureA,
        fixtureB,
        contact,
      };

      for (const listener of this.endContactListeners) {
        listener(event);
      }
    });
  }

  private destructionQueue: Set<planck.Body> = new Set();

  public step(dt: number): void {
    this.world.step(
      dt,
      APP_CONFIG.PHYSICS.VELOCITY_ITERATIONS,
      APP_CONFIG.PHYSICS.POSITION_ITERATIONS
    );

    if (this.destructionQueue.size > 0) {
      for (const body of this.destructionQueue) {
        try {
          this.world.destroyBody(body);
        } catch (e) {
          console.warn('[PhysicsWorld] Deferred destroyBody error:', e);
        }
      }
      this.destructionQueue.clear();
    }
  }

  public getWorld(): planck.World {
    return this.world;
  }

  public getScale(): number {
    return this.scale;
  }

  public toPhysicsX(pixelX: number): number {
    return pixelX / this.scale;
  }

  public toPhysicsY(pixelY: number): number {
    return pixelY / this.scale;
  }

  public toRenderX(physicsX: number): number {
    return physicsX * this.scale;
  }

  public toRenderY(physicsY: number): number {
    return physicsY * this.scale;
  }

  public toPhysicsVec(pixel: Vector2D): planck.Vec2 {
    return planck.Vec2(pixel.x / this.scale, pixel.y / this.scale);
  }

  public toRenderVec(physicsVec: planck.Vec2): Vector2D {
    return {
      x: physicsVec.x * this.scale,
      y: physicsVec.y * this.scale,
    };
  }

  public onContact(callback: ContactCallback): () => void {
    this.contactListeners.push(callback);
    return () => {
      this.contactListeners = this.contactListeners.filter((cb) => cb !== callback);
    };
  }

  public onEndContact(callback: ContactCallback): () => void {
    this.endContactListeners.push(callback);
    return () => {
      this.endContactListeners = this.endContactListeners.filter((cb) => cb !== callback);
    };
  }

  public destroyBody(body: planck.Body): void {
    if (!body) return;
    if (this.world.isLocked()) {
      this.destructionQueue.add(body);
    } else {
      try {
        this.world.destroyBody(body);
      } catch (e) {
        console.warn('[PhysicsWorld] destroyBody error:', e);
      }
    }
  }

  public clear(): void {
    this.destructionQueue.clear();
    let body = this.world.getBodyList();
    while (body) {
      const next = body.getNext();
      try {
        this.world.destroyBody(body);
      } catch {}
      body = next;
    }
    this.contactListeners = [];
    this.endContactListeners = [];
  }

  /**
   * Raycasts the world from p1 to p2 and finds the closest collision point and normal
   */
  public raycastClosest(
    p1: planck.Vec2,
    p2: planck.Vec2,
    filterMask?: (fixture: planck.Fixture) => boolean
  ): { point: planck.Vec2; normal: planck.Vec2; fraction: number; fixture: planck.Fixture } | null {
    let closestHit: {
      point: planck.Vec2;
      normal: planck.Vec2;
      fraction: number;
      fixture: planck.Fixture;
    } | null = null;
    let minFraction = 1.0;

    this.world.rayCast(p1, p2, (fixture, point, normal, fraction) => {
      if (filterMask && !filterMask(fixture)) {
        return -1.0; // Filter this fixture out
      }

      if (fraction < minFraction) {
        minFraction = fraction;
        closestHit = {
          point: planck.Vec2(point.x, point.y),
          normal: planck.Vec2(normal.x, normal.y),
          fraction,
          fixture,
        };
      }
      return fraction; // Clip ray to this fraction
    });

    return closestHit;
  }
}
