import { describe, expect, test } from "bun:test";
import { createFibelApp, defaultPlugins } from "../src";
import config from "../fibel.config";

describe("fibel app", () => {
  test("renders a localized page", async () => {
    const app = await createFibelApp(config);
    const response = await app.fetch(new Request("http://localhost/en"));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Fibel publishes Markdown and host-rendered application pages");
  });

  test("searches server-side", async () => {
    const app = await createFibelApp(config);
    const response = await app.fetch(new Request("http://localhost/_fibel/search?locale=en&q=theme"));
    const data = await response.json();
    expect(data.results.length).toBeGreaterThan(0);
  });

  test("serves raw markdown page routes", async () => {
    const app = await createFibelApp(config);
    const response = await app.fetch(new Request("http://localhost/en/plugins.md"));
    const longResponse = await app.fetch(new Request("http://localhost/en/plugins.markdown"));
    expect(response.status).toBe(200);
    expect(longResponse.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(await response.text()).toContain("# Plugin API");
    expect(await longResponse.text()).toContain("# Plugin API");
  });

  test("resolves header links against the locale of the current page", async () => {
    const app = await createFibelApp({
      ...config,
      headerLinks: [
        { label: "Overview", value: "/" },
        { label: "Guide", value: "/runtime" },
        { label: "Source", value: "https://github.com/k2b-dev/fibel" },
      ],
    });

    const german = await (await app.fetch(new Request("http://localhost/de/runtime"))).text();
    expect(german).toContain('href="/de/runtime"');
    expect(german).toContain('href="/de"');
    expect(german).toContain('href="https://github.com/k2b-dev/fibel"');
    expect(german).toContain('fibel-header-link is-active" href="/de/runtime"');

    const english = await (await app.fetch(new Request("http://localhost/en"))).text();
    expect(english).toContain('fibel-header-link is-active" href="/en"');
    expect(english).not.toContain('fibel-header-link is-active" href="/en/runtime"');
  });

  test("resolves footer links against the locale of the current page", async () => {
    const app = await createFibelApp({
      ...config,
      footerLinks: [
        { label: "Imprint", value: "/imprint" },
        { label: "Source", value: "https://github.com/k2b-dev/fibel" },
      ],
    });

    const german = await (await app.fetch(new Request("http://localhost/de/runtime"))).text();
    expect(german).toContain('href="/de/imprint"');
    expect(german).toContain('href="https://github.com/k2b-dev/fibel"');

    const english = await (await app.fetch(new Request("http://localhost/en/runtime"))).text();
    expect(english).toContain('href="/en/imprint"');
  });

  test("publishes semantic accent tokens across the shared UI", async () => {
    const app = await createFibelApp(config);
    const html = await (await app.fetch(new Request("http://localhost/en/theme"))).text();
    const styles = await (await app.fetch(new Request("http://localhost/_fibel/styles.css"))).text();
    const client = await (await app.fetch(new Request("http://localhost/_fibel/client.js"))).text();

    expect(styles).toContain("--fibel-accent:#d69e2e");
    expect(styles).toContain("--fibel-accent-strong:#b7791f");
    expect(styles).toContain("--fibel-accent-foreground:#8a5a12");
    expect(styles).toContain("--fibel-accent-surface:#fffaf0");
    expect(styles).toContain("--fibel-focus-ring:var(--fibel-accent)");
    expect(styles).toContain("color:var(--fibel-accent-strong)");
    expect(styles).toMatch(/\.page-chip-accent\{[^}]*background:var\(--fibel-accent-surface\)/);
    expect(html).toContain("fibel-brand");
    expect(html).toContain("fibel-sidebar-link is-active");
    expect(html).toContain("fibel-pager-link");
    expect(client).toContain("search-result-section");
    expect(`${html}${client}`).not.toContain("text-[#b7791f]");
    expect(`${html}${client}`).not.toContain("border-[#d69e2e]");
  });

  test("wraps Markdown tables without changing table display semantics", async () => {
    const app = await createFibelApp(config);
    const html = await (await app.fetch(new Request("http://localhost/en/theme"))).text();
    const styles = await (await app.fetch(new Request("http://localhost/_fibel/styles.css"))).text();

    expect(html).toContain('<div class="fibel-table-scroll"><table>');
    expect(styles).toMatch(/\.fibel-prose \.fibel-table-scroll\{[^}]*overflow-x:auto/);
    expect(styles).toMatch(/\.fibel-prose \.fibel-table-scroll table\{[^}]*width:100%/);
    expect(styles).toMatch(/\.fibel-prose \.fibel-table-scroll table\{[^}]*min-width:max-content/);
    expect(styles).not.toContain(".fibel-prose table{display:block");
  });

  test("adds an external imprint link through a plugin", async () => {
    const { imprintPlugin } = await import("../src/plugins");
    const app = await createFibelApp({
      ...config,
      footerLinks: [],
      plugins: [...defaultPlugins(), imprintPlugin({ url: "https://example.com/imprint", label: "Impressum" })],
    });

    const html = await (await app.fetch(new Request("http://localhost/de"))).text();
    expect(html).toContain('href="https://example.com/imprint">Impressum</a>');
  });

  test("omits the header navigation when no header links are configured", async () => {
    const app = await createFibelApp({ ...config, headerLinks: [] });
    const response = await app.fetch(new Request("http://localhost/en"));
    expect(await response.text()).not.toContain("fibel-header-link");
  });

  test("renders plugin head tags into the document head", async () => {
    const app = await createFibelApp({
      ...config,
      plugins: [
        ...defaultPlugins(),
        {
          name: "test-head",
          setup(context) {
            context.headTags.push((page) => `<meta name="test-locale" content="${page.locale.code}">`);
            context.headTags.push(() => "");
          },
        },
      ],
    });

    const head = (await (await app.fetch(new Request("http://localhost/de"))).text()).split("</head>")[0] ?? "";
    expect(head).toContain('<meta name="test-locale" content="de">');
  });

  test("links translations with hreflang alternates", async () => {
    const app = await createFibelApp(config);
    const head = (await (await app.fetch(new Request("http://localhost/en/runtime"))).text()).split("</head>")[0] ?? "";
    expect(head).toContain('<link rel="alternate" hreflang="en" href="https://fibel.dev/en/runtime">');
    expect(head).toContain('<link rel="alternate" hreflang="de" href="https://fibel.dev/de/runtime">');
    expect(head).toContain('<link rel="alternate" hreflang="x-default" href="https://fibel.dev/en/runtime">');
    expect(head).toContain('<meta property="og:locale:alternate" content="de">');
  });

  test("keeps hidden pages out of search engines", async () => {
    const app = await createFibelApp(config);
    const hidden = (await (await app.fetch(new Request("http://localhost/en/hidden-example"))).text()).split("</head>")[0] ?? "";
    expect(hidden).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(hidden).not.toContain('hreflang="x-default"');

    const visible = (await (await app.fetch(new Request("http://localhost/en/runtime"))).text()).split("</head>")[0] ?? "";
    expect(visible).not.toContain('name="robots"');
  });

  test("renders social cards with a configured image", async () => {
    const app = await createFibelApp({ ...config, seo: { ogImage: "/assets/social.png", twitterSite: "@fibel" } });
    const head = (await (await app.fetch(new Request("http://localhost/en"))).text()).split("</head>")[0] ?? "";
    expect(head).toContain('<meta property="og:image" content="https://fibel.dev/assets/social.png">');
    expect(head).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(head).toContain('<meta name="twitter:site" content="@fibel">');
  });

  test("builds a sitemap with absolute urls, lastmod, and alternates", async () => {
    const app = await createFibelApp(config);
    const sitemap = await (await app.fetch(new Request("http://localhost/sitemap.xml"))).text();
    expect(sitemap).toContain("<loc>https://fibel.dev/en/runtime</loc>");
    expect(sitemap).toContain("<loc>https://fibel.dev/en</loc>");
    expect(sitemap).toContain("<lastmod>2026-06-09</lastmod>");
    expect(sitemap).toContain('<xhtml:link rel="alternate" hreflang="de" href="https://fibel.dev/de/runtime"/>');
    expect(sitemap).not.toContain("hidden-example");
  });

  test("disallows internal and configured paths in robots.txt", async () => {
    const app = await createFibelApp({ ...config, seo: { disallow: ["/en/internal"] } });
    const robots = await (await app.fetch(new Request("http://localhost/robots.txt"))).text();
    expect(robots).toContain("Disallow: /_fibel");
    expect(robots).toContain("Disallow: /en/internal");
    expect(robots).toContain("Sitemap: https://fibel.dev/sitemap.xml");
  });

  test("embeds structured data for articles and breadcrumbs", async () => {
    const app = await createFibelApp(config);
    const html = await (await app.fetch(new Request("http://localhost/en/runtime"))).text();
    const payload = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1];
    expect(payload).toBeDefined();

    const graph = JSON.parse(payload ?? "{}")["@graph"] as Array<Record<string, unknown>>;
    const article = graph.find((entry) => entry["@type"] === "TechArticle");
    expect(article?.url).toBe("https://fibel.dev/en/runtime");
    expect(article?.dateModified).toBe("2026-06-09");

    const breadcrumbs = graph.find((entry) => entry["@type"] === "BreadcrumbList");
    expect((breadcrumbs?.itemListElement as unknown[]).length).toBe(3);

    const hidden = await (await app.fetch(new Request("http://localhost/en/hidden-example"))).text();
    expect(hidden).not.toContain("application/ld+json");
  });

  test("publishes an llms.txt index per locale", async () => {
    const app = await createFibelApp(config);
    const response = await app.fetch(new Request("http://localhost/llms.txt"));
    expect(response.headers.get("content-type")).toContain("text/markdown");

    const index = await response.text();
    expect(index).toContain("# Fibel");
    expect(index).toContain("## Architecture");
    expect(index).toContain("[Plugin API](https://fibel.dev/en/plugins.md)");
    expect(index).toContain("https://fibel.dev/de/llms.txt");
    expect(index).not.toContain("/en/hidden-example.md");

    const german = await (await app.fetch(new Request("http://localhost/de/llms.txt"))).text();
    expect(german).toContain("https://fibel.dev/de/plugins.md");
  });

  test("publishes the full documentation text for language models", async () => {
    const app = await createFibelApp(config);
    const full = await (await app.fetch(new Request("http://localhost/en/llms-full.txt"))).text();
    expect(full).toContain("Source: https://fibel.dev/en/plugins.md");
    expect(full).toContain("# Plugin API");
    expect(full).not.toContain("Source: https://fibel.dev/en/hidden-example.md");
  });

  test("renders powered-by attribution as a removable default plugin", async () => {
    const app = await createFibelApp(config);
    const response = await app.fetch(new Request("http://localhost/en"));
    expect(await response.text()).toContain("Powered by <a href=\"https://fibel.dev\"");

    const plugins = defaultPlugins().filter((plugin) => plugin.name !== "powered-by");
    const withoutPoweredBy = await createFibelApp({ ...config, plugins });
    const withoutResponse = await withoutPoweredBy.fetch(new Request("http://localhost/en"));
    expect(await withoutResponse.text()).not.toContain("Powered by <a href=\"https://fibel.dev\"");
  });
});
