/**
 * Tiny in-memory LRU-ish cache for hot, read-heavy lookups.
 * Used to avoid repeated DB hits for businessConfig / HSN list / categories
 * on a 512 MB box. Single-user workload => tiny footprint.
 */

class SimpleCache {
  constructor(ttlMs = 30_000, maxEntries = 200) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.map = new Map(); // key -> {value, expires}
  }
  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.map.delete(key);
      return undefined;
    }
    // LRU touch: re-insert to keep recency
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }
  set(key, value, ttlMs = this.ttlMs) {
    if (this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expires: Date.now() + ttlMs });
  }
  del(key) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
}

const globalCache = new SimpleCache(30_000, 300);

module.exports = { SimpleCache, globalCache };
