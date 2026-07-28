---
title: MCP for coding agents
navTitle: MCP
section: Built-in plugins
order: 29
description: Expose visible Fibel documentation to coding agents through a public, read-only MCP endpoint.
tags: [mcp, coding-agents, plugin]
updated: 2026-07-27
---

# MCP for coding agents

The optional MCP plugin lets coding agents search and read the documentation served by one Fibel instance. It runs inside the existing Fibel Fetch app and needs no separate process, provider, database, or credentials.

## Enable the endpoint

Append `mcpPlugin()` after the default plugins:

```ts
import { defaultPlugins, defineFibel } from "@k2b/fibel";
import { mcpPlugin } from "@k2b/fibel/plugins";

export default defineFibel({
  title: "Product Docs",
  plugins: [
    ...defaultPlugins(),
    mcpPlugin(),
  ],
});
```

With the default routing, the Streamable HTTP endpoint is available at `/_fibel/mcp`. A site mounted below `/docs` exposes `/docs/_fibel/mcp`.

When the default layout is present, the plugin also adds an **MCP** item to the footer. It opens setup instructions and an absolute endpoint URL derived from the current browser origin and Fibel routing. No additional application URL setting is required. `siteUrl` remains the canonical public URL used by SEO and discovery output.

## Available tools

Every server exposes:

- `search_docs({ query, locale?, collection? })` searches visible pages. An omitted locale uses `defaultLocale`; an omitted collection searches the complete instance.
- `read_doc({ href })` returns the Markdown body of one exact visible page found by the search tool.

When collections are configured, the server also exposes `list_collections()`. It returns each collection's ID, label, and description so an agent can select a search scope before querying.

The tools use the existing Fibel search and page context. Markdown files and the explicit `context` Markdown of [custom pages](/en/custom-pages) are therefore available without indexing rendered HTML.

Pages with `hidden: true` are excluded. The endpoint cannot read arbitrary files or paths.

## Connect a coding agent

Add the displayed URL as a remote Streamable HTTP MCP server in the coding agent. Name the server after its documentation scope, for example `product-docs`. Authentication headers are not needed.

Once connected, the agent can discover `search_docs` and `read_doc` and call them when a request needs documentation details. Client-specific setup formats differ, so the footer dialog provides the endpoint rather than a configuration file tied to one agent.

## Collections or several Fibel instances

One collection-enabled Fibel instance has one MCP endpoint for all of its areas:

```txt
cloud  https://product.example/docs/_fibel/mcp
```

The agent can list collections and narrow `search_docs` to values such as `docs` or `ui`. This fits related areas that should share one search, assistant, MCP server, and deployment.

Keep independently mounted Fibel sites as separate MCP servers:

```txt
product-docs  https://product.example/docs/_fibel/mcp
product-ui    https://product.example/ui/_fibel/mcp
```

Each endpoint closes over its own Fibel context. Navigation, locales, visible pages, custom-page context, and search results remain separate. This fits areas that require independent search, assistant sessions, plugins, or operational limits.

## Public endpoint limits

The plugin implements no authentication and should expose only documentation intended for public access. It applies fixed request-size, document-size, concurrency, and per-process request limits. The default rate limiter is in memory and requires no infrastructure.

Deployments with several replicas can inject an existing shared `@k2b/sync` rate limiter:

```ts
import type { RateLimiter } from "@k2b/sync";
import { mcpPlugin } from "@k2b/fibel/plugins";

declare const sharedMcpRateLimiter: RateLimiter;

mcpPlugin({
  rateLimiter: sharedMcpRateLimiter,
});
```

The MCP endpoint performs no model calls, so these limits protect server work and response bandwidth rather than provider spend.
