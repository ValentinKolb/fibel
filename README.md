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

`fibel dev` watches the config, docs, and assets. After a successful rebuild, connected browser tabs reload automatically. Use `--no-watch` or `--no-reload` when a plain local server is enough.

## Agent skill

Fibel ships a Codex agent skill for documentation work. Install it in agent environments that should understand Fibel projects:

```sh
bunx skills add ValentinKolb/fibel
```

The skill tells agents how to configure Fibel, write Markdown pages, use raw `.md` routes, extend plugins, mount the Fetch app, and verify changes.

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
- SEO routes for `robots.txt`, `sitemap.xml`, `favicon.ico`, and `favicon.svg`
- Language alternates, social cards, and structured data on every page
- `llms.txt` and `llms-full.txt` routes for language models
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
  headerLinks: [
    { label: "Guide", value: "/runtime" },
    { label: "Plugins", value: "/plugins" },
  ],
  footerLinks: [
    { label: "Imprint", value: "/imprint" },
    { label: "GitHub", value: "https://github.com/example/project" },
  ],
});
```

`basePath` is the public mount path. With the config above, pages live under `/docs`, the search endpoint lives under `/docs/_fibel/search`, and assets live under `/docs/assets/...`.

`headerLinks` fills the navigation next to the site title. Local values are resolved against the current locale, so `/runtime` points to `/en/runtime` on an English page and to `/de/runtime` on a German one. A link is marked as active when its value matches the slug of the current page. The header navigation is empty when `headerLinks` is not set.

`footerLinks` works the same way. Both lists take external URLs as written and resolve local paths against the current locale.

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
- `hidden`: Remove the page from navigation, pagination, site search, `llms.txt`, and the sitemap, and render it with `noindex`. The page stays reachable at its URL.
- `tags`: List of tags rendered as page chips.
- `updated`: Date string rendered as a page chip and used as `article:modified_time`.
- `image`: Social preview image for this page, overriding `seo.ogImage`.

## Assets

Place files in the configured assets directory. Fibel serves them below the configured assets route.

```md
![Architecture diagram](/assets/architecture.png)

[Download the PDF](/assets/product-brief.pdf)
```

If the app is mounted under `basePath`, link to assets through that public route.

## SEO

Set `siteUrl` so canonical URLs, language alternates, and sitemap entries become absolute. Fibel then adds `hreflang` alternates for every translation of a page plus an `x-default`, so search engines treat the language versions as one page instead of competitors.

```ts
export default defineFibel({
  title: "Product Docs",
  siteUrl: "https://docs.example.com",
  seo: {
    ogImage: "/assets/social.png",
    twitterSite: "@example",
    disallow: ["/en/internal"],
  },
});
```

Pages marked `hidden` are left out of the sitemap and rendered with `noindex`. Social cards use `seo.ogImage` unless a page sets `image` in its frontmatter.

Every indexable page also carries JSON-LD with a `TechArticle`. Content pages add a `BreadcrumbList` built from the sidebar section; locale index pages add a `WebSite` entry instead.

## Discovery for language models

Fibel publishes an `llms.txt` index next to the raw Markdown routes.

```txt
/llms.txt              index for the default locale
/en/llms.txt           index for a specific locale
/llms-full.txt         every page of the default locale in one file
/en/llms-full.txt      every page of a locale in one file
```

The index lists each page grouped by sidebar section and links to the raw `.md` route with its description. Hidden pages are excluded.

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

## Docker

The repository includes a Docker image for hosting the default Fibel documentation.

```sh
docker build -t fibel-docs .
docker run --rm -p 3000:3000 fibel-docs
```

The image uses a pinned Bun multi-stage build. Development dependencies are installed only in the build stage, where typecheck, tests, and `fibel build` run. The runtime stage uses production dependencies and starts the generated server as the non-root `bun` user.

Tagged releases publish the same image to GitHub Container Registry:

```sh
docker run --rm -p 3000:3000 ghcr.io/valentinkolb/fibel:latest
docker run --rm -p 3000:3000 ghcr.io/valentinkolb/fibel:v0.0.7
```

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

The built-in plugin set includes Markdown rendering, theme handling, i18n checks, SEO metadata and routes, `llms.txt` routes, asset routes, search, powered-by attribution, and layout rendering. Individual plugins are exported from `@valentinkolb/fibel/plugins`.

## Commands

```sh
bunx --bun @valentinkolb/fibel init
bunx --bun @valentinkolb/fibel dev --port 5173 --config fibel.config.ts
bunx --bun @valentinkolb/fibel build --config fibel.config.ts
```

`fibel dev` rebuilds on local documentation changes and reloads connected browser tabs after the rebuild succeeds. Disable either behavior with `--no-watch` or `--no-reload`. `fibel serve` is an alias for `fibel dev` and starts the same watching development server.

`fibel build` writes the deployable runtime. Serve it with `bun dist/server.ts`, which listens on `PORT` and defaults to `3000`.

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
git tag v0.0.8
git push origin v0.0.8
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
