# Fibel

Fibel publishes Markdown and host-rendered application pages in one documentation shell with native language routes, server-side search, raw Markdown sources, and a cookie-based light/dark theme.

It is built for product and developer documentation that should stay readable in the repository, work well as a website, and remain easy for tools such as LLMs to consume.

## Quick start

Fibel targets Bun.

For an app project:

```sh
bun add @k2b/fibel
bunx --bun @k2b/fibel init
bunx --bun @k2b/fibel dev --port 5173
```

Open `http://localhost:5173`. The root path redirects to the configured default locale.

`fibel dev` watches the config, docs, and assets. After a successful rebuild, connected browser tabs reload automatically. Use `--no-watch` or `--no-reload` when a plain local server is enough.

## Package migration

Fibel moved from `@valentinkolb/fibel` to `@k2b/fibel` in `v0.2.0`. Replace root imports with `@k2b/fibel`, plugin imports with `@k2b/fibel/plugins`, and CLI commands with `bunx --bun @k2b/fibel`. The previous package is deprecated and receives no further releases.

## Agent skill

Fibel publishes one English Agent Skill for documentation work. Install it
directly from the documentation website with the
[open-source Vercel Skills CLI](https://github.com/vercel-labs/skills):

```sh
bunx skills add https://fibel.dev
```

The concise skill gives agents the stable Fibel workflow and tells them to use
the public MCP server for exact current API details. It answers in the user's
language without maintaining translated copies of the skill.

When working from this repository:

```sh
bun install
bun run src/cli.ts init
bun run src/cli.ts dev --port 5173
```

## What Fibel provides

- Documentation pages from `docs/<locale>/**/*.md`
- Optional content collections with separate Markdown roots and navigation
- Framework-neutral custom pages with searchable Markdown context
- Optional Solid SSR and island integration through a host-owned `@k2b/ssr` build
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
- An optional public MCP endpoint for coding agents
- Optional origin-level Agent Skills discovery from a local directory
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

## Collections

Related documentation areas can share one Fibel instance, search, assistant, MCP endpoint, and deployment while retaining separate Markdown roots and sidebars:

```ts
export default defineFibel({
  title: "Cloud",
  routing: { basePath: "/docs" },
  locales: [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
  ],
  collections: [
    {
      id: "docs",
      label: "Docs",
      description: "Product documentation.",
      content: "content/docs",
    },
    {
      id: "ui",
      label: "UI",
      description: "Component reference.",
      content: "content/ui",
    },
  ],
  defaultCollection: "docs",
});
```

Canonical URLs use `{basePath}/{locale}/{collection}/{page}`, for example `/docs/en/ui/button`. `/docs/ui/button` redirects temporarily to the saved, requested, or default locale. Search starts in the current collection and can switch to **Everything**. Assistant and MCP tools can also select a collection.

Sites without `collections` keep the existing content directory and URL format.

## Configuration

Create `fibel.config.ts` at the project root:

```ts
import { defineFibel } from "@k2b/fibel";

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

`headerLinks` fills the navigation next to the site title. Local values are resolved against the current locale and collection. A link is marked as active when its value matches the slug of the current page. The header navigation is empty when `headerLinks` is not set.

`footerLinks` works the same way. Both lists take external URLs as written and resolve local paths against the current locale.

For a shared header across several Fibel instances, use the structured `header` config. Link functions receive the current locale, while `activeWhen` matches the instance prefix:

```ts
export default defineFibel({
  title: "Cloud UI",
  routing: { basePath: "/ui" },
  header: {
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
    searchLabel: "Search Cloud UI",
  },
});
```

`renderFibelHeader()` from `@k2b/fibel/layout` exposes the same markup for external pages. `layoutPlugin({ header: false })` removes only the built-in header when an outer shell already provides it.

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

## Custom application pages

`pages` adds server-rendered application output to the normal Fibel shell. Optional Markdown context remains the source for search, raw `.md` routes, `llms.txt`, and the documentation assistant.

```ts
export default defineFibel({
  title: "Cloud UI",
  pages: [
    {
      path: "/panel-header",
      title: "PanelHeader",
      description: "A consistent heading and action area.",
      context: {
        default: panelHeaderMarkdown,
        de: panelHeaderMarkdownDe,
      },
      render: ({ context }) =>
        `<section>${context.html}</section>`,
    },
  ],
});
```

Use `solidPage()` from `@k2b/fibel/solid` when the body contains Solid server components or `@k2b/ssr` islands. The host supplies its existing `html()` renderer and remains responsible for the single SSR plugin, `/_ssr` route, and production build. The [custom pages guide](https://fibel.dev/en/custom-pages) includes complete examples for Solid and multiple Fibel instances.

## SEO

Set `siteUrl` so canonical URLs, language alternates, and sitemap entries become absolute. Fibel then adds `hreflang` alternates for every translation of a page plus an `x-default`, so search engines treat the language versions as one page instead of competitors.

```ts
export default defineFibel({
  title: "Product Docs",
  siteUrl: "https://docs.example.com",
  seo: {
    favicon: "/assets/logo.svg",
    ogImage: "/assets/social.png",
    twitterSite: "@example",
    disallow: ["/en/internal"],
  },
});
```

`seo.favicon` replaces the built-in Fibel favicon with a public URL, written into the document head as configured. Without it, Fibel keeps serving its default icon. Pages marked `hidden` are left out of the sitemap and rendered with `noindex`. Social cards use `seo.ogImage` unless a page sets `image` in its frontmatter.

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

## MCP for coding agents

The optional MCP plugin exposes the same visible Markdown knowledge to coding
agents through two read-only tools. It runs inside the existing Fetch app and
adds an **MCP** setup item to the default footer.

```ts
import { defaultPlugins, defineFibel } from "@k2b/fibel";
import { mcpPlugin } from "@k2b/fibel/plugins";

export default defineFibel({
  title: "Product Docs",
  plugins: [...defaultPlugins(), mcpPlugin()],
});
```

The endpoint is `${basePath}${internalPath}/mcp`, for example `/docs/_fibel/mcp`. It has no authentication and is intended for public documentation. Multiple Fibel instances remain separate MCP servers, so `/docs` and `/ui` keep independent search scopes. The [MCP guide](https://fibel.dev/en/mcp) covers setup, limits, and shared rate limiting.

## Agent Skills discovery

The optional Agent Skills plugin publishes self-contained skills from one
directory through the standard origin-level well-known endpoint:

```ts
import { defaultPlugins, defineFibel } from "@k2b/fibel";
import { agentSkillsPlugin } from "@k2b/fibel/plugins";

export default defineFibel({
  title: "Product Docs",
  plugins: [
    ...defaultPlugins(),
    agentSkillsPlugin({ directory: "skills" }),
  ],
});
```

Each immediate child such as `skills/product-docs/SKILL.md` becomes one
discoverable skill. The directory name must match its frontmatter `name`.
Supporting files are not accepted in this initial `skill-md` implementation.

With the default layout, Agent Skills adds an **Agents** footer item with the
Vercel Skills CLI installation command. When MCP is active too, the same dialog
contains the Skills installation plus the Codex, Claude Code, OpenCode, and
Other MCP setup. The skill provides compact workflow guidance; MCP supplies exact
current documentation.

Discovery is served at `/.well-known/agent-skills/index.json` regardless of
`routing.basePath`. A standalone Fibel server receives that route
automatically. A host that mounts Fibel below `/docs` must additionally forward
`/.well-known/agent-skills/*` to the same `fibel.fetch` handler. Only one Fibel
instance should own that origin route. See the
[Agent Skills guide](https://fibel.dev/en/agent-skills).

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
import { createFibelApp } from "@k2b/fibel";
import config from "./fibel.config";

const fibel = await createFibelApp(config);

export default {
  fetch: fibel.fetch,
};
```

For a larger app, mount `fibel.fetch` below the same public route configured as `routing.basePath`.

Several Fibel apps can be mounted in one process. Each instance then has its own navigation, search index, assistant context, MCP endpoint, and path-scoped discovery routes while sharing the same header config, theme cookie, provider, rate limiters, and deployment. Origin-level Agent Skills discovery has one explicit owner per domain.

## Docker

The repository includes a Docker image for hosting the default Fibel documentation.

```sh
docker build -t fibel-docs .
docker run --rm -p 3000:3000 fibel-docs
```

The image uses a pinned Bun multi-stage build. Development dependencies are installed only in the build stage, where typecheck, tests, and `fibel build` run. The runtime stage uses production dependencies and starts the generated server as the non-root `bun` user.

Tagged releases publish the same image to GitHub Container Registry:

```sh
docker run --rm -p 3000:3000 ghcr.io/k2b-dev/fibel:latest
docker run --rm -p 3000:3000 ghcr.io/k2b-dev/fibel:v0.6.1
```

## Plugins

Plugins can replace services, validate content, add routes, or derive metadata from the loaded pages.

```ts
import { defineFibel, defaultPlugins, type FibelPlugin } from "@k2b/fibel";

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

The built-in plugin set includes Markdown rendering, theme handling, i18n checks, SEO metadata and routes, `llms.txt` routes, asset routes, search, powered-by attribution, and layout rendering. Individual plugins are exported from `@k2b/fibel/plugins`.

### Documentation assistant

The optional assistant plugin uses `@k2b/nessi` to answer from visible documentation pages. Its default `@k2b/sync/browser` rate limiters and sessions live in the Fibel process, so a single-server deployment needs no Redis or database.

```ts
import { assistantPlugin, providerFromEnv } from "@k2b/fibel/plugins";

assistantPlugin({
  provider: providerFromEnv(),
  launcherLabel: "Ask Product",
  systemPrompt: "Help readers configure Product. Keep answers concise.",
});
```

`launcherLabel` overrides the localized launcher text. Fibel keeps the localized default when it is omitted.

```sh
FIBEL_AI_PROVIDER=openrouter
FIBEL_AI_MODEL=provider/model-name
OPENROUTER_API_KEY=...
```

The defaults limit each session to 5 requests per minute, the process to 100 requests per day, each response to 3 agent turns and 600 output tokens, and concurrent generations to 2. In-memory limits reset on restart and are separate per replica. Multiple replicas can inject Redis-backed limiters from `@k2b/sync` plus a shared Nessi session store. Configure a provider-account spending cap as the final financial limit.

## Commands

```sh
bunx --bun @k2b/fibel init
bunx --bun @k2b/fibel dev --port 5173 --config fibel.config.ts
bunx --bun @k2b/fibel build --config fibel.config.ts
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
git tag v0.6.1
git push origin v0.6.1
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
