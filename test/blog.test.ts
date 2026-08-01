import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { join } from "path";
import { createFibelApp, defaultPlugins, type FibelConfig } from "../src";
import { blogPlugin } from "../src/plugins";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("blog plugin", () => {
  test("renders a date-sorted feed and year navigation from Markdown posts", async () => {
    const config = await fixtureConfig();
    const app = await createFibelApp(config);
    const response = await app.fetch(new Request("https://example.com/en/blog"));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Product notes");
    expect(html).toContain("Newest post");
    expect(html).toContain("Older post");
    expect(html.indexOf("Newest post")).toBeLessThan(html.indexOf("Older post"));
    expect(html).toContain("First public paragraph.");
    expect(html).not.toContain("Private remainder on the feed.");
    expect(html).toContain("Fibel Team");
    expect(html).toContain('datetime="2026-07-18"');

    const sections = app.context.nav.get("en:blog");
    expect(sections?.map((section) => section.label)).toEqual(["2026", "2025"]);
    expect(sections?.[0]?.pages.map((page) => page.meta.title)).toEqual([
      "Newest post",
      "Second post",
    ]);
    expect(sections?.flatMap((section) => section.pages).some((page) => page.slug === "/")).toBe(false);
  });

  test("keeps posts available to search, raw Markdown, llms, and SEO", async () => {
    const app = await createFibelApp(await fixtureConfig());
    const search = await (
      await app.fetch(
        new Request(
          "https://example.com/_fibel/search?locale=en&collection=blog&q=remainder",
        ),
      )
    ).json();
    expect(search.results.map((entry: { title: string }) => entry.title)).toContain(
      "Newest post",
    );

    const raw = await (
      await app.fetch(new Request("https://example.com/en/blog/newest.md"))
    ).text();
    expect(raw).toContain("Private remainder on the feed.");

    const llms = await (
      await app.fetch(new Request("https://example.com/en/blog/llms-full.txt"))
    ).text();
    expect(llms).toContain("Private remainder on the feed.");

    const article = await (
      await app.fetch(new Request("https://example.com/en/blog/newest"))
    ).text();
    expect(article).toContain("Private remainder on the feed.");
    expect(article).toContain('property="article:published_time" content="2026-07-18"');
    expect(article).toContain('"datePublished":"2026-07-18"');
    expect(article).toContain('"name":"Fibel Team"');
  });

  test("requires a configured collection and valid dates", async () => {
    const root = await fixtureRoot({
      "content/docs/en/index.md": "# Docs",
      "content/blog/en/no-date.md": "# Missing date",
    });
    const base = {
      title: "Product",
      root,
      locales: [{ code: "en", label: "English" }],
      collections: [
        { id: "docs", label: "Docs", content: "content/docs" },
        { id: "blog", label: "Blog", content: "content/blog" },
      ],
    } satisfies FibelConfig;

    await expect(
      createFibelApp({
        ...base,
        plugins: [...defaultPlugins(), blogPlugin({ collection: "missing" })],
      }),
    ).rejects.toThrow('blogPlugin collection "missing" is not configured');
    await expect(
      createFibelApp({
        ...base,
        plugins: [...defaultPlugins(), blogPlugin({ collection: "blog" })],
      }),
    ).rejects.toThrow("requires a valid date frontmatter value");
  });

  test("does not mutate the reusable input pages array", async () => {
    const config = await fixtureConfig();
    await createFibelApp(config);
    await createFibelApp(config);
    expect(config.pages).toBeUndefined();
  });
});

async function fixtureConfig(): Promise<FibelConfig> {
  const root = await fixtureRoot({
    "content/docs/en/index.md": "# Docs\n\nProduct documentation.",
    "content/blog/en/newest.md": `---
title: Newest post
description: The newest note.
date: 2026-07-18
authors: [Fibel Team]
tags: [release]
---
# Newest post

First public paragraph.

<!-- truncate -->

Private remainder on the feed.`,
    "content/blog/en/second.md": `---
title: Second post
date: 2026-01-03
---
# Second post

Second body.`,
    "content/blog/en/older.md": `---
title: Older post
date: 2025-06-01
---
# Older post

Older body.`,
  });
  return {
    title: "Product",
    description: "Product documentation.",
    siteUrl: "https://example.com",
    root,
    locales: [{ code: "en", label: "English" }],
    collections: [
      { id: "docs", label: "Docs", content: "content/docs" },
      {
        id: "blog",
        label: "Product notes",
        description: "News and field notes from the product team.",
        content: "content/blog",
      },
    ],
    defaultCollection: "docs",
    plugins: [...defaultPlugins(), blogPlugin({ collection: "blog" })],
  };
}

async function fixtureRoot(files: Record<string, string>) {
  const root = await mkdtemp(join(process.cwd(), ".test-fibel-blog-"));
  roots.push(root);
  for (const [path, body] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, body);
  }
  return root;
}
