import { describe, expect, test } from "bun:test";
import type { GenerateRequest, GenerateResult, Provider, StreamEvent } from "@k2b/nessi/ai";
import { ratelimit } from "@k2b/sync/browser";
import config from "../fibel.config";
import { createFibelApp, defaultPlugins } from "../src";
import {
  assistantPlugin,
  providerFromEnv,
  type AssistantSystemPromptContext,
} from "../src/plugins";
import { renderAssistantMarkdown } from "../src/plugins/markdown";

function docsProvider(requests: GenerateRequest[]): Provider {
  return {
    name: "test",
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
      const toolResults = request.messages.filter((message) => message.role === "tool_result");
      if (!toolResults.some((message) => message.name === "search_docs")) {
        yield {
          type: "block_start",
          blockId: "tool-1",
          index: 0,
          kind: "tool_call",
          callId: "call-1",
          name: "search_docs",
        };
        yield {
          type: "block_end",
          blockId: "tool-1",
          index: 0,
          block: { type: "tool_call", id: "call-1", name: "search_docs", args: { query: "theme" } },
        };
        yield { type: "usage", usage: { input: 10, output: 2, total: 12 }, finishReason: "tool_use" };
        return;
      }
      if (!toolResults.some((message) => message.name === "read_doc")) {
        yield {
          type: "block_start",
          blockId: "tool-2",
          index: 0,
          kind: "tool_call",
          callId: "call-2",
          name: "read_doc",
        };
        yield {
          type: "block_end",
          blockId: "tool-2",
          index: 0,
          block: { type: "tool_call", id: "call-2", name: "read_doc", args: { href: "/en/theme" } },
        };
        yield { type: "usage", usage: { input: 12, output: 3, total: 15 }, finishReason: "tool_use" };
        return;
      }

      yield { type: "block_start", blockId: "text-1", index: 0, kind: "text" };
      yield { type: "block_delta", blockId: "text-1", delta: "Use the **theme**" };
      yield { type: "block_delta", blockId: "text-1", delta: " configuration." };
      yield {
        type: "block_end",
        blockId: "text-1",
        index: 0,
        block: { type: "text", text: "Use the **theme** configuration." },
      };
      yield { type: "usage", usage: { input: 20, output: 5, total: 25 }, finishReason: "stop" };
    },
    async complete(): Promise<GenerateResult> {
      throw new Error("complete() is not used by these tests");
    },
  };
}

