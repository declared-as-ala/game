export class ObjectPool<T> {
  private pool: T[] = [];
  private activeCount = 0;
  private factory: () => T;
  private resetFn: (item: T) => void;
  private maxSize: number;

  constructor(factory: () => T, resetFn: (item: T) => void, initialSize = 20, maxSize = 300) {
    this.factory = factory;
    this.resetFn = resetFn;
    this.maxSize = maxSize;

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  public get(): T {
    let item: T;
    if (this.pool.length > 0) {
      item = this.pool.pop()!;
    } else {
      item = this.factory();
    }
    this.activeCount++;
    this.resetFn(item);
    return item;
  }

  public release(item: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(item);
      this.pool.push(item);
    }
    this.activeCount = Math.max(0, this.activeCount - 1);
  }

  public releaseAll(activeItems: T[]): void {
    for (const item of activeItems) {
      this.release(item);
    }
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public getPoolSize(): number {
    return this.pool.length;
  }
}
