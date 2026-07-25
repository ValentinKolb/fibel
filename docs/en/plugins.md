---
title: Plugin API
navTitle: Plugin API
section: Architecture
order: 20
description: Extend Fibel with services, lifecycle hooks, routes, validation, and project-specific integrations.
tags: [plugins, api, extension]
updated: 2026-06-09
---

# Plugin API

Plugins extend Fibel at defined points: before content is loaded, after pages are rendered, and when additional routes are registered. This lets projects add rules, endpoints, and alternative implementations without changing the core.

## Plugin shape

```ts
import type { FibelPlugin } from "@valentinkolb/fibel";

export function projectPlugin(): FibelPlugin {
  return {
    name: "project-plugin",
    setup(context) {},
    afterContent(context) {},
    routes(context) {
      return [];
    },
  };
}
```

`setup` runs before Markdown files are loaded. Use it to replace or wrap services.

`afterContent` runs after pages have been loaded and rendered. Use it for validation, indexes, or derived metadata.

`routes` adds Fetch routes. Use it for generated files, internal endpoints, or project-specific APIs.

## Wrap a service

This example adds a notice before every Markdown document and then calls the existing Markdown renderer.

```ts
import type { FibelPlugin } from "@valentinkolb/fibel";

export function markdownNoticePlugin(): FibelPlugin {
  return {
    name: "markdown-notice",
    setup(context) {
      const renderMarkdown = context.services.renderMarkdown;

      context.services.renderMarkdown = (markdown, page, ctx) => {
        const notice = `> This page belongs to ${ctx.config.title}.\n\n`;
        return renderMarkdown(`${notice}${markdown}`, page, ctx);
      };
    },
  };
}
```

Use this pattern for shared notices, project banners, or small content adjustments before rendering.

## Validate content

Validation plugins fail startup when content does not match project rules.

```ts
import type { FibelPlugin } from "@valentinkolb/fibel";

export function requireTagsPlugin(): FibelPlugin {
  return {
    name: "require-tags",
    afterContent(context) {
      for (const page of context.pages) {
        if (!page.meta.hidden && page.meta.tags.length === 0) {
          throw new Error(`${page.sourcePath} has no tags.`);
        }
      }
    },
  };
}
```

Useful checks include missing descriptions, invalid tags, incomplete translations, or pages that should not be published.

## Add a route

Routes receive the current request and the Fibel context. This example serves a small JSON manifest of all pages.

```ts
import type { FibelPlugin } from "@valentinkolb/fibel";

export function docsManifestPlugin(): FibelPlugin {
  return {
    name: "docs-manifest",
    routes(context) {
      return [
        {
          path: "/manifest.json",
          handler() {
            return Response.json({
              title: context.config.title,
              pages: context.pages.map((page) => ({
                title: page.meta.title,
                href: page.href,
                locale: page.locale.code,
              })),
            });
          },
        },
      ];
    },
  };
}
```

Choose custom route paths so they do not collide with internal routes or page paths.

## Add head tags

`context.headTags` collects functions that render markup into the `<head>` of every page. Each function receives the current page and the context, so tags can differ per page and per locale.

```ts
import type { FibelPlugin } from "@valentinkolb/fibel";

export function analyticsPlugin(siteId: string): FibelPlugin {
  return {
    name: "analytics",
    setup(context) {
      context.headTags.push(() => `<script defer data-site="${siteId}" src="https://example.com/a.js"></script>`);
    },
  };
}
```

Return an empty string to skip a page. The built-in SEO plugin uses this hook for language alternates, social cards, and structured data.

## Compose with defaults

Most projects append their plugins to the default set.

```ts
import { defineFibel, defaultPlugins } from "@valentinkolb/fibel";
import { docsManifestPlugin } from "./plugins/docs-manifest";
import { requireTagsPlugin } from "./plugins/require-tags";

export default defineFibel({
  title: "Product Docs",
  plugins: [
    ...defaultPlugins(),
    requireTagsPlugin(),
    docsManifestPlugin(),
  ],
});
```

Order matters. Plugins that replace services should run before plugins that use those services. Validation and additional routes can usually run after the defaults.

## Context reference

```ts
type FibelContext = {
  config: ResolvedFibelConfig;
  pages: FibelPage[];
  nav: Map<string, NavSection[]>;
  footerItems: string[];
  headTags: HeadTag[];
  searchIndex: SearchEntry[];
  routes: FibelRoute[];
  services: FibelServices;
};
```

The context is the shared workspace for plugins. It contains configuration, loaded pages, navigation, footer items, head tags, search data, registered routes, and replaceable services.
