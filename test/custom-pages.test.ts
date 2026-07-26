import { describe, expect, test } from "bun:test";
import type {
  GenerateRequest,
  GenerateResult,
  Provider,
  StreamEvent,
} from "@k2b/nessi/ai";
import config from "../fibel.config";
import {
  createFibelApp,
  defaultPlugins,
  renderFibelHeader,
} from "../src";
import { assistantPlugin, layoutPlugin } from "../src/plugins";

const panelContext = {
  default:
    "# Panel header\n\n## Usage\n\nThe panel-header-probe keeps a title and actions aligned.",
  de: "# Panel-Kopf\n\n## Verwendung\n\nDer panel-header-probe richtet Titel und Aktionen aus.",
};

function customPageProvider(requests: GenerateRequest[]): Provider {
  return {
    name: "custom-page-test",
    family: "openai-compatible",
    model: "test-model",
    capabilities: {
      streaming: true,
      tools: true,
      images: false,
      thinking: false,
      usage: true,
    },
    async *stream(request): AsyncIterable<StreamEvent> {
      requests.push(request);
      const readResult = request.messages.find(
        (message) => message.role === "tool_result" && message.name === "read_doc",
      );
      if (!readResult) {
        yield {
          type: "block_start",
          blockId: "read",
          index: 0,
          kind: "tool_call",
          callId: "read-call",
          name: "read_doc",
        };
        yield {
          type: "block_end",
          blockId: "read",
          index: 0,
          block: {
            type: "tool_call",
            id: "read-call",
            name: "read_doc",
            args: { href: "/en/panel-header" },
          },
        };
        yield {
          type: "usage",
          usage: { input: 4, output: 1, total: 5 },
          finishReason: "tool_use",
        };
        return;
      }

      yield { type: "block_start", blockId: "answer", index: 0, kind: "text" };
      yield { type: "block_delta", blockId: "answer", delta: "Panel context found." };
      yield {
        type: "block_end",
        blockId: "answer",
        index: 0,
        block: { type: "text", text: "Panel context found." },
      };
      yield {
        type: "usage",
        usage: { input: 5, output: 2, total: 7 },
        finishReason: "stop",
      };
    },
    async complete(): Promise<GenerateResult> {
      throw new Error("complete() is not used by this test");
    },
  };
}

