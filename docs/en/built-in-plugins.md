---
title: Built-in plugins
navTitle: Overview
section: Built-in plugins
order: 25
description: Fibel ships with default plugins for Markdown, themes, i18n, SEO, assets, search, attribution, and layout, plus optional assistant, MCP, and Agent Skills integrations.
tags: [plugins, built-in]
updated: 2026-07-29
---

# Built-in plugins

Fibel assembles its default behavior from normal plugins. Projects can use that set as-is, append their own plugins, or replace individual responsibilities.

## Default set

```ts
import { defaultPlugins } from "@k2b/fibel";

const plugins = defaultPlugins();
```

The default set includes:

- `markdownPlugin`: renders Markdown to HTML, processes code blocks, and creates heading anchors.
- `themePlugin`: reads the theme cookie and provides the selected theme to the layout. See [Theme](/en/docs/theme).
- `i18nPlugin`: checks whether translated pages exist in the configured locales.
- `seoPlugin`: serves SEO files such as favicon, sitemap, and robots output, and adds language alternates and social card metadata to every page.
- `llmsPlugin`: serves `llms.txt` and `llms-full.txt` so language models can discover and read the documentation. See [SEO](/en/docs/seo).
- `assetsPlugin`: serves files from the configured assets folder.
- `searchPlugin`: builds the search index and exposes the search endpoint. See [Search](/en/docs/search).
- `poweredByPlugin`: adds the `Powered by fibel.dev` attribution to the footer.
- `layoutPlugin`: renders navigation, page layout, page actions, footer, search dialog, and client script. `layoutPlugin({ header: false })` removes only the built-in header.

## Optional plugins

Fibel ships plugins that are not part of the default set because they need configuration.

`assistantPlugin` adds a bounded documentation chat powered by `@k2b/nessi`. It uses in-memory rate limits by default and keeps provider credentials on the server. See [Documentation assistant](/en/docs/assistant).

`mcpPlugin` exposes visible documentation to coding agents through a public,
read-only Streamable HTTP endpoint. By itself it adds an **MCP** setup item to
the footer. See [MCP for coding agents](/en/docs/mcp).

`agentSkillsPlugin` publishes self-contained Agent Skills from a configured
directory at the origin-level well-known endpoint and adds an **Agents** setup
item for the Vercel Skills CLI. When MCP is active, one **Agents** dialog
contains both setup methods. See
[Agent Skills discovery](/en/docs/agent-skills).

`blogPlugin({ collection: "blog" })` turns one Markdown collection into a
date-sorted editorial feed with year navigation. Posts remain normal Fibel
pages and therefore stay available to search, Assistant, MCP, raw Markdown,
and `llms.txt`. See [Blog collections](/en/docs/blog).

`imprintPlugin` adds a footer link to legal information hosted somewhere else. Use it when the imprint belongs to the company or person behind several sites and should not be maintained as a documentation page.

```ts
import { defineFibel, defaultPlugins } from "@k2b/fibel";
import { imprintPlugin } from "@k2b/fibel/plugins";

export default defineFibel({
  title: "Product Docs",
  plugins: [...defaultPlugins(), imprintPlugin({ url: "https://example.com/imprint", label: "Imprint" })],
});
```

The URL is used as written, so it can point at any external page. `label` defaults to `Imprint`.

## Extend the defaults

Append project plugins to the default set when the built-in behavior should remain active.

```ts
import { defineFibel, defaultPlugins } from "@k2b/fibel";
import { projectLinksPlugin } from "./plugins/project-links";

export default defineFibel({
  title: "Product Docs",
  plugins: [...defaultPlugins(), projectLinksPlugin()],
});
```

This is the right starting point for most projects. The [Plugin API](/en/docs/plugins) describes the available hooks.

## Replace the defaults

Replace the plugin list when a project owns rendering, layout, search, or routes itself.

```ts
import { defineFibel } from "@k2b/fibel";
import { searchPlugin, themePlugin } from "@k2b/fibel/plugins";

export default defineFibel({
  title: "Product Docs",
  plugins: [
    customMarkdownPlugin(),
    themePlugin(),
    searchPlugin(),
    customLayoutPlugin(),
  ],
});
```

Fibel does not add omitted plugins automatically. A custom list should include every capability the website needs.

To remove the default footer attribution, use a plugin list without `poweredByPlugin`.

## Routes and ownership

Several built-in plugins own routes. The search plugin owns the search endpoint. The layout plugin serves the client script. The SEO plugin serves SEO files. The assets plugin serves public files.

Custom plugins should choose route paths explicitly. This prevents collisions and keeps documentation predictable under a base path.
