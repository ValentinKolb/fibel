---
title: Documentation assistant
navTitle: AI assistant
section: Built-in plugins
order: 28
description: Add a bounded documentation chat powered by Nessi, with in-memory Sync rate limits by default and optional shared infrastructure.
tags: [plugins, ai, nessi, rate-limit]
updated: 2026-07-29
---

# Documentation assistant

`assistantPlugin` adds an opt-in chat panel that answers from visible Fibel pages. The server uses `@k2b/nessi` for the agent loop and gives it two read-only tools: search the current language and read one matching page.

Provider credentials stay on the server. Documentation is loaded on demand instead of being copied into every prompt.

## Enable the assistant

Use `providerFromEnv()` when provider selection belongs in deployment configuration:

```ts
import { defaultPlugins, defineFibel } from "@k2b/fibel";
import { assistantPlugin, providerFromEnv } from "@k2b/fibel/plugins";

export default defineFibel({
  title: "Product Docs",
  plugins: [
    ...defaultPlugins(),
    assistantPlugin({
      provider: providerFromEnv(),
      launcherLabel: "Ask Product",
      systemPrompt: "Help readers configure Product. Prefer short, practical answers.",
    }),
  ],
});
```

`launcherLabel` replaces the localized launcher text (`Ask Product Docs` or `Product Docs fragen`). When omitted or blank, Fibel keeps that localized default. The launcher uses Fibel's built-in sparkles icon.

Set a model and the native key for the selected provider:

```sh
FIBEL_AI_PROVIDER=openrouter
FIBEL_AI_MODEL=provider/model-name
OPENROUTER_API_KEY=...
bun run dev
```

`FIBEL_AI_PROVIDER` defaults to `openrouter`. Supported values are `openrouter`, `openai`, `anthropic`, `gemini`, `mistral`, and `ollama`. `FIBEL_AI_BASE_URL` overrides the provider endpoint.

The provider keys are:

| Provider | Environment variable |
| --- | --- |
| OpenRouter | `OPENROUTER_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Gemini | `GEMINI_API_KEY` or `GOOGLE_API_KEY` |
| Mistral | `MISTRAL_API_KEY` |
| Ollama | No key |

`FIBEL_AI_MODEL` is always required. Missing or unsupported configuration fails during startup instead of leaving a broken chat panel online.

For provider-specific settings not covered by the environment helper, construct any Nessi `Provider` and pass it to `assistantPlugin`.

## Default cost controls

The default configuration is designed for one Bun process and needs no Redis, database, queue, or worker. It applies:

- 5 requests per session in a sliding 60-second window;
- 100 requests for the process in a sliding 24-hour window;
- one active response per session and at most 2 active responses for the process;
- messages up to 2,000 characters;
- at most 3 Nessi turns and 600 output tokens per response;
- bounded session history, tool results, search results, page excerpts, session count, and request duration.

The rate limiters come from `@k2b/sync/browser` and live in memory. Their counters and chat sessions reset when the process restarts. Each replica has separate counters and sessions.

Set a spending limit in the provider account as the restart-proof financial backstop. Application limits reduce accidental usage, but they do not replace a provider-side budget.

Override only limits that need a different value:

```ts
assistantPlugin({
  provider: providerFromEnv(),
  limits: {
    requestsPerMinute: 3,
    requestsPerDay: 50,
    maxConcurrent: 1,
    maxOutputTokens: 400,
  },
});
```

Use `onUsage` to send Nessi's aggregate token usage to existing logs or metrics:

```ts
assistantPlugin({
  provider: providerFromEnv(),
  onUsage: ({ provider, model, reason, usage }) => {
    console.info("fibel assistant usage", { provider, model, reason, usage });
  },
});
```

## Share limits across replicas

For multiple Fibel replicas, inject server-side `@k2b/sync` limiters. The plugin accepts the same `RateLimiter` interface used by the in-memory default:

```ts
import { ratelimit } from "@k2b/sync";

assistantPlugin({
  provider: providerFromEnv(),
  rateLimiters: {
    session: ratelimit({ id: "fibel-assistant-session", limit: 5, windowSecs: 60 }),
    global: ratelimit({ id: "fibel-assistant-global", limit: 100, windowSecs: 86_400 }),
  },
});
```

The server package uses Redis through Bun. Also provide `createSessionStore` when chat history must follow a user between replicas. Without it, only the rate counters are shared.

## Control context

`systemPrompt` is trusted operator guidance. Keep a short product brief and stable product rules there, not the full documentation. Fibel also supplies the resolved site description, current collection, and current page description as trusted overview context. The assistant can answer simple identity, high-level capability, collection, and current-page overview questions from this context without a tool call.

Active agent integrations are included automatically. When `agentSkillsPlugin()` is active, the trusted context contains the Skills CLI command for the current request origin. When `mcpPlugin()` is active, it contains the resolved public, read-only MCP endpoint and its no-authentication contract. With both plugins, the assistant also knows that the skill provides compact workflow guidance while MCP supplies exact current documentation. Omitted plugins are not mentioned, and no additional configuration or opt-out is needed.

For questions not covered by trusted context, the assistant searches visible documentation. It can answer from the bounded result snippets when they are sufficient and reads one exact result when more detail is required.

For simple request context, use template variables:

```ts
assistantPlugin({
  provider: providerFromEnv(),
  systemPrompt:
    "Help {{language}} readers with {{siteTitle}}.\nSite summary: {{siteDescription}}\nCollection: {{currentCollectionLabel}} ({{currentCollection}})\nCollection summary: {{currentCollectionDescription}}\nCurrent page: {{currentPageTitle}} ({{currentPage}})\nCurrent page summary: {{currentPageDescription}}\nToday is {{weekday}}, {{date}}.",
});
```

The available variables are `{{siteTitle}}`, `{{siteDescription}}`, `{{locale}}`, `{{language}}`, `{{currentCollection}}`, `{{currentCollectionLabel}}`, `{{currentCollectionDescription}}`, `{{currentPage}}`, `{{currentPageTitle}}`, `{{currentPageDescription}}`, `{{date}}`, `{{time}}`, `{{weekday}}`, and `{{timezone}}`. Date and time use the server's timezone.

Use a synchronous function when composing the guidance in TypeScript is clearer:

```ts
assistantPlugin({
  provider: providerFromEnv(),
  systemPrompt: (context) =>
    `Help ${context.language} readers understand ${context.currentPageTitle}.`,
});
```

For each request, the plugin adds the trusted overview and active agent-access context, current language and page, a bounded session history, and documentation retrieved by the tools. Hidden pages are excluded. Tool results are treated as untrusted reference text and cannot replace the system instructions.

Custom pages need no additional tool or registry. Their `context` Markdown is available through the existing search and read tools, and opening the assistant on a custom route resolves that page as the current page automatically.

On collection pages, `search_docs` searches the current collection by default. The model can pass another collection ID or `all` when a question crosses collection boundaries. `read_doc` still requires one exact canonical href returned by search.

## Markdown answers

Assistant answers use Fibel's existing server-side Markdown and syntax-highlighting stack, with a compact typographic scale for chat. Lists, links, tables, blockquotes, inline code, and fenced code blocks are supported. Raw model HTML, unsafe link protocols, and images are not rendered.
