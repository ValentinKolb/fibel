---
name: fibel
description: Build, configure, document, debug, or extend Fibel documentation sites. Use this skill whenever the user mentions Fibel, fibel.config.ts, Fibel docs, Markdown documentation sites, raw .md routes for LLMs, Fibel plugins, Fibel themes, Fibel search, Fibel i18n, the @valentinkolb/fibel package, or mounting a Fibel Fetch app inside another server. This skill helps agents choose the right Fibel API, avoid unsupported assumptions, and verify sites with Bun commands and browser checks.
---

# Fibel

Use this skill when working on a Fibel documentation site or on the Fibel package itself.

Fibel is a config-first documentation runtime. It reads Markdown files, builds localized navigation and search data, and serves a Web-standard `fetch` app. The default theme is server-rendered, supports light/dark mode through a cookie, exposes raw Markdown routes for tools such as LLMs, and includes a default `Powered by fibel.dev` footer attribution.

## First checks

Before editing a Fibel project, inspect the project shape:

```sh
rg --files
sed -n '1,220p' package.json
sed -n '1,220p' fibel.config.ts
find docs -maxdepth 3 -type f | sort
```

If you are inside the Fibel repository itself, also inspect:

```sh
sed -n '1,220p' src/config.ts
sed -n '1,220p' src/types.ts
sed -n '1,220p' src/plugins/index.ts
```

Use the current code as the source of truth. Do not promise features that are not exported by the package.

## Mental model

Fibel follows this flow:

```txt
fibel.config.ts
  -> resolve config
  -> run plugin setup
  -> load docs/<locale>/**/*.md
  -> render Markdown
  -> run plugin afterContent hooks
  -> register plugin routes
  -> serve fetch(request)
```

Normal documents are Markdown files. Fibel renders them to HTML strings and wraps them in the configured layout service.

## Project layout

Use this default layout unless the existing project differs:

```txt
.
|-- fibel.config.ts
|-- docs/
|   |-- en/
|   |   `-- index.md
|   `-- de/
|       `-- index.md
`-- assets/
```

Each locale has its own folder. A page at `docs/en/configuration.md` is served as `/en/configuration`. The same source is served as `/en/configuration.md` and `/en/configuration.markdown`.

## Configuration

Start from `defineFibel`:

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
  headerLinks: [{ label: "Guide", value: "/runtime" }],
  footerLinks: [{ label: "Imprint", value: "/en/imprint" }],
});
```

Keep these invariants:

- `defaultLocale` must be listed in `locales`.
- `routing.basePath` must match the public mount path when Fibel is served as a sub-app.
- `routing.internalPath` is for framework endpoints such as search and CSS.
- `routing.assetsPath` is for files from the configured assets directory.
- Local header links are resolved against the locale of the current page. Write them as page slugs without a locale segment.
- Local footer links are prefixed with `basePath` only. Include the locale segment when they point at a page.
- External URLs are left as-is in both link lists.

## Markdown content

Use frontmatter for metadata and navigation:

```md
---
title: Configuration
navTitle: Configuration
section: Start
order: 20
description: Configure Fibel projects.
tags: [config, routing]
updated: 2026-06-09
---

# Configuration

Use `fibel.config.ts` to define the site.
```

Supported frontmatter:

- `title`: Page title used by layout, metadata, and search.
- `navTitle`: Short navigation label.
- `section`: Sidebar section.
- `order`: Numeric sort order.
- `description`: SEO description and page summary.
- `hidden`: Hide from navigation when `true`.
- `tags`: Tag chips below the page title.
- `updated`: Date chip below the page title.

## Documentation style for Fibel sites

When writing documentation for a Fibel site, use a professional product/developer documentation style.

- Write for readers who need to understand and use the project, not for people who followed its planning history.
- State what the project is, who it is for, and what problem it solves before listing details.
- Do not repeat the same claim across the page description, first paragraph, and first section.
- Avoid marketing language such as "blazing-fast", "powerful", "seamless", "beautiful", or "super easy".
- Avoid internal roadmap language such as "V1", "we decided", "currently only", or "for now" unless the page is explicitly a roadmap or architecture note.
- Prefer concrete nouns and behaviors over vague feature claims. Write "server-side search index" instead of "modern search".
- Keep sentences direct. Split long feature chains into separate sentences or bullets.
- For German documentation, write natural German. Do not mirror English sentence structure or translate English idioms literally.
- For English documentation, use clear product documentation language, not SaaS landing-page copy.
- Keep multilingual pages aligned in structure, meaning, and level of detail.
- Use concrete information architecture: "Configuration", "Hosting", "Built-in plugins", "Plugin API", "Search". Avoid generic "Features" pages when the content is really a reference or guide.
- Examples should be minimal, runnable, and include the imports or config needed to understand them.

## Built-in plugins

The default plugin list is:

- `markdownPlugin`
- `themePlugin`
- `i18nPlugin`
- `seoPlugin`
- `assetsPlugin`
- `searchPlugin`
- `poweredByPlugin`
- `layoutPlugin`

Use `defaultPlugins()` when adding behavior without replacing the standard site:

```ts
import { defineFibel, defaultPlugins } from "@valentinkolb/fibel";
import { projectLinksPlugin } from "./plugins/project-links";

