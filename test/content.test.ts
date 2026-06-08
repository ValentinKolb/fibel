import { describe, expect, test } from "bun:test";
import { parseFrontmatter } from "../src/content";

describe("frontmatter", () => {
  test("parses flat metadata", () => {
    const parsed = parseFrontmatter("---\ntitle: Hello\norder: 2\nhidden: false\ntags: [core, plugin-api]\n---\n# Body");
    expect(parsed.data.title).toBe("Hello");
    expect(parsed.data.order).toBe(2);
    expect(parsed.data.hidden).toBe(false);
    expect(parsed.data.tags).toEqual(["core", "plugin-api"]);
    expect(parsed.body).toBe("# Body");
  });
});
