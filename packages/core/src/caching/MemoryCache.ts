/**
 * Options for configuring in-memory cache behavior.
 */
export interface MemoryCacheOptions {
  /** Maximum number of entries before oldest entries are evicted (LRU). Defaults to 1000. */
  maxSize?: number;
  /** Default Time-to-Live in milliseconds. When not specified, items do not expire by default. */
  defaultTtlMs?: number;
  /** Optional callback invoked when an item is evicted due to max capacity. */
  onEvict?: (key: string, value: unknown) => void;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
  lastAccessed: number;
}

/**
 * High-performance, LRU-evicting in-memory cache with optional TTL expiration.
 * Suitable for caching compiled email templates, theme tokens, and component definitions.
 */
export class MemoryCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly defaultTtlMs: number | null;
  private readonly onEvict?: ((key: string, value: T) => void) | undefined;

  constructor(options: MemoryCacheOptions = {}) {
    this.maxSize = Math.max(1, options.maxSize ?? 1000);
    this.defaultTtlMs = options.defaultTtlMs && options.defaultTtlMs > 0 ? options.defaultTtlMs : null;
    this.onEvict = options.onEvict as ((key: string, value: T) => void) | undefined;
  }

  /**
   * Retrieves a cached value. Returns undefined if key is missing or expired.
   */
  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    const now = Date.now();
    if (entry.expiresAt !== null && entry.expiresAt <= now) {
      this.store.delete(key);
      return undefined;
    }

    // Refresh LRU ordering
    entry.lastAccessed = now;
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value;
  }

  /**
   * Sets or updates a cache entry with optional item-specific TTL.
   */
  set(key: string, value: T, ttlMs?: number): this {
    const now = Date.now();
    const effectiveTtl = ttlMs !== undefined ? ttlMs : this.defaultTtlMs;
    const expiresAt = effectiveTtl !== null && effectiveTtl > 0 ? now + effectiveTtl : null;

    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxSize) {
      this.evictOldest();
    }

    this.store.set(key, {
      value,
      expiresAt,
      lastAccessed: now,
    });

    return this;
  }

  /**
   * Checks whether a valid (unexpired) entry exists for the given key.
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Removes a specific key from the cache.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clears all cached items.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Current count of active items in the cache.
   */
  get size(): number {
    this.prune();
    return this.store.size;
  }

  /**
   * Removes all expired entries from cache. Returns count of purged items.
   */
  prune(): number {
    const now = Date.now();
    let purged = 0;
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) {
        this.store.delete(key);
        purged += 1;
      }
    }
    return purged;
  }

  /**
   * Retrieves an item if present and not expired, otherwise computes it using factory.
   */
  async getOrSet(
    key: string,
    factory: () => T | Promise<T>,
    ttlMs?: number,
  ): Promise<T> {
    const existing = this.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const computed = await factory();
    this.set(key, computed, ttlMs);
    return computed;
  }

  /**
   * Returns all active unexpired keys.
   */
  keys(): string[] {
    this.prune();
    return Array.from(this.store.keys());
  }

  /**
   * Returns all active unexpired values.
   */
  values(): T[] {
    this.prune();
    return Array.from(this.store.values()).map((e) => e.value);
  }

  /**
   * Returns all active unexpired entries as [key, value] pairs.
   */
  entries(): [string, T][] {
    this.prune();
    return Array.from(this.store.entries()).map(([k, e]) => [k, e.value]);
  }

  private evictOldest(): void {
    const firstKey = this.store.keys().next().value;
    if (firstKey !== undefined) {
      const entry = this.store.get(firstKey);
      this.store.delete(firstKey);
      if (this.onEvict && entry) {
        this.onEvict(firstKey, entry.value);
      }
    }
  }
}
