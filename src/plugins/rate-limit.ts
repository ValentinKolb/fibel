export type RateLimitResult = {
  limited: boolean;
  /** Milliseconds until the current window ends. */
  resetIn: number;
};

export type RateLimiter = {
  check(identifier: string): Promise<RateLimitResult>;
};

type Counter = {
  window: number;
  current: number;
  previous: number;
};

/** Process-local weighted sliding-window counter. Rejected attempts also count. */
export function createMemoryRateLimiter(limit: number, windowMs: number): RateLimiter {
  if (!Number.isFinite(limit) || limit <= 0) throw new Error("limit must be > 0");
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new Error("windowMs must be > 0");

  const counters = new Map<string, Counter>();
  let lastCleanupWindow = -Infinity;

  return {
    async check(identifier) {
      const now = Date.now();
      const window = Math.floor(now / windowMs);
      const elapsed = now % windowMs;
      if (window > lastCleanupWindow) {
        for (const [key, counter] of counters) {
          if (counter.window < window - 1) counters.delete(key);
        }
        lastCleanupWindow = window;
      }

      let counter = counters.get(identifier);
      if (!counter || counter.window !== window) {
        counter = {
          window,
          current: 0,
          previous: counter?.window === window - 1 ? counter.current : 0,
        };
        counters.set(identifier, counter);
      }
      counter.current += 1;
      return {
        limited: counter.previous * (1 - elapsed / windowMs) + counter.current > limit,
        resetIn: windowMs - elapsed,
      };
    },
  };
}