describe("assistant plugin", () => {
  test("creates native Nessi providers from explicit environment values", () => {
    const provider = providerFromEnv({
      FIBEL_AI_PROVIDER: "openai",
      FIBEL_AI_MODEL: "gpt-test",
      OPENAI_API_KEY: "secret",
    });
    expect(provider.name).toBe("openai");
    expect(provider.model).toBe("gpt-test");

    expect(() => providerFromEnv({ FIBEL_AI_MODEL: "model" })).toThrow("OPENROUTER_API_KEY");
    expect(() =>
      providerFromEnv({
        FIBEL_AI_PROVIDER: "unknown",
        FIBEL_AI_MODEL: "model",
      }),
    ).toThrow("Unsupported FIBEL_AI_PROVIDER");
  });

  test("renders the assistant through the body slot and keeps its routes internal", async () => {
    const app = await createFibelApp({
      ...config,
      plugins: [...defaultPlugins(), assistantPlugin({ provider: docsProvider([]) })],
    });

    const html = await (await app.fetch(new Request("http://localhost/en"))).text();
    expect(html).toContain("data-fibel-assistant");
    expect(html).toContain('data-endpoint="/_fibel/assistant"');
    expect(html).toMatch(/href="\/_fibel\/assistant\.css\?v=[^"]+"/);
    expect(html).toMatch(/src="\/_fibel\/assistant\.js\?v=[^"]+"/);
    expect(html).not.toContain("fibel-assistant__header");
    expect(html).toContain("data-fibel-assistant-welcome");
    expect(html).toMatch(/data-fibel-assistant-input[^>]+autofocus/);
    expect(html).toContain('data-fibel-assistant-send aria-label="Send"');
    expect(html).toContain('data-fibel-assistant-expand');
    expect(html).not.toContain("Answers from visible pages");

    const internal = await app.fetch(new Request("http://localhost/_fibel/assistant.js"));
    expect(internal.status).toBe(200);
    expect(internal.headers.get("content-type")).toContain("application/javascript");
    expect(internal.headers.get("cache-control")).toBe("no-cache");
    const internalScript = await internal.text();
    expect(internalScript).toContain("fibel-assistant-scroll-locked");
    expect(internalScript).toContain("requestAnimationFrame");
    expect(internalScript).toContain("focus({ preventScroll: true })");

    const styles = await app.fetch(new Request("http://localhost/_fibel/assistant.css"));
    expect(styles.status).toBe(200);
    expect(await styles.text()).toContain(".fibel-assistant-scroll-locked");
    expect((await app.fetch(new Request("http://localhost/assistant.js"))).status).toBe(404);

    const mounted = await createFibelApp({
      ...config,
      routing: { ...config.routing, basePath: "/docs" },
      plugins: [...defaultPlugins(), assistantPlugin({ provider: docsProvider([]) })],
    });
    const mountedHtml = await (await mounted.fetch(new Request("http://localhost/docs/en"))).text();
    expect(mountedHtml).toContain('data-endpoint="/docs/_fibel/assistant"');
    expect((await mounted.fetch(new Request("http://localhost/docs/_fibel/assistant.js"))).status).toBe(200);
  });

  test("streams a bounded tool loop with documentation sources", async () => {
    const requests: GenerateRequest[] = [];
    const usage: Array<{ provider: string; total: number }> = [];
    const app = await createFibelApp({
      ...config,
      plugins: [
        ...defaultPlugins(),
        assistantPlugin({
          provider: docsProvider(requests),
          systemPrompt:
            "Prefer configuration examples for {{siteTitle}} in {{language}} ({{locale}}) on {{currentPage}} / {{currentPageTitle}}. Today is {{weekday}}, {{date}} at {{time}} {{timezone}}.",
          onUsage(event) {
            usage.push({ provider: event.provider, total: event.usage.total });
          },
        }),
      ],
    });

    const response = await app.fetch(
      new Request("http://localhost/_fibel/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost",
        },
        body: JSON.stringify({ message: "How do themes work?", locale: "en", page: "/en/configuration" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    const events = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(events).toContainEqual({ type: "delta", text: "Use the **theme**" });
    expect(events).toContainEqual({ type: "delta", text: " configuration." });
    const renderedEvents = events.filter((event) => event.type === "rendered");
    expect(renderedEvents).toEqual([
      { type: "rendered", html: "<p>Use the <strong>theme</strong></p>\n" },
      { type: "rendered", html: "<p>Use the <strong>theme</strong> configuration.</p>\n" },
    ]);
    expect(events.indexOf(renderedEvents[0])).toBeLessThan(
      events.findIndex((event) => event.type === "delta" && event.text === " configuration."),
    );
    expect(events.find((event) => event.type === "sources")?.sources).toEqual([
      expect.objectContaining({ title: "Light and dark mode", href: "/en/theme" }),
    ]);
    expect(events.at(-1)?.type).toBe("done");
    expect(requests).toHaveLength(3);
    expect(requests[0]?.systemPrompt).toContain("Prefer configuration examples for Fibel in English (en)");
    expect(requests[0]?.systemPrompt).toContain("on /en/configuration / Configuration");
    expect(requests[0]?.systemPrompt).not.toContain("{{");
    expect(requests[0]?.systemPrompt).toMatch(/Today is \w+, \d{4}-\d{2}-\d{2} at \d{2}:\d{2} \S+\./);
    expect(requests[0]?.systemPrompt).toContain("You answer only questions that can be answered from the Fibel documentation.");
    expect(requests[0]?.systemPrompt).toContain("fenced code blocks with a language");
    expect(requests[0]?.systemPrompt).toContain("Never imitate those structures with bullet glyphs");
    expect(requests[0]?.systemPrompt).toContain('Write a React Hello World app.');
    expect(requests[0]?.tools?.map((tool) => tool.name)).toEqual(["search_docs", "read_doc"]);
    expect(JSON.stringify(requests[0]?.tools)).toContain("Do not use for unrelated requests");
    expect(JSON.stringify(requests[2]?.messages)).toContain("/en/theme");
    expect(usage).toEqual([{ provider: "test", total: 52 }]);
  });

  test("builds operator guidance from a synchronous request context", async () => {
    const requests: GenerateRequest[] = [];
    let received: AssistantSystemPromptContext | undefined;
    const app = await createFibelApp({
      ...config,
      plugins: [
        ...defaultPlugins(),
        assistantPlugin({
          provider: docsProvider(requests),
          systemPrompt(context) {
            received = context;
            return `Guide ${context.language} readers on ${context.currentPage} for ${context.siteTitle}.`;
          },
        }),
      ],
    });

    const response = await app.fetch(
      new Request("http://localhost/_fibel/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost",
        },
        body: JSON.stringify({ message: "How do themes work?", locale: "en", page: "/en/configuration" }),
      }),
    );
    await response.text();

    expect(response.status).toBe(200);
    expect(received).toEqual(
      expect.objectContaining({
        siteTitle: "Fibel",
        locale: "en",
        language: "English",
        currentPage: "/en/configuration",
        currentPageTitle: "Configuration",
      }),
    );
    expect(received?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(received?.time).toMatch(/^\d{2}:\d{2}$/);
    expect(received?.weekday).toBeTruthy();
    expect(received?.timezone).toBeTruthy();
    expect(requests[0]?.systemPrompt).toContain("Guide English readers on /en/configuration for Fibel.");
  });

  test("renders compact assistant Markdown without trusting model HTML or unsafe links", () => {
    const html = renderAssistantMarkdown(
      "# Small\n\nUse **bold** and [docs](/en), not [unsafe](javascript:alert(1)).\n\n<script>alert(1)</script>",
    );

    expect(html).toContain("<h1>Small</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('<a href="/en">docs</a>');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });

  test("renders an icon-only code toolbar and highlights shell and SQL fences", () => {
    const html = renderAssistantMarkdown(
      "```sql\nSELECT id FROM users WHERE email = $1;\n```\n\n```sh\nif [ $USER ]; then echo \"ok\"; fi\n```",
    );

    expect(html).toContain('<span class="code-language">sql</span>');
    expect(html).toContain('<span class="code-language">sh</span>');
    expect(html).toContain('class="code-copy-icon"');
    expect(html).not.toContain("code-copy-label");
    expect(html).toContain('<span class="hl-keyword">SELECT</span>');
    expect(html).toContain('<span class="hl-parameter">$1</span>');
    expect(html).toContain('<span class="hl-variable">$USER</span>');
  });

  test("enforces injected Sync rate limiters before calling the provider", async () => {
    const requests: GenerateRequest[] = [];
    const app = await createFibelApp({
      ...config,
      plugins: [
        ...defaultPlugins(),
        assistantPlugin({
          provider: docsProvider(requests),
          rateLimiters: {
            session: ratelimit({ id: "test-session-limit", limit: 1, windowSecs: 60 }),
            global: ratelimit({ id: "test-global-limit", limit: 10, windowSecs: 60 }),
          },
        }),
      ],
    });

    const first = await app.fetch(
      new Request("http://localhost/_fibel/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost" },
        body: JSON.stringify({ message: "Theme?", locale: "en", page: "/en" }),
      }),
    );
    const cookie = first.headers.get("set-cookie")?.split(";")[0] ?? "";
    await first.text();

    const second = await app.fetch(
      new Request("http://localhost/_fibel/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost", Cookie: cookie },
        body: JSON.stringify({ message: "Theme again?", locale: "en", page: "/en" }),
      }),
    );

    expect(second.status).toBe(429);
    expect(second.headers.get("retry-after")).toBeTruthy();
    expect(requests).toHaveLength(3);
  });

  test("rejects cross-origin and oversized messages without a provider call", async () => {
    const requests: GenerateRequest[] = [];
    const app = await createFibelApp({
      ...config,
      plugins: [
        ...defaultPlugins(),
        assistantPlugin({
          provider: docsProvider(requests),
          limits: { maxInputChars: 10 },
        }),
      ],
    });

    const crossOrigin = await app.fetch(
      new Request("http://localhost/_fibel/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://example.com" },
        body: JSON.stringify({ message: "Hello", locale: "en", page: "/en" }),
      }),
    );
    expect(crossOrigin.status).toBe(403);

    const oversized = await app.fetch(
      new Request("http://localhost/_fibel/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost" },
        body: JSON.stringify({ message: "This message is too long", locale: "en", page: "/en" }),
      }),
    );
    expect(oversized.status).toBe(413);
    expect(requests).toHaveLength(0);
  });

  test("allows one active response per session and caps global concurrency", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const provider: Provider = {
      ...docsProvider([]),
      async *stream() {
        await gate;
        yield { type: "block_start", blockId: "text", index: 0, kind: "text" };
        yield { type: "block_delta", blockId: "text", delta: "Done" };
        yield { type: "block_end", blockId: "text", index: 0, block: { type: "text", text: "Done" } };
        yield { type: "usage", usage: { input: 1, output: 1, total: 2 }, finishReason: "stop" };
      },
    };
    const app = await createFibelApp({
      ...config,
      plugins: [
        ...defaultPlugins(),
        assistantPlugin({
          provider,
          limits: { maxConcurrent: 1 },
        }),
      ],
    });
    const request = (cookie?: string) =>
      new Request("http://localhost/_fibel/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify({ message: "Wait", locale: "en", page: "/en" }),
      });

    const first = await app.fetch(request());
    const cookie = first.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toBeTruthy();
    expect((await app.fetch(request(cookie))).status).toBe(409);
    expect((await app.fetch(request())).status).toBe(503);

    release?.();
    expect(await first.text()).toContain('"text":"Done"');
  });
});
