import { describe, expect, test } from "bun:test";
import { joinUrl, normalizeBasePath, withoutBasePath } from "../src/utils";

describe("routing helpers", () => {
  test("normalizes base paths", () => {
    expect(normalizeBasePath("/docs/")).toBe("/docs");
    expect(normalizeBasePath("/")).toBe("");
  });

  test("joins url parts", () => {
    expect(joinUrl("/docs", "/_fibel", "search")).toBe("/docs/_fibel/search");
  });

  test("removes matching base path", () => {
    expect(withoutBasePath("/docs/_fibel/search", "/docs")).toBe("/_fibel/search");
    expect(withoutBasePath("/other", "/docs")).toBeUndefined();
  });
});
