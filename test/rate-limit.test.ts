import { afterEach, expect, setSystemTime, test } from "bun:test";
import { createMemoryRateLimiter } from "../src/plugins/rate-limit";

afterEach(() => setSystemTime());

test("weights the previous window and includes rejected attempts", async () => {
  setSystemTime(60_000);
  const limiter = createMemoryRateLimiter(2, 60_000);
  expect((await limiter.check("a")).limited).toBe(false);
  expect((await limiter.check("a")).limited).toBe(false);
  expect(await limiter.check("a")).toEqual({ limited: true, resetIn: 60_000 });

  setSystemTime(120_000);
  expect(await limiter.check("a")).toEqual({ limited: true, resetIn: 60_000 });
  setSystemTime(165_000);
  expect(await limiter.check("a")).toEqual({ limited: true, resetIn: 15_000 });
  setSystemTime(180_000);
  expect((await limiter.check("a")).limited).toBe(true);
});

test("discounts the previous window as time passes", async () => {
  setSystemTime(60_000);
  const limiter = createMemoryRateLimiter(2, 60_000);
  await limiter.check("a");
  await limiter.check("a");
  setSystemTime(150_000);
  expect(await limiter.check("a")).toEqual({ limited: false, resetIn: 30_000 });
});

test("isolates keys and instances and forgets expired counters", async () => {
  setSystemTime(60_000);
  const limiter = createMemoryRateLimiter(1, 60_000);
  await limiter.check("a");
  expect((await limiter.check("a")).limited).toBe(true);
  expect((await limiter.check("b")).limited).toBe(false);
  expect((await createMemoryRateLimiter(1, 60_000).check("a")).limited).toBe(false);
  setSystemTime(180_000);
  expect((await limiter.check("a")).limited).toBe(false);
});

test("concurrent checks cannot oversubscribe the limit", async () => {
  setSystemTime(60_000);
  const limiter = createMemoryRateLimiter(2, 60_000);
  const results = await Promise.all(Array.from({ length: 10 }, () => limiter.check("a")));
  expect(results.filter((result) => !result.limited)).toHaveLength(2);
});

test("rejects invalid configuration", () => {
  for (const value of [0, -1, NaN, Infinity]) {
    expect(() => createMemoryRateLimiter(value, 60_000)).toThrow();
    expect(() => createMemoryRateLimiter(1, value)).toThrow();
  }
});