describe("custom pages", () => {
  test("renders, indexes, and publishes shared or localized Markdown context", async () => {
    const app = await createFibelApp({
      ...config,
      pages: [
        {
          path: "/panel-header",
          title: "PanelHeader",
          description: "A heading and action area.",
          section: "Components",
          order: 50,
          tags: ["ui"],
          context: panelContext,
          render: ({ context }) =>
            `<section data-panel-showcase><div class="documentation">${context.html}</div><span data-markdown-size>${context.markdown.length}</span></section>`,
        },
      ],
    });

    const english = await (await app.fetch(new Request("http://localhost/en/panel-header"))).text();
    expect(english).toContain("data-panel-showcase");
    expect(english).toContain('<h2 id="usage"');
    expect(english).toContain("panel-header-probe");
    expect(english).toContain("PanelHeader");

    const germanRaw = await (
      await app.fetch(new Request("http://localhost/de/panel-header.md"))
    ).text();
    expect(germanRaw).toContain("# Panel-Kopf");
    expect(germanRaw).toContain("## Verwendung");

    const search = await (
      await app.fetch(
        new Request("http://localhost/_fibel/search?locale=en&q=probe"),
      )
    ).json();
    expect(search.results[0]).toEqual(
      expect.objectContaining({
        title: "PanelHeader",
        href: "/en/panel-header",
        section: "Components",
      }),
    );

    const llms = await (
      await app.fetch(new Request("http://localhost/en/llms-full.txt"))
    ).text();
    expect(llms).toContain("Source: https://fibel.dev/en/panel-header.md");
    expect(llms).toContain("panel-header-probe");

    const sitemap = await (
      await app.fetch(new Request("http://localhost/sitemap.xml"))
    ).text();
    expect(sitemap).toContain("<loc>https://fibel.dev/en/panel-header</loc>");

    const page = app.context.pages.find((candidate) => candidate.href === "/en/panel-header");
    expect(page).toMatchObject({
      kind: "custom",
      layout: "article",
      body: panelContext.default,
    });
  });

  test("supports full-width bodies without duplicating article chrome", async () => {
    const app = await createFibelApp({
      ...config,
      pages: [
        {
          path: "/catalog",
          title: "Catalog",
          description: "Component catalog.",
          layout: "full",
          render: () => '<div data-full-catalog class="min-h-96">Catalog body</div>',
        },
      ],
    });

    const html = await (await app.fetch(new Request("http://localhost/en/catalog"))).text();
    expect(html).toContain("data-full-catalog");
    expect(html).toContain('max-w-[100rem]');
    expect(html).not.toContain(">Component catalog.</p>");
    expect(html).not.toContain("data-copy-markdown");
  });

  test("exposes custom page context through the existing assistant read tool", async () => {
    const requests: GenerateRequest[] = [];
    const app = await createFibelApp({
      ...config,
      pages: [
        {
          path: "/panel-header",
          title: "PanelHeader",
          description: "A heading and action area.",
          context: panelContext,
          render: ({ context }) => context.html,
        },
      ],
      plugins: [
        ...defaultPlugins(),
        assistantPlugin({ provider: customPageProvider(requests) }),
      ],
    });

    const response = await app.fetch(
      new Request("http://localhost/_fibel/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost",
        },
        body: JSON.stringify({
          message: "How does PanelHeader work?",
          locale: "en",
          page: "/en/panel-header",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const events = await response.text();
    expect(events).toContain("Panel context found.");
    expect(events).toContain('"href":"/en/panel-header"');
    expect(JSON.stringify(requests)).toContain("panel-header-probe");
    expect(requests[0]?.systemPrompt).toContain("current_page=/en/panel-header");
  });

  test("rejects invalid and duplicate routes", async () => {
    await expect(
      createFibelApp({
        ...config,
        pages: [
          {
            path: "missing-slash",
            title: "Invalid",
            description: "Invalid.",
            render: () => "",
          },
        ],
      }),
    ).rejects.toThrow('Custom page path "missing-slash" must be an absolute pathname');

    await expect(
      createFibelApp({
        ...config,
        pages: [
          {
            path: "/runtime",
            title: "Duplicate",
            description: "Duplicate.",
            render: () => "",
          },
        ],
      }),
    ).rejects.toThrow('Duplicate page route "/en/runtime"');
  });
});

describe("reusable header", () => {
  test("renders cross-instance links and marks prefixes active", async () => {
    const app = await createFibelApp({
      ...config,
      title: "Cloud UI",
      routing: { ...config.routing, basePath: "/ui" },
      header: {
        title: "Cloud",
        homeHref: ({ locale }) => `/${locale}`,
        links: [
          {
            label: "Docs",
            href: ({ locale }) => `/docs/${locale}`,
            activeWhen: "/docs",
          },
          {
            label: "UI",
            href: ({ locale }) => `/ui/${locale}`,
            activeWhen: "/ui",
          },
        ],
        searchLabel: "Search Cloud UI",
        searchPlaceholder: "Search components...",
      },
    });

    const html = await (await app.fetch(new Request("http://localhost/ui/de"))).text();
    expect(html).toContain('href="/de"');
    expect(html).toContain('href="/docs/de"');
    expect(html).toContain('fibel-header-link is-active" href="/ui/de"');
    expect(html).toContain(">Search Cloud UI</span>");
    expect(html).toContain('placeholder="Search components..."');
    expect(html).toContain(">Cloud</span>");
  });

  test("omits optional controls without empty artifacts", () => {
    const html = renderFibelHeader({
      title: "Cloud",
      homeHref: "/en",
      links: [{ label: "UI", href: "/ui", active: true }],
      search: false,
      themeToggle: false,
      mobileNavigation: false,
    });

    expect(html).toContain('fibel-header-link is-active" href="/ui"');
    expect(html).not.toContain("data-search-open");
    expect(html).not.toContain("data-theme-toggle");
    expect(html).not.toContain("data-nav-toggle");
  });

  test("allows the built-in layout to remove only its header", async () => {
    const plugins = [
      ...defaultPlugins().filter((plugin) => plugin.name !== "layout"),
      layoutPlugin({ header: false }),
    ];
    const app = await createFibelApp({ ...config, plugins });
    const html = await (await app.fetch(new Request("http://localhost/en"))).text();

    expect(html).not.toContain("<header");
    expect(html).toContain("fibel-sidebar");
    expect(html).toContain("Fibel publishes Markdown and host-rendered application pages");
    expect(html).toContain("data-search-dialog");
  });
});
