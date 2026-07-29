import { describe, expect, test } from "bun:test";
import { ratelimit } from "@k2b/sync/browser";
import config from "../fibel.config";
import { createFibelApp, defaultPlugins, type FibelConfig } from "../src";
import {
  agentSkillsPlugin,
  mcpPlugin,
} from "../src/plugins";

let limiterId = 0;

function mcpConfig(overrides: Partial<FibelConfig> = {}): FibelConfig {
  return {
    ...config,
    ...overrides,
    plugins: [
      ...defaultPlugins(),
      testMcpPlugin(),
    ],
  };
}

function testMcpPlugin() {
  limiterId += 1;
  return mcpPlugin({
    rateLimiter: ratelimit({
      id: `fibel-mcp-test-${limiterId}`,
      limit: 1_000,
      windowSecs: 60,
    }),
  });
}

async function mcpRequest(
  app: Awaited<ReturnType<typeof createFibelApp>>,
  endpoint: string,
  method: string,
  params?: Record<string, unknown>,
) {
  const response = await app.fetch(
    new Request(`http://localhost${endpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
        "MCP-Protocol-Version": "2025-11-25",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        ...(params ? { params } : {}),
      }),
    }),
  );
  return {
    response,
    body: (await response.json()) as {
      result?: {
        tools?: { name: string }[];
        content?: { type: string; text: string }[];
        isError?: boolean;
      };
      error?: { code: number; message: string };
    },
  };
}

describe("MCP plugin", () => {
  test("renders setup UI only when the plugin is active", async () => {
    const enabled = await createFibelApp(mcpConfig());
    const enabledHtml = await (await enabled.fetch(new Request("http://localhost/en"))).text();
    expect(enabledHtml).toContain("data-fibel-agent-setup-open");
    expect(enabledHtml).toContain("data-fibel-mcp-open");
    expect(enabledHtml).toContain("data-fibel-agent-setup-dialog");
    expect(enabledHtml).toContain('data-fibel-mcp-dialog data-endpoint="/_fibel/mcp"');
    expect(enabledHtml).toContain('src="/_fibel/mcp.js?');
    expect(enabledHtml).toContain('role="tablist"');
    expect(enabledHtml).toContain('data-fibel-agent-setup-tab="general"');
    expect(enabledHtml).toContain('data-fibel-agent-setup-tab="codex"');
    expect(enabledHtml).toContain('data-fibel-agent-setup-tab="claude"');
    expect(enabledHtml).toContain('data-fibel-agent-setup-tab="opencode"');
    expect(enabledHtml).not.toContain('data-fibel-agent-setup-tab="skills"');
    expect(enabledHtml).toContain("codex mcp add fibel --url {endpoint}");
    expect(enabledHtml).toContain("claude mcp add --transport http fibel {endpoint}");
    expect(enabledHtml).toContain("opencode mcp add fibel --url {endpoint}");
    expect(enabledHtml).toContain(">MCP</button>");
    expect(enabledHtml).not.toContain(">Agents</button>");

    const disabled = await createFibelApp({ ...config, plugins: defaultPlugins() });
    const disabledHtml = await (await disabled.fetch(new Request("http://localhost/en"))).text();
    expect(disabledHtml).not.toContain("data-fibel-agent-setup-open");
    expect(disabledHtml).not.toContain("data-fibel-mcp-open");
    expect(disabledHtml).not.toContain("data-fibel-agent-setup-dialog");
  });

  test("renders a standalone Skills setup without empty MCP controls", async () => {
    const app = await createFibelApp({
      ...config,
      plugins: [
        ...defaultPlugins(),
        agentSkillsPlugin({ directory: "skills" }),
      ],
    });
    const html = await (
      await app.fetch(new Request("http://localhost/en"))
    ).text();

    expect(html).toContain(">Agents</button>");
    expect(html).toContain("data-fibel-agent-setup-open");
    expect(html).not.toContain("data-fibel-mcp-open");
    expect(html).toContain(
      'data-fibel-agent-setup-panel="skills"',
    );
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toContain(
      'data-fibel-agent-setup-panel="general"',
    );
    expect(html).toContain(
      'data-command="bunx skills add {origin}"',
    );
    expect(html).toContain("https://github.com/vercel-labs/skills");
    expect(html).toContain('src="/_fibel/agents.js?');
    expect(occurrences(html, "data-fibel-agent-setup-dialog")).toBe(1);

    const script = await app.fetch(
      new Request("http://localhost/_fibel/agents.js"),
    );
    expect(script.status).toBe(200);
    expect(await script.text()).toContain(
      '.replace("{origin}", window.location.origin)',
    );
    expect(
      (
        await app.fetch(
          new Request(
            "http://localhost/.well-known/agent-skills/index.json",
          ),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await app.fetch(
          new Request("http://localhost/_fibel/mcp"),
        )
      ).status,
    ).toBe(404);

    const german = await (
      await app.fetch(new Request("http://localhost/de"))
    ).text();
    expect(german).toContain("Open-Source-Skills-CLI von Vercel");
    expect(german).toContain(
      "Ein zusätzlich aktivierter MCP-Server kann exakte aktuelle Dokumentation bereitstellen.",
    );
  });

  test("combines Skills and MCP setup independently of plugin order", async () => {
    const orderings = [
      [
        testMcpPlugin(),
        agentSkillsPlugin({ directory: "skills" }),
      ],
      [
        agentSkillsPlugin({ directory: "skills" }),
        testMcpPlugin(),
      ],
    ];

    for (const optionalPlugins of orderings) {
      const app = await createFibelApp({
        ...config,
        plugins: [...defaultPlugins(), ...optionalPlugins],
      });
      const html = await (
        await app.fetch(new Request("http://localhost/en"))
      ).text();

      expect(html).toContain(">Agents</button>");
      expect(html).not.toContain(">MCP</button>");
      expect(html).toContain(
        'data-fibel-agent-setup-tab="skills"',
      );
      expect(html).toContain(
        'data-fibel-agent-setup-tab="general"',
      );
      expect(html).toContain(
        'data-fibel-agent-setup-tab="codex"',
      );
      expect(html).toContain(
        'data-fibel-agent-setup-tab="claude"',
      );
      expect(html).toContain(
        'data-fibel-agent-setup-tab="opencode"',
      );
      expect(html).toContain(">Other</button>");
      expect(
        html.indexOf('data-fibel-agent-setup-tab="skills"'),
      ).toBeLessThan(
        html.indexOf('data-fibel-agent-setup-tab="codex"'),
      );
      expect(
        html.indexOf('data-fibel-agent-setup-tab="codex"'),
      ).toBeLessThan(
        html.indexOf('data-fibel-agent-setup-tab="claude"'),
      );
      expect(
        html.indexOf('data-fibel-agent-setup-tab="claude"'),
      ).toBeLessThan(
        html.indexOf('data-fibel-agent-setup-tab="opencode"'),
      );
      expect(
        html.indexOf('data-fibel-agent-setup-tab="opencode"'),
      ).toBeLessThan(
        html.indexOf('data-fibel-agent-setup-tab="general"'),
      );
      expect(html).toContain(
        'data-command="bunx skills add {origin}"',
      );
      expect(html).toContain(
        "For exact, current details, also connect the MCP server through one of the agent tabs.",
      );
      expect(html).toContain(
        "https://github.com/vercel-labs/skills",
      );
      expect(html).toContain('src="/_fibel/mcp.js?');
      expect(html).not.toContain('src="/_fibel/agents.js?');
      expect(occurrences(html, "data-fibel-agent-setup-open")).toBe(
        1,
      );
      expect(
        occurrences(html, "data-fibel-agent-setup-dialog"),
      ).toBe(1);

      expect(
        (
          await app.fetch(
            new Request(
              "http://localhost/.well-known/agent-skills/index.json",
            ),
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await app.fetch(
            new Request("http://localhost/_fibel/mcp.js"),
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await app.fetch(
            new Request("http://localhost/_fibel/agents.js"),
          )
        ).status,
      ).toBe(404);

      const german = await (
        await app.fetch(new Request("http://localhost/de"))
      ).text();
      expect(german).toContain(">Andere</button>");
    }
  });

  test("uses a distinct setup name for a mounted instance", async () => {
    const app = await createFibelApp(mcpConfig({ routing: { ...config.routing, basePath: "/docs" } }));
    const html = await (await app.fetch(new Request("http://localhost/docs/en"))).text();
    expect(html).toContain("codex mcp add fibel-docs --url {endpoint}");
    expect(html).toContain("claude mcp add --transport http fibel-docs {endpoint}");
    expect(html).toContain("opencode mcp add fibel-docs --url {endpoint}");
  });

  test("exposes two read-only documentation tools", async () => {
    const app = await createFibelApp(mcpConfig());
    const initialize = await mcpRequest(app, "/_fibel/mcp", "initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "fibel-test", version: "1.0.0" },
    });
    expect(initialize.response.status).toBe(200);
    expect(initialize.body.result).toBeDefined();

    const listed = await mcpRequest(app, "/_fibel/mcp", "tools/list");
    expect(listed.response.status).toBe(200);
    expect(listed.body.result?.tools?.map((tool) => tool.name)).toEqual(["search_docs", "read_doc"]);
  });

  test("searches by locale and reads visible Markdown", async () => {
    const app = await createFibelApp(mcpConfig());
    const english = await mcpRequest(app, "/_fibel/mcp", "tools/call", {
      name: "search_docs",
      arguments: { query: "theme", locale: "en" },
    });
    expect(english.body.result?.content?.[0]?.text).toContain("/en/theme");
    expect(english.body.result?.content?.[0]?.text).not.toContain("/de/theme");

    const german = await mcpRequest(app, "/_fibel/mcp", "tools/call", {
      name: "search_docs",
      arguments: { query: "theme", locale: "de" },
    });
    expect(german.body.result?.content?.[0]?.text).toContain("/de/theme");

    const page = await mcpRequest(app, "/_fibel/mcp", "tools/call", {
      name: "read_doc",
      arguments: { href: "/en/theme" },
    });
    expect(page.body.result?.isError).not.toBe(true);
    expect(page.body.result?.content?.[0]?.text).toContain("# Light and dark mode");
  });

  test("searches the explicit Markdown context of custom pages", async () => {
    const app = await createFibelApp(
      mcpConfig({
        pages: [
          {
            path: "/status-card",
            title: "StatusCard",
            description: "Displays the current service state.",
            context: "# StatusCard\n\nUse the `tone` property to select the service state.",
            render: ({ context }) => `<section>${context.html}</section>`,
          },
        ],
      }),
    );

    const search = await mcpRequest(app, "/_fibel/mcp", "tools/call", {
      name: "search_docs",
      arguments: { query: "tone property", locale: "en" },
    });
    expect(search.body.result?.content?.[0]?.text).toContain("/en/status-card");

    const page = await mcpRequest(app, "/_fibel/mcp", "tools/call", {
      name: "read_doc",
      arguments: { href: "/en/status-card" },
    });
    expect(page.body.result?.content?.[0]?.text).toContain("Use the `tone` property");
  });

  test("describes and searches configured collections", async () => {
    const app = await createFibelApp(
      mcpConfig({
        content: undefined,
        collections: [
          {
            id: "docs",
            label: "Docs",
            description: "Fibel guides.",
            content: "docs",
          },
          {
            id: "ui",
            label: "UI",
            description: "Fibel component reference.",
            content: "docs",
          },
        ],
        defaultCollection: "docs",
      }),
    );

    const listed = await mcpRequest(app, "/_fibel/mcp", "tools/list");
    expect(listed.body.result?.tools?.map((tool) => tool.name)).toEqual([
      "list_collections",
      "search_docs",
      "read_doc",
    ]);

    const collections = await mcpRequest(
      app,
      "/_fibel/mcp",
      "tools/call",
      {
        name: "list_collections",
        arguments: {},
      },
    );
    expect(collections.body.result?.content?.[0]?.text).toContain(
      "UI (ui): Fibel component reference.",
    );

    const search = await mcpRequest(app, "/_fibel/mcp", "tools/call", {
      name: "search_docs",
      arguments: { query: "theme", locale: "en", collection: "ui" },
    });
    expect(search.body.result?.content?.[0]?.text).toContain("/en/ui/theme");
    expect(search.body.result?.content?.[0]?.text).not.toContain(
      "/en/docs/theme",
    );
    expect(search.body.result?.content?.[0]?.text).toContain(
      "Collection: UI (ui)",
    );

    const invalid = await mcpRequest(app, "/_fibel/mcp", "tools/call", {
      name: "search_docs",
      arguments: { query: "theme", collection: "missing" },
    });
    expect(invalid.body.result?.isError).toBe(true);
  });

  test("does not expose hidden pages or arbitrary paths", async () => {
    const app = await createFibelApp(mcpConfig());
    const hidden = await mcpRequest(app, "/_fibel/mcp", "tools/call", {
      name: "read_doc",
      arguments: { href: "/en/hidden-example" },
    });
    expect(hidden.body.result?.isError).toBe(true);
    expect(hidden.body.result?.content?.[0]?.text).toContain("Visible documentation page not found");

    const file = await mcpRequest(app, "/_fibel/mcp", "tools/call", {
      name: "read_doc",
      arguments: { href: "/etc/passwd" },
    });
    expect(file.body.result?.isError).toBe(true);
  });

  test("keeps mounted Fibel instances independent", async () => {
    const docs = await createFibelApp(mcpConfig({ routing: { ...config.routing, basePath: "/docs" } }));
    const ui = await createFibelApp(mcpConfig({ routing: { ...config.routing, basePath: "/ui" } }));

    const docsSearch = await mcpRequest(docs, "/docs/_fibel/mcp", "tools/call", {
      name: "search_docs",
      arguments: { query: "theme" },
    });
    expect(docsSearch.body.result?.content?.[0]?.text).toContain("/docs/en/theme");

    const uiSearch = await mcpRequest(ui, "/ui/_fibel/mcp", "tools/call", {
      name: "search_docs",
      arguments: { query: "theme" },
    });
    expect(uiSearch.body.result?.content?.[0]?.text).toContain("/ui/en/theme");

    expect((await docs.fetch(new Request("http://localhost/ui/_fibel/mcp"))).status).toBe(404);
    expect((await ui.fetch(new Request("http://localhost/docs/_fibel/mcp"))).status).toBe(404);
  });

  test("rejects cross-origin, oversized, and streaming requests", async () => {
    const app = await createFibelApp(mcpConfig());
    const crossOrigin = await app.fetch(
      new Request("http://localhost/_fibel/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://example.com",
        },
        body: "{}",
      }),
    );
    expect(crossOrigin.status).toBe(403);

    const oversized = await app.fetch(
      new Request("http://localhost/_fibel/mcp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: "x".repeat(70_000) }),
      }),
    );
    expect(oversized.status).toBe(413);

    const get = await app.fetch(
      new Request("http://localhost/_fibel/mcp", {
        headers: { Accept: "text/event-stream" },
      }),
    );
    expect(get.status).toBe(405);
    expect(get.headers.get("allow")).toBe("POST");
  });

  test("applies an injected anonymous rate limiter", async () => {
    const app = await createFibelApp({
      ...config,
      plugins: [
        ...defaultPlugins(),
        mcpPlugin({
          rateLimiter: ratelimit({
            id: `fibel-mcp-limited-test-${Date.now()}`,
            limit: 1,
            windowSecs: 60,
          }),
        }),
      ],
    });

    const first = await mcpRequest(app, "/_fibel/mcp", "tools/list");
    expect(first.response.status).toBe(200);

    const second = await mcpRequest(app, "/_fibel/mcp", "tools/list");
    expect(second.response.status).toBe(429);
    expect(second.response.headers.get("retry-after")).toBeTruthy();
    expect(second.body.error?.message).toContain("request limit");
  });
});

function occurrences(value: string, needle: string) {
  return value.split(needle).length - 1;
}
