import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { createFibelApp, type FibelConfig } from "../src";
import { resolveConfig } from "../src/config";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("collections", () => {
  test("keeps legacy content routing unchanged when collections are omitted", async () => {
    const root = await fixtureRoot();
    const app = await createFibelApp({
      title: "Legacy",
      root,
      content: "content/docs",
      routing: { basePath: "/docs" },
      locales: [
        { code: "en", label: "English" },
        { code: "de", label: "Deutsch" },
      ],
      defaultLocale: "en",
    });

    const redirect = await app.fetch(
      new Request("http://localhost/docs", {
        headers: { "Accept-Language": "de" },
      }),
    );
    expect(redirect.headers.get("location")).toBe("http://localhost/docs/en");
    expect(redirect.headers.get("set-cookie")).toBeNull();

    const page = await app.fetch(
      new Request("http://localhost/docs/en/configuration"),
    );
    expect(page.status).toBe(200);
    expect(page.headers.get("set-cookie")).toBeNull();
    expect(await page.text()).not.toContain("data-search-scope");
    expect(
      app.context.pages.find(
        (candidate) => candidate.href === "/docs/en/configuration",
      )?.id,
    ).toBe("en:/configuration");
  });

  test("resolves and validates collection configuration", () => {
    const resolved = resolveConfig({
      title: "Cloud",
      locales: [{ code: "en", label: "English" }],
      collections: [
        {
          id: "docs",
          label: "Docs",
          description: "Product documentation.",
          content: "content/docs",
        },
        {
          id: "ui",
          label: "UI",
          content: "content/ui",
          path: "/catalog/ui",
        },
      ],
    });

    expect(resolved.defaultCollection).toBe("docs");
    expect(resolved.collections).toEqual([
      {
        id: "docs",
        label: "Docs",
        description: "Product documentation.",
        content: "content/docs",
        path: "/docs",
      },
      {
        id: "ui",
        label: "UI",
        description: "UI documentation",
        content: "content/ui",
        path: "/catalog/ui",
      },
    ]);

    expect(() =>
      resolveConfig({
        title: "Invalid",
        locales: [{ code: "en", label: "English" }],
        collections: [
          { id: "docs", label: "Docs", content: "docs", path: "/en" },
        ],
      }),
    ).toThrow('Collection path "/en" conflicts with reserved route segment "en"');

    expect(() =>
      resolveConfig({
        title: "Invalid",
        locales: [{ code: "en", label: "English" }],
        collections: [
          { id: "docs", label: "Docs", content: "docs" },
          { id: "docs", label: "Other", content: "other" },
        ],
      }),
    ).toThrow('Duplicate collection id "docs"');

    expect(() =>
      resolveConfig({
        title: "Invalid",
        locales: [{ code: "en", label: "English" }],
        collections: [
          { id: "docs", label: "Docs", content: "docs", path: "/catalog" },
          {
            id: "ui",
            label: "UI",
            content: "ui",
            path: "/catalog/ui",
          },
        ],
      }),
    ).toThrow(
      'Collection path "/catalog/ui" overlaps collection path "/catalog"',
    );

    expect(() =>
      resolveConfig({
        title: "Invalid",
        defaultCollection: "",
        locales: [{ code: "en", label: "English" }],
        collections: [
          { id: "docs", label: "Docs", content: "docs" },
        ],
      }),
    ).toThrow('defaultCollection "" is not listed in collections');
  });

  test("loads isolated Markdown and custom pages with canonical routes", async () => {
    const app = await collectionApp({
      pages: [
        {
          collection: "ui",
          path: "/status-card",
          title: "StatusCard",
          description: "Displays service state.",
          context: "# StatusCard\n\nThe status-card-probe is host rendered.",
          render: ({ context }) => `<section data-status-card>${context.html}</section>`,
        },
      ],
    });

    const docs = await html(app, "/docs/en/docs");
    expect(docs).toContain("Documentation home");
    expect(docs).not.toContain("Button component body");
    expect(docs).toContain('href="/docs/en/ui"');
    expect(docs).toContain("fibel-collection-link is-active");
    expect(docs).toContain(
      'class="mb-6 space-y-1 border-b border-zinc-200 pb-5 dark:border-white/10"',
    );
    expect(docs).not.toContain(
      'class="mb-6 flex flex-wrap gap-1 border-b border-zinc-200',
    );

    const button = await html(app, "/docs/en/ui/button");
    expect(button).toContain("Button component body");
    expect(button).not.toContain("Configuration guide body");
    expect(button).toContain('"collection":"ui"');

    const custom = await html(app, "/docs/en/ui/status-card");
    expect(custom).toContain("data-status-card");
    expect(custom).toContain("status-card-probe");

    const raw = await (
      await app.fetch(
        new Request("http://localhost/docs/de/ui/button.markdown"),
      )
    ).text();
    expect(raw).toContain("Deutscher Button-Inhalt");

    const page = app.context.pages.find(
      (candidate) => candidate.href === "/docs/en/ui/status-card",
    );
    expect(page?.collection?.id).toBe("ui");
    expect(
      app.context.nav.get("en:ui")?.flatMap((section) => section.pages),
    ).toContain(page);
  });

  test("redirects locale-neutral collection routes to the preferred locale", async () => {
    const app = await collectionApp();

    const accepted = await app.fetch(
      new Request("http://localhost/docs/ui/button?preview=1", {
        headers: { "Accept-Language": "de-DE,de;q=0.9,en;q=0.5" },
      }),
    );
    expect(accepted.status).toBe(302);
    expect(accepted.headers.get("location")).toBe(
      "http://localhost/docs/de/ui/button?preview=1",
    );
    expect(accepted.headers.get("cache-control")).toBe("private, no-store");

    const stored = await app.fetch(
      new Request("http://localhost/docs/ui/button.md", {
        headers: {
          Cookie: "fibel_locale=en",
          "Accept-Language": "de",
        },
      }),
    );
    expect(stored.headers.get("location")).toBe(
      "http://localhost/docs/en/ui/button.md",
    );

    const localeRoot = await app.fetch(
      new Request("http://localhost/docs/de"),
    );
    expect(localeRoot.headers.get("location")).toBe(
      "http://localhost/docs/de/docs",
    );

    const mountRoot = await app.fetch(
      new Request("http://localhost/docs", {
        headers: { "Accept-Language": "de" },
      }),
    );
    expect(mountRoot.headers.get("location")).toBe(
      "http://localhost/docs/de/docs",
    );

    expect(
      (
        await app.fetch(
          new Request("http://localhost/docs/unknown/button"),
        )
      ).status,
    ).toBe(404);

    const canonical = await app.fetch(
      new Request("http://localhost/docs/en/ui/button"),
    );
    expect(canonical.headers.get("set-cookie")).toContain("fibel_locale=en");
  });

  test("scopes search, navigation, llms, and language alternates", async () => {
    const app = await collectionApp();

    const scoped = await (
      await app.fetch(
        new Request(
          "http://localhost/docs/_fibel/search?locale=en&collection=ui&q=probe",
        ),
      )
    ).json();
    expect(scoped.results.map((entry: { href: string }) => entry.href)).toEqual([
      "/docs/en/ui/button",
    ]);
    expect(scoped.results[0]).toMatchObject({
      collection: "ui",
      collectionLabel: "UI",
    });

    const everything = await (
      await app.fetch(
        new Request(
          "http://localhost/docs/_fibel/search?locale=en&q=probe",
        ),
      )
    ).json();
    expect(
      everything.results.map((entry: { collection: string }) => entry.collection),
    ).toEqual(expect.arrayContaining(["docs", "ui"]));

    const invalid = await app.fetch(
      new Request(
        "http://localhost/docs/_fibel/search?locale=en&collection=missing&q=x",
      ),
    );
    expect(invalid.status).toBe(400);

    const globalLlms = await (
      await app.fetch(new Request("http://localhost/docs/en/llms.txt"))
    ).text();
    expect(globalLlms).toContain("## Collections");
    expect(globalLlms).toContain(
      "https://example.com/docs/en/ui/llms.txt",
    );
    expect(globalLlms).toContain(
      "https://example.com/docs/en/docs/configuration.md",
    );

    const scopedLlms = await (
      await app.fetch(
        new Request("http://localhost/docs/en/ui/llms-full.txt"),
      )
    ).text();
    expect(scopedLlms).toContain("/docs/en/ui/button.md");
    expect(scopedLlms).not.toContain("/docs/en/docs/configuration.md");

    const head = (await html(app, "/docs/en/ui/button")).split("</head>")[0] ?? "";
    expect(head).toContain(
      'hreflang="de" href="https://example.com/docs/de/ui/button"',
    );
    expect(head).not.toContain("/docs/de/docs/button");
  });
});

