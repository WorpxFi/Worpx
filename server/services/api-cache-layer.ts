interface CacheEntry<T> {
  key: string;
  data: T;
  createdAt: number;
  ttlMs: number;
  hits: number;
  tags: string[];
}

export class ApiCacheLayer {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 1000) { this.maxSize = maxSize; }

  set<T>(key: string, data: T, ttlMs: number = 30000, tags: string[] = []): void {
    if (this.cache.size >= this.maxSize) this.evictOldest();
    this.cache.set(key, { key, data, createdAt: Date.now(), ttlMs, hits: 0, tags });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > entry.ttlMs) { this.cache.delete(key); return null; }
    entry.hits++;
    return entry.data as T;
  }

  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [key, entry] of this.cache) {
      if (entry.tags.includes(tag)) { this.cache.delete(key); count++; }
    }
    return count;
  }

  invalidate(key: string): boolean { return this.cache.delete(key); }

  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.cache) {
      if (entry.createdAt < oldestTime) { oldestTime = entry.createdAt; oldest = key; }
    }
    if (oldest) this.cache.delete(oldest);
  }

  getStats(): { size: number; hitRate: number } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((s, e) => s + e.hits, 0);
    return { size: this.cache.size, hitRate: entries.length > 0 ? totalHits / entries.length : 0 };
  }

  flush(): void { this.cache.clear(); }
}