export default defineFibel({
  title: "Product Docs",
  plugins: [...defaultPlugins(), projectLinksPlugin()],
});
```

Replace `plugins` completely only when the project owns rendering, layout, search, or routes itself. To remove the default footer attribution, provide a plugin list without `poweredByPlugin`.

## Plugin pattern

Use plugins for small, explicit extensions:

```ts
import type { FibelPlugin } from "@valentinkolb/fibel";

export function requireTagsPlugin(): FibelPlugin {
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
```

Choose the hook by responsibility:

- `setup`: replace or wrap services before pages are loaded.
- `afterContent`: validate pages or build derived indexes after rendering.
- `routes`: add Fetch handlers for exact paths or wildcard paths.

Plugins should not mutate unrelated global state. Keep plugin output deterministic so builds and dev servers match.

## Programmatic hosting

Fibel returns a Web-standard Fetch app:

```ts
import { createFibelApp } from "@valentinkolb/fibel";
import config from "./fibel.config";

const fibel = await createFibelApp(config);

export default {
  fetch: fibel.fetch,
};
```

Any host that can call `fetch(request)` can mount Fibel. If mounting under `/docs`, set `routing.basePath` to `/docs` and route matching requests to `fibel.fetch`.

## Commands

For app projects:

```sh
bunx --bun @valentinkolb/fibel init
bunx --bun @valentinkolb/fibel dev --port 5173 --config fibel.config.ts
bunx --bun @valentinkolb/fibel build --config fibel.config.ts
```

`fibel dev` watches the config, docs, and assets by default. It rebuilds the in-memory app after changes and reloads connected browser tabs after a successful rebuild. Use `--no-watch` to disable rebuild watching and `--no-reload` to keep browser tabs from reloading automatically.

When working inside the Fibel repository:

```sh
bun run dev
bun run typecheck
bun test
bun run build
```

Before finishing code or documentation changes in the Fibel repository, run:

```sh
bun run typecheck
bun test
bun run build
```

For frontend or theme work, also open the local server and inspect the affected pages in a browser.

## Docker

Tagged releases publish the default documentation image to GHCR:

```sh
docker run --rm -p 3000:3000 ghcr.io/valentinkolb/fibel:latest
docker run --rm -p 3000:3000 ghcr.io/valentinkolb/fibel:v0.0.7
```

## Common tasks

### Add a documentation page

1. Create `docs/<locale>/<slug>.md`.
2. Add frontmatter with `title`, `navTitle`, `section`, `order`, and `description`.
3. Add matching translated pages for configured locales when the site is multilingual.
4. Run the dev server and verify navigation, page title, search, and raw Markdown route.

### Add assets

1. Put files in the configured assets directory.
2. Link them through the public assets route.
3. Verify links under `routing.basePath` when the app is mounted as a sub-app.

### Debug missing pages

Check:

- The file extension is `.md`.
- The file is inside `docs/<locale>/`.
- The locale exists in `locales` or can be inferred from the docs folders.
- `defaultLocale` is valid.
- The requested URL includes `routing.basePath` when configured.

### Debug search

Check:

- The page is loaded into `context.pages`.
- The page is not hidden when expecting navigation visibility.
- The query is sent to `${basePath}${internalPath}/search`.
- The page title, description, section, and Markdown body contain searchable text.

### Debug theme flicker

Check:

- The theme cookie name matches `config.theme.cookieName`.
- The server-rendered `<html>` class and `data-theme` match the selected theme.
- Client code updates the cookie and root element together.

## Guardrails

- Do not pass functions, callbacks, DOM nodes, or class instances across SSR/island serialization boundaries when integrating with `@valentinkolb/ssr`.
- Do not add MDX unless the user explicitly asks for it; Fibel's core content model is Markdown.
- Do not assume Hono is required. Fibel exposes a Fetch handler.
- Do not call raw Markdown routes an export feature; they are regular routes ending in `.md` or `.markdown`.
- Keep docs professional and direct. Avoid marketing filler and internal project-history wording.
