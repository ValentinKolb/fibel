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

  test("keeps one-line descriptions unchanged", () => {
    const parsed = parseFrontmatter(
      "---\ndescription: Build and maintain applications.\n---\n",
    );

    expect(parsed.data.description).toBe(
      "Build and maintain applications.",
    );
  });

  test("folds block descriptions into prose", () => {
    const parsed = parseFrontmatter(
      "---\ndescription: >\n  Build and maintain applications on Cloud.\n  Use this skill for application development.\n---\n",
    );

    expect(parsed.data.description).toBe(
      "Build and maintain applications on Cloud. Use this skill for application development.",
    );
  });

  test("preserves line breaks in literal block descriptions", () => {
    const parsed = parseFrontmatter(
      "---\ndescription: |\n  Build and maintain applications on Cloud.\n  Use this skill for application development.\n---\n",
    );

    expect(parsed.data.description).toBe(
      "Build and maintain applications on Cloud.\nUse this skill for application development.",
    );
  });

  test("parses fields following a block value", () => {
    const parsed = parseFrontmatter(
      "---\ndescription: >\n  Build applications.\norder: 2\nhidden: false\n---\n",
    );

    expect(parsed.data.description).toBe("Build applications.");
    expect(parsed.data.order).toBe(2);
    expect(parsed.data.hidden).toBe(false);
  });

  test("returns an empty string for empty or malformed block values", () => {
    const empty = parseFrontmatter(
      "---\ndescription: >\norder: 2\n---\n",
    );
    const malformed = parseFrontmatter(
      "---\ndescription: |\nnot indented\nhidden: true\n---\n",
    );

    expect(empty.data.description).toBe("");
    expect(empty.data.order).toBe(2);
    expect(malformed.data.description).toBe("");
    expect(malformed.data.hidden).toBe(true);
  });
});
