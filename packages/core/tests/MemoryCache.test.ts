import { describe, it, expect, vi } from "vitest";
import { MemoryCache } from "../src/caching/MemoryCache.js";

describe("MemoryCache", () => {
  it("stores and retrieves values", () => {
    const cache = new MemoryCache<string>();
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
    expect(cache.has("key1")).toBe(true);
    expect(cache.size).toBe(1);
  });

  it("returns undefined for non-existent keys", () => {
    const cache = new MemoryCache<number>();
    expect(cache.get("missing")).toBeUndefined();
    expect(cache.has("missing")).toBe(false);
  });

  it("evicts oldest entries when maxSize is reached", () => {
    const evicted: string[] = [];
    const cache = new MemoryCache<number>({
      maxSize: 3,
      onEvict: (k) => evicted.push(k),
    });

    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    cache.set("d", 4);

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("d")).toBe(4);
    expect(evicted).toEqual(["a"]);
  });

  it("refreshes LRU position on get", () => {
    const cache = new MemoryCache<number>({ maxSize: 2 });
    cache.set("a", 1);
    cache.set("b", 2);

    // Access "a", making "b" the oldest
    cache.get("a");

    cache.set("c", 3);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
  });

  it("expires items after TTL", async () => {
    const cache = new MemoryCache<string>();
    cache.set("temp", "hello", 20);

    expect(cache.get("temp")).toBe("hello");

    await new Promise((r) => setTimeout(r, 35));
    expect(cache.get("temp")).toBeUndefined();
    expect(cache.has("temp")).toBe(false);
  });

  it("prunes expired entries", async () => {
    const cache = new MemoryCache<string>({ defaultTtlMs: 20 });
    cache.set("t1", "v1");
    cache.set("t2", "v2");

    await new Promise((r) => setTimeout(r, 30));
    expect(cache.prune()).toBe(2);
    expect(cache.size).toBe(0);
  });

  it("handles getOrSet helper", async () => {
    const cache = new MemoryCache<number>();
    const factory = vi.fn(() => 42);

    const val1 = await cache.getOrSet("calc", factory);
    const val2 = await cache.getOrSet("calc", factory);

    expect(val1).toBe(42);
    expect(val2).toBe(42);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("supports delete, clear, keys, values, and entries", () => {
    const cache = new MemoryCache<string>();
    cache.set("x", "1");
    cache.set("y", "2");

    expect(cache.keys()).toEqual(["x", "y"]);
    expect(cache.values()).toEqual(["1", "2"]);
    expect(cache.entries()).toEqual([["x", "1"], ["y", "2"]]);

    cache.delete("x");
    expect(cache.has("x")).toBe(false);
    expect(cache.size).toBe(1);

    cache.clear();
    expect(cache.size).toBe(0);
  });
});

