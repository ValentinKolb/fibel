# Fibel

Fibel publishes Markdown documentation as a server-rendered website with native language routes, server-side search, raw Markdown pages, and a cookie-based light/dark theme.

It is built for product and developer documentation that should stay readable in the repository, work well as a website, and remain easy for tools such as LLMs to consume.

## Quick start

Fibel targets Bun.

For an app project:

```sh
bun add @valentinkolb/fibel
bunx --bun @valentinkolb/fibel init
bunx --bun @valentinkolb/fibel dev --port 5173
```

Open `http://localhost:5173`. The root path redirects to the configured default locale.

When working from this repository:

```sh
bun install
bun run src/cli.ts init
bun run src/cli.ts dev --port 5173
```

## What Fibel provides

- Documentation pages from `docs/<locale>/**/*.md`
- A standalone Web-standard `fetch` app
- Server-rendered HTML with page metadata and canonical URLs
- Server-side search with an interactive spotlight dialog
- Keyboard shortcuts for search with `/` and `Mod+K`
- Stable raw Markdown routes with `.md` and `.markdown`
- Native language routing and language switching
- Light and dark mode without client-side theme flicker
- Static assets from an `assets/` directory
- SEO routes for `robots.txt`, `sitemap.xml`, and `favicon.ico`
- A Tailwind-based default theme
- A small plugin API for replacing or extending built-in behavior

## Project structure

```txt
.
|-- fibel.config.ts
|-- docs/
|   |-- en/
|   |   |-- index.md
|   |   `-- configuration.md
|   `-- de/
|       |-- index.md
|       `-- configuration.md
`-- assets/
    `-- logo.svg
```

Each locale has its own folder below `docs/`. A file at `docs/en/configuration.md` is served as `/en/configuration`. The same source is also available as `/en/configuration.md` and `/en/configuration.markdown`.

## Configuration

Create `fibel.config.ts` at the project root:

```ts
import { defineFibel } from "@valentinkolb/fibel";

export default defineFibel({
  title: "Product Docs",
  description: "Documentation for Product.",
  siteUrl: "https://docs.example.com",
  locales: [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
  ],
  defaultLocale: "en",
  routing: {
    basePath: "/docs",
    internalPath: "/_fibel",
    assetsPath: "/assets",
  },
  theme: {
    defaultMode: "light",
    cookieName: "fibel_theme",
  },
  footerLinks: [
    { label: "Imprint", value: "/imprint" },
    { label: "GitHub", value: "https://github.com/example/project" },
  ],
});
```

`basePath` is the public mount path. With the config above, pages live under `/docs`, the search endpoint lives under `/docs/_fibel/search`, and assets live under `/docs/assets/...`.

Footer link values can be external URLs or local paths. Local absolute paths are prefixed with `basePath`.

## Content

Fibel reads Markdown files from the configured content directory. The first `#` heading is treated as the page title and is rendered once by the layout. Headings from `##` to `####` receive stable IDs and copy-link buttons.

```md
---
title: Configuration
navTitle: Configuration
section: Start
order: 20
description: Configure content, routing, locales, theme, footer links, and plugins.
tags: [config, routing]
updated: 2026-06-09
---

# Configuration

Use `fibel.config.ts` to describe the documentation site.
```

Supported frontmatter fields:

- `title`: Page title used for the heading, metadata, and search.
- `navTitle`: Short title used in navigation.
- `section`: Sidebar section label.
- `order`: Numeric sort order inside a locale and section.
- `description`: SEO description and page summary.
- `hidden`: Hide the page from navigation when set to `true`.
- `tags`: List of tags rendered as page chips.
- `updated`: Date string rendered as a page chip.

## Assets

Place files in the configured assets directory. Fibel serves them below the configured assets route.

```md
![Architecture diagram](/assets/architecture.png)

[Download the PDF](/assets/product-brief.pdf)
```

If the app is mounted under `basePath`, link to assets through that public route.

## Search

Fibel builds a search index from page title, description, section, and Markdown body. The default theme includes a spotlight search dialog that opens with `/` or `Mod+K`.

Search is server-side by default. The browser sends the query to the internal search endpoint and renders the result list without a full page reload.

## Light and dark mode

The default theme stores the selected mode in a cookie. The server reads the cookie and renders the initial HTML with the correct root class:

```html
<html class="dark" data-theme="dark" style="color-scheme:dark">
```

This avoids a visible switch from one theme to the other after hydration.

## Programmatic use

Fibel exposes a Web-standard Fetch app. Hosts do not need a specific framework.

```ts
import { createFibelApp } from "@valentinkolb/fibel";
import config from "./fibel.config";

const fibel = await createFibelApp(config);

export default {
  fetch: fibel.fetch,
};
```

For a larger app, mount `fibel.fetch` below the same public route configured as `routing.basePath`.

## Plugins

Plugins can replace services, validate content, add routes, or derive metadata from the loaded pages.

```ts
import { defineFibel, defaultPlugins, type FibelPlugin } from "@valentinkolb/fibel";

function requireTagsPlugin(): FibelPlugin {
  return {
    name: "require-tags",
    afterContent(context) {
      for (const page of context.pages) {
        if (page.meta.hidden) continue;
        if (!page.meta.tags.length) {
          throw new Error(`${page.sourcePath} is missing frontmatter tags.`);
        }
      }
    },
  };
}

export default defineFibel({
  title: "Product Docs",
  plugins: [...defaultPlugins(), requireTagsPlugin()],
});
```

The built-in plugin set includes Markdown rendering, theme handling, i18n checks, SEO routes, asset routes, search, and layout rendering.

## Commands

```sh
bunx --bun @valentinkolb/fibel init
bunx --bun @valentinkolb/fibel dev --port 5173 --config fibel.config.ts
bunx --bun @valentinkolb/fibel build --config fibel.config.ts
bunx --bun @valentinkolb/fibel serve --port 3000 --config fibel.config.ts
```

Repository scripts:

```sh
bun run dev
bun run build
bun run start
bun test
bun run typecheck
```

`fibel build` writes a deployable runtime into `dist/` and copies generated Fibel assets into `dist/.fibel`.

## Publishing

Publishing is handled by GitHub Actions through npm trusted publishing. Push a version tag to publish that version:

```sh
git tag v0.0.2
git push origin v0.0.2
```

The workflow runs typecheck, tests, build, package-content checks, sets `package.json` to the tag version, and publishes with provenance:

```sh
npm publish --provenance --access public
```

No npm token is required. The package is connected to `.github/workflows/publish.yml` through npm trusted publishing.

## Development

```sh
bun install
bun run typecheck
bun test
bun run build
```

The repository includes example documentation in `docs/en` and `docs/de`. Use it as both the project documentation and a visual test case for the default theme.
