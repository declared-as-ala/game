import { Ball } from './Ball';

/**
 * Dedicated marble look for Marble Escape, matching the reference project
 * (godot_neon_marble_escape_multiplier_v21) exactly: a soft outer glow, a
 * tighter mid glow, a solid color core, and a small offset white highlight
 * dot. No evolution ring, no life pips, no shine arc.
 */
export class Marble extends Ball {
  public override redraw(): void {
    const r = this.radius;

    this.glowGraphics.clear();
    this.glowGraphics.circle(0, 0, r * 2.7).fill({ color: this.color, alpha: 0.07 });
    this.glowGraphics.circle(0, 0, r * 1.75).fill({ color: this.color, alpha: 0.18 });

    this.graphics.clear();
    this.graphics.circle(0, 0, r).fill({ color: this.color, alpha: 1.0 });
    this.graphics.circle(-r * 0.28, -r * 0.28, r * 0.26).fill({ color: 0xffffff, alpha: 0.82 });

    this.lifePipsGraphics.clear();
  }
}
