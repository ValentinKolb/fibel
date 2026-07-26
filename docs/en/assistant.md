---
title: Documentation assistant
navTitle: AI assistant
section: Built-in plugins
order: 28
description: Add a bounded documentation chat powered by Nessi, with in-memory Sync rate limits by default and optional shared infrastructure.
tags: [plugins, ai, nessi, rate-limit]
updated: 2026-07-26
---

# Documentation assistant

`assistantPlugin` adds an opt-in chat panel that answers from visible Fibel pages. The server uses `@k2b/nessi` for the agent loop and gives it two read-only tools: search the current language and read one matching page.

Provider credentials stay on the server. Documentation is loaded on demand instead of being copied into every prompt.

## Enable the assistant

Use `providerFromEnv()` when provider selection belongs in deployment configuration:

```ts
import { defaultPlugins, defineFibel } from "@valentinkolb/fibel";
import { assistantPlugin, providerFromEnv } from "@valentinkolb/fibel/plugins";

export default defineFibel({
  title: "Product Docs",
  plugins: [
    ...defaultPlugins(),
    assistantPlugin({
      provider: providerFromEnv(),
      systemPrompt: "Help readers configure Product. Prefer short, practical answers.",
    }),
  ],
});
```

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

`systemPrompt` is trusted operator guidance. Keep stable product rules there, not the full documentation.

For simple request context, use template variables:

```ts
assistantPlugin({
  provider: providerFromEnv(),
  systemPrompt:
    "Help {{language}} readers with {{siteTitle}}. The current page is {{currentPageTitle}} ({{currentPage}}). Today is {{weekday}}, {{date}}.",
});
```

The available variables are `{{siteTitle}}`, `{{locale}}`, `{{language}}`, `{{currentPage}}`, `{{currentPageTitle}}`, `{{date}}`, `{{time}}`, `{{weekday}}`, and `{{timezone}}`. Date and time use the server's timezone.

Use a synchronous function when composing the guidance in TypeScript is clearer:

```ts
assistantPlugin({
  provider: providerFromEnv(),
  systemPrompt: (context) =>
    `Help ${context.language} readers understand ${context.currentPageTitle}.`,
});
```

For each request, the plugin adds the current language and page, a bounded session history, and documentation retrieved by the tools. Hidden pages are excluded. Tool results are treated as untrusted reference text and cannot replace the system instructions.

## Markdown answers

Assistant answers use Fibel's existing server-side Markdown and syntax-highlighting stack, with a compact typographic scale for chat. Lists, links, tables, blockquotes, inline code, and fenced code blocks are supported. Raw model HTML, unsafe link protocols, and images are not rendered.
