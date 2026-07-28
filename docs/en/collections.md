---
title: Content collections
navTitle: Collections
section: Start
order: 4
description: Group Markdown and custom pages into independently navigated areas while sharing one Fibel search, assistant, MCP server, and deployment.
tags: [collections, routing, search]
updated: 2026-07-28
---

# Content collections

Collections let one Fibel instance serve related documentation areas such as product guides and a component reference. Each area has its own Markdown directory and sidebar. Search, the assistant, MCP, theme, header, and deployment remain shared.

Use separate Fibel instances instead when the areas need independent search indexes, assistant sessions, plugins, or operational limits.

## Configure collections

Replace the top-level `content` directory with a collection list:

```ts
import { defineFibel } from "@k2b/fibel";

export default defineFibel({
  title: "Cloud",
  description: "Cloud product documentation and component reference.",
  routing: {
    basePath: "/docs",
  },
  locales: [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
  ],
  defaultLocale: "en",
  collections: [
    {
      id: "docs",
      label: "Docs",
      description: "Product guides and configuration reference.",
      content: "content/docs",
    },
    {
      id: "ui",
      label: "UI",
      description: "Components, properties, and usage examples.",
      content: "content/ui",
    },
  ],
  defaultCollection: "docs",
});
```

Each content directory keeps the normal locale structure:

```txt
content/
├── docs/
│   ├── en/
│   │   ├── index.md
│   │   └── configuration.md
│   └── de/
│       ├── index.md
│       └── configuration.md
└── ui/
    ├── en/
    │   ├── index.md
    │   └── button.md
    └── de/
        ├── index.md
        └── button.md
```

`path` defaults to `/<id>`. Set it when the public collection path should differ from the ID:

```ts
{
  id: "components",
  label: "UI",
  content: "content/ui",
  path: "/catalog/ui",
}
```

Collection IDs must be unique slug values. Paths must be unique, non-overlapping absolute paths made from slug segments. A collection path cannot start with a configured locale, the internal route segment, or the assets route segment.

## Understand collection URLs

Canonical page URLs use this order:

```txt
{basePath}/{locale}/{collectionPath}/{pageSlug}
```

The example config produces:

```txt
/docs/en/docs
/docs/en/docs/configuration
/docs/de/ui/button
```

Language-neutral collection URLs are entry points rather than canonical pages:

```txt
/docs/ui/button → /docs/de/ui/button
```

Fibel chooses the redirect locale from the saved `fibel_locale` cookie, then the `Accept-Language` request header, then `defaultLocale`. Redirects use `302` and preserve query parameters. Visiting a canonical page updates the locale cookie. `/docs/en` redirects to the configured default collection.

Unknown collection paths return `404`; Fibel does not guess a collection from an arbitrary page slug.

## Add custom and Solid pages

Set `collection` on a custom page. An omitted value uses `defaultCollection`.

```tsx
import { solidPage } from "@k2b/fibel/solid";

const panelHeaderPage = solidPage({
  html,
  collection: "ui",
  path: "/panel-header",
  title: "PanelHeader",
  description: "A consistent heading and action area.",
  context: panelHeaderMarkdown,
  component: ({ context }) => (
    <PanelHeaderShowcase documentation={context.html} />
  ),
});
```

With the earlier config, this page is available at `/docs/en/ui/panel-header`. Its `context` Markdown feeds the same search, raw Markdown, assistant, MCP, and `llms.txt` pipelines as collection Markdown files.

## Browse and search collections

The sidebar shows the active collection's navigation. When several collections are configured, links above the sidebar switch between their root pages.

Search starts in the current collection. The search dialog provides **Everything** and one scope for each collection. The internal endpoint accepts the same optional filter:

```txt
/docs/_fibel/search?locale=en&collection=ui&q=button
```

Omit `collection` to search every collection in the selected locale.

## Assistant, MCP, and discovery

The assistant receives the current collection ID, label, and description as trusted context. Its `search_docs` tool searches the current collection by default and accepts another collection ID or `all`.

An MCP server for a collection-enabled site adds `list_collections`. Its `search_docs` tool accepts an optional `collection`; omitting it searches the full Fibel instance. `read_doc` continues to read one exact canonical page URL.

Global `llms.txt` files describe the site and link all collections. Each collection also has scoped files:

```txt
/docs/en/llms.txt
/docs/en/ui/llms.txt
/docs/en/ui/llms-full.txt
```

Sitemaps, language alternates, canonical tags, and raw Markdown URLs use the canonical locale-and-collection route.

## Keep existing sites unchanged

Collections are optional. A configuration without `collections` continues to read the top-level `content` directory and keeps routes such as `/docs/en/configuration`. No collection segment, selector, MCP tool, or scoped discovery route is added.
