---
title: Custom and Solid pages
navTitle: Custom pages
section: Architecture
order: 15
description: Add server-rendered application pages to the Fibel shell while keeping their Markdown context available to search and the documentation assistant.
tags: [custom-pages, solid, ssr, islands]
updated: 2026-07-27
---

# Custom and Solid pages

Custom pages place application output inside Fibel's normal routing and layout. Fibel continues to provide the header, sidebar, search, theme, SEO, raw Markdown routes, and documentation assistant. The host application remains responsible for rendering its own components.

## Add a framework-neutral page

Add page definitions to the Fibel config:

```ts
import { defineFibel } from "@k2b/fibel";

export default defineFibel({
  title: "Cloud UI",
  locales: [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
  ],
  pages: [
    {
      path: "/panel-header",
      title: "PanelHeader",
      description: "A consistent heading and action area.",
      section: "Components",
      order: 10,
      context: {
        default: panelHeaderMarkdown,
        de: panelHeaderMarkdownDe,
      },
      render: ({ context }) =>
        `<section class="panel-showcase">${context.html}</section>`,
    },
  ],
});
```

Fibel creates the page under every configured locale. In this example the routes are `/en/panel-header` and `/de/panel-header`.

`context.default` is the language-neutral fallback. Locale keys override it only where a translation exists. A single string can be used when every locale should receive the same context.

The render callback receives both forms:

- `context.markdown` is indexed by search and returned by raw `.md` routes, `llms.txt`, and the assistant's existing `read_doc` tool.
- `context.html` is produced once with Fibel's Markdown renderer and can be displayed on the page.

This keeps the searchable explanation and the visible component documentation in one source. Fibel does not derive documentation from rendered HTML.

## Choose the body layout

`layout: "article"` is the default. It renders the page title, description, chips, Markdown typography, and previous/next navigation around the custom body.

`layout: "full"` keeps the Fibel header, sidebar, footer, search, and assistant but gives the component a wider body without article chrome:

```ts
{
  path: "/catalog",
  title: "Component catalog",
  description: "Browse the shared UI components.",
  layout: "full",
  context: catalogMarkdown,
  render: ({ context }) =>
    `<div class="catalog">${context.html}</div>`,
}
```

## Render Solid components and islands

The optional `@k2b/fibel/solid` entry point connects a custom page to an existing `@k2b/ssr` renderer. It does not register a Bun plugin, build assets, or mount an SSR route.

```ts
// src/ssr.ts
import { createConfig } from "@k2b/ssr";
import {
  fibelSsrTemplate,
  type FibelSsrTemplateOptions,
} from "@k2b/fibel/solid";

export const { config, plugin, html } =
  createConfig<FibelSsrTemplateOptions>({
    rootDir: import.meta.dir,
    template: fibelSsrTemplate,
  });
```

Pass that renderer to `solidPage`:

```tsx
import { defineFibel } from "@k2b/fibel";
import { solidPage } from "@k2b/fibel/solid";
import { html } from "./ssr";
import PanelHeaderPage from "./PanelHeaderPage";

export default defineFibel({
  title: "Cloud UI",
  pages: [
    solidPage({
      html,
      path: "/panel-header",
      title: "PanelHeader",
      description: "A consistent heading and action area.",
      section: "Components",
      context: panelHeaderMarkdown,
      component: ({ context }) => (
        <PanelHeaderPage documentation={context.html} />
      ),
    }),
  ],
});
```

Normal `.tsx` components render on the server. Components imported from `.island.tsx` or `.client.tsx` follow the regular `@k2b/ssr` rules. Island props must remain serializable.

The host mounts `config` at its one `/_ssr` route and uses `plugin()` for development and production builds. Fibel does not add another service or build command.

When the host already has an `@k2b/ssr` config with another HTML template, create a second config only for its `html` renderer and keep using the original config and plugin for routes and builds:

```ts
const siteSsr = createConfig<PageOptions>({
  rootDir: import.meta.dir,
  template: siteTemplate,
});

const fibelSsr = createConfig<FibelSsrTemplateOptions>({
  rootDir: import.meta.dir,
  template: fibelSsrTemplate,
});

export const ssrConfig = siteSsr.config;
export const plugin = siteSsr.plugin;
export const html = siteSsr.html;
export const fibelHtml = fibelSsr.html;
```

Both renderers point at the same `/_ssr` path. Only `siteSsr.plugin()` is registered, and it discovers all islands below the shared `rootDir`.

## Assign pages to a collection

When one Fibel instance defines `collections`, `collection` places a custom or Solid page in that area's routes, sidebar, search scope, assistant context, MCP results, and discovery output. An omitted value uses `defaultCollection`.

Add `collection: "ui"` to the earlier `solidPage` example to serve it at `/en/ui/panel-header` when the `ui` collection uses its default `/ui` path. See [content collections](/en/docs/collections) for the complete config and URL contract.

## Choose separate instances

Use separate Fibel instances when readers expect independent search indexes, assistant conversations, plugins, MCP endpoints, or operational limits. They can still run in one Hono process and one deployment:

```ts
import { Hono } from "hono";
import {
  createFibelApp,
  defineFibel,
  type FibelHeaderConfig,
} from "@k2b/fibel";

const cloudHeader = {
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
} satisfies FibelHeaderConfig;

const docs = await createFibelApp(
  defineFibel({
    title: "Cloud Docs",
    routing: { basePath: "/docs" },
    header: cloudHeader,
  }),
);

const ui = await createFibelApp(
  defineFibel({
    title: "Cloud UI",
    routing: { basePath: "/ui" },
    header: {
      ...cloudHeader,
      searchLabel: "Search Cloud UI",
      searchPlaceholder: "Search components...",
    },
    pages: uiPages,
  }),
);

export default new Hono()
  .mount("/docs", docs.fetch)
  .mount("/ui", ui.fetch);
```

Each instance owns its sidebar, search index, assistant context, discovery files, and path-scoped chat session. Provider and rate-limiter objects can be shared between their assistant plugins to enforce one process-wide budget.

## Reuse or remove the header

The default layout and external pages use the same framework-neutral renderer:

```ts
import { renderFibelHeader } from "@k2b/fibel/layout";

const header = renderFibelHeader({
  title: "Cloud",
  homeHref: "/en",
  links: [
    { label: "Docs", href: "/docs/en" },
    { label: "UI", href: "/ui/en", active: true },
  ],
  theme: "light",
  search: false,
});
```

The renderer returns the canonical Fibel header markup. Interactive controls require the regular Fibel styles and client assets.

An outer application shell can remove only Fibel's built-in header:

```ts
import { defaultPlugins } from "@k2b/fibel";
import { layoutPlugin } from "@k2b/fibel/plugins";

const plugins = [
  ...defaultPlugins().filter((plugin) => plugin.name !== "layout"),
  layoutPlugin({ header: false }),
];
```

The sidebar, body, search shortcut, footer, and assistant remain available.