async function collectionApp(overrides: Partial<FibelConfig> = {}) {
  const root = await fixtureRoot();
  return createFibelApp({
    title: "Cloud",
    description: "Cloud documentation and component reference.",
    siteUrl: "https://example.com",
    root,
    assets: "assets",
    routing: { basePath: "/docs" },
    locales: [
      { code: "en", label: "English" },
      { code: "de", label: "Deutsch" },
    ],
    defaultLocale: "en",
    collections: [
      {
        id: "docs",
        label: "Docs",
        description: "Product documentation.",
        content: "content/docs",
      },
      {
        id: "ui",
        label: "UI",
        description: "Component reference.",
        content: "content/ui",
      },
    ],
    defaultCollection: "docs",
    ...overrides,
  });
}

async function fixtureRoot() {
  const root = await mkdtemp(
    join(process.cwd(), ".test-fibel-collections-"),
  );
  roots.push(root);
  const pages = {
    "content/docs/en/index.md":
      "---\ntitle: Documentation\ndescription: Documentation home.\n---\n# Documentation\n\nDocumentation home with shared-probe.",
    "content/docs/de/index.md":
      "---\ntitle: Dokumentation\ndescription: Startseite der Dokumentation.\n---\n# Dokumentation\n\nDeutsche Dokumentation.",
    "content/docs/en/configuration.md":
      "---\ntitle: Configuration\nsection: Guide\n---\n# Configuration\n\nConfiguration guide body with configuration-probe.",
    "content/docs/de/configuration.md":
      "---\ntitle: Konfiguration\nsection: Guide\n---\n# Konfiguration\n\nDeutsche Konfiguration.",
    "content/ui/en/index.md":
      "---\ntitle: Components\ndescription: Component reference.\n---\n# Components\n\nComponent reference home.",
    "content/ui/de/index.md":
      "---\ntitle: Komponenten\ndescription: Komponentenreferenz.\n---\n# Komponenten\n\nKomponentenreferenz.",
    "content/ui/en/button.md":
      "---\ntitle: Button\nsection: Components\n---\n# Button\n\nButton component body with button-probe.",
    "content/ui/de/button.md":
      "---\ntitle: Button\nsection: Komponenten\n---\n# Button\n\nDeutscher Button-Inhalt.",
  };
  for (const [path, body] of Object.entries(pages)) {
    const target = join(root, path);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, body);
  }
  return root;
}

async function html(
  app: Awaited<ReturnType<typeof createFibelApp>>,
  path: string,
) {
  const response = await app.fetch(new Request(`http://localhost${path}`));
  expect(response.status).toBe(200);
  return response.text();
}
