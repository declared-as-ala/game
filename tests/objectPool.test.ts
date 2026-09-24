import { describe, it, expect } from 'vitest';
import { ObjectPool } from '@/systems/ObjectPool';

interface TestItem {
  id: number;
  active: boolean;
}

describe('ObjectPool', () => {
  it('should allocate, recycle, and reset items without runaway allocation', () => {
    let nextId = 1;
    const pool = new ObjectPool<TestItem>(
      () => ({ id: nextId++, active: false }),
      (item) => {
        item.active = false;
      },
      5,
      20
    );

    expect(pool.getPoolSize()).toBe(5);
    expect(pool.getActiveCount()).toBe(0);

    const item1 = pool.get();
    const item2 = pool.get();
    expect(pool.getActiveCount()).toBe(2);

    pool.release(item1);
    expect(pool.getActiveCount()).toBe(1);

    const item3 = pool.get();
    expect(item3.id).toBe(item1.id); // Reused item
    expect(pool.getActiveCount()).toBe(2);

    pool.releaseAll([item2, item3]);
    expect(pool.getActiveCount()).toBe(0);
  });
});
