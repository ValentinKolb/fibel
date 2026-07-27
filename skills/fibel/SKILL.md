---
name: fibel
description: Build, configure, document, debug, or extend Fibel documentation sites. Use this skill whenever the user mentions Fibel, fibel.config.ts, Fibel docs, Markdown documentation sites, raw .md routes for LLMs, Fibel plugins, the Fibel AI assistant or its system prompt, Nessi providers, Fibel themes, Fibel search, Fibel i18n, the @k2b/fibel package, or mounting a Fibel Fetch app inside another server. This skill helps agents choose the right Fibel API, avoid unsupported assumptions, and verify sites with Bun commands and browser checks.
---

# Fibel

Use this skill when working on a Fibel documentation site or on the Fibel package itself.

Fibel is a config-first documentation runtime. It reads Markdown files, builds localized navigation and search data, and serves a Web-standard `fetch` app. The default theme is server-rendered, supports light/dark mode through a cookie, exposes raw Markdown routes for tools such as LLMs, and includes a default `Powered by fibel.dev` footer attribution.

Fibel's npm package is `@k2b/fibel`. Import the root API from `@k2b/fibel`, plugins from `@k2b/fibel/plugins`, and run the CLI with `bunx --bun @k2b/fibel`. The former `@valentinkolb/fibel` package is deprecated as of `v0.2.0`.

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
  -> materialize configured custom pages per locale
  -> render Markdown
  -> run plugin afterContent hooks
  -> register plugin routes
  -> serve fetch(request)
```

Normal documents are Markdown files. Fibel renders them to HTML strings and wraps them in the configured layout service. Configured custom pages use the same routing, navigation, search, assistant, SEO, and discovery pipelines while a host callback renders their visible body.

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
  seo: {
    favicon: "/assets/logo.svg",
    ogImage: "/assets/social.png",
    twitterSite: "@example",
    disallow: ["/en/internal"],
  },
  headerLinks: [{ label: "Guide", value: "/runtime" }],
  footerLinks: [{ label: "Imprint", value: "/imprint" }],
});
```

Keep these invariants:

- `defaultLocale` must be listed in `locales`.
- `routing.basePath` must match the public mount path when Fibel is served as a sub-app.
- `routing.internalPath` is for framework endpoints such as search and CSS.
- `routing.assetsPath` is for files from the configured assets directory.
- `content` defaults to `docs`, `assets` defaults to `assets`, and both resolve relative to `root`, which defaults to the current working directory.
- When `locales` is omitted it is inferred from the folder names under the content directory, and `defaultLocale` falls back to the first entry.
- The dev server watches content, assets, and the config file only. Changing plugin or other TypeScript code needs a restart.
- `seo` is optional. `favicon` is a public URL written as configured and falls back to Fibel's internal SVG. `ogImage` is the default social preview image and is resolved under `basePath`, `twitterSite` is the handle credited on cards, and `disallow` adds paths to `robots.txt`. Set `siteUrl` in any published project, otherwise these outputs stay relative and crawlers reject the sitemap.
- Local header and footer links are resolved against the locale of the current page. Write them as page slugs without a locale segment.
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
- `hidden`: Remove from navigation, pagination, site search, `llms.txt`, and the sitemap, and render with `noindex`. The page stays reachable at its URL.
- `tags`: Tag chips below the page title.
- `updated`: Date chip below the page title, also used as `article:modified_time` and sitemap `lastmod`.
- `image`: Social preview image for this page, overriding `seo.ogImage`.

Before changing Fibel presentation or Markdown rendering, read `references/theme-and-markdown.md` for the public accent-token and table-wrapper contracts.

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
- German documentation uses an impersonal register. Avoid direct address (`du`, `dein`) and imperatives such as `Nutze`, `Setze`, or `Lies`; write `Das Plugin eignet sich, wenn …` or ``siteUrl` ist erforderlich` instead. Never personify the tool. English documentation may use imperatives, which read as neutral there.
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
- `llmsPlugin`
- `assetsPlugin`
- `searchPlugin`
- `poweredByPlugin`
- `layoutPlugin`

Import paths matter. `createFibelApp`, `defineFibel`, `defaultPlugins`, and the exported types come from `@k2b/fibel`. The individual plugins above come from `@k2b/fibel/plugins`, the framework-neutral header renderer comes from `@k2b/fibel/layout`, and the optional Solid bridge comes from `@k2b/fibel/solid`.

`imprintPlugin({ url, label })` ships with Fibel but is not in the default set. It adds a footer link to legal information hosted elsewhere. Use it instead of an imprint page when the legal text lives outside the documentation.

Use `defaultPlugins()` when adding behavior without replacing the standard site:

```ts
import { defineFibel, defaultPlugins } from "@k2b/fibel";
import { projectLinksPlugin } from "./plugins/project-links";

export default defineFibel({
  title: "Product Docs",
  plugins: [...defaultPlugins(), projectLinksPlugin()],
});
```

Replace `plugins` completely only when the project owns rendering, layout, search, or routes itself. To remove the default footer attribution, provide a plugin list without `poweredByPlugin`.

## AI documentation assistant

`assistantPlugin` is optional and uses `@k2b/nessi` with two read-only tools: search visible pages in the current language, then read one matching page. Fibel injects the resolved site and current-page descriptions as trusted overview context; detailed documentation is retrieved on demand instead of copied into every prompt.

Prefer `providerFromEnv()` when provider selection belongs to deployment configuration. Keep the plugin conditional when the same project must also run without AI credentials:

```ts
import { defaultPlugins, defineFibel } from "@k2b/fibel";
import { assistantPlugin, providerFromEnv } from "@k2b/fibel/plugins";

const assistant = process.env.FIBEL_AI_MODEL?.trim()
  ? [
      assistantPlugin({
        provider: providerFromEnv(),
        systemPrompt:
          "Help readers configure Product. Use Product terminology and prefer short, practical answers.",
      }),
    ]
  : [];

export default defineFibel({
  title: "Product Docs",
  plugins: [...defaultPlugins(), ...assistant],
});
```

`providerFromEnv()` reads `FIBEL_AI_PROVIDER`, required `FIBEL_AI_MODEL`, optional `FIBEL_AI_BASE_URL`, and the selected provider's native key variable. Supported providers are `openrouter`, `openai`, `anthropic`, `gemini`, `mistral`, and `ollama`.

Keep deployment decisions proportional:

- One Bun process needs no extra service. Default `@k2b/sync/browser` rate limiters and bounded Nessi sessions live in memory.
- Multiple replicas need injected server-side `@k2b/sync` rate limiters. Add `createSessionStore` only when chat history must follow a user between replicas.
- Keep request, concurrency, turn, output-token, history, and tool-result limits bounded. Also recommend a provider-account spending cap because application limits reset with the process and are not a financial backstop.
- Use `onUsage` when existing logs or metrics should receive aggregate provider usage. Do not introduce a separate queue or telemetry service solely for the assistant.

### Write a useful system prompt

`systemPrompt` is trusted operator guidance wrapped by Fibel's built-in documentation-only prompt; it does not replace the built-in scope, conditional tool policy, prompt-injection boundary, language context, or source handling.

Keep it short and stable:

- Put product terminology, audience, supported deployment assumptions, and answer style in `systemPrompt`.
- Use `{{siteTitle}}`, `{{siteDescription}}`, `{{locale}}`, `{{language}}`, `{{currentPage}}`, `{{currentPageTitle}}`, `{{currentPageDescription}}`, `{{date}}`, `{{time}}`, `{{weekday}}`, or `{{timezone}}` when stable guidance needs request context. Date and time use the server timezone.
- Use the synchronous `systemPrompt: (context) => string` form when TypeScript composition is clearer than templates. Keep the returned guidance deterministic and fast.
- Keep a short stable product brief in `systemPrompt` when the site description alone does not cover common overview questions. Simple overview answers should use trusted prompt context; detailed, procedural, configuration, API, code, and exact-behavior claims should use search followed by reading one result.
- Keep the documentation itself in Markdown. The search and read tools retrieve current visible pages, so pasting documentation into the prompt wastes context and becomes stale.
- State additional boundaries concretely and positively. One representative in-scope or out-of-scope example is more effective than a long list of vague prohibitions.
- Do not put credentials, per-user data, request-specific text, or other dynamic secrets in `systemPrompt`.
- Do not treat prompt wording as a cost or security control. Rate limits, bounded turns and output, server-only credentials, hidden-page filtering, and provider spending caps enforce those boundaries.
- Test with the deployment's actual model. At minimum verify an answerable documentation question, a question the docs do not answer, and an unrelated request such as writing a generic React application. The unrelated request should receive only the brief documentation-scope refusal and should not produce documentation sources.

If a model repeatedly calls tools instead of answering, simplify the operator guidance before increasing `maxTurns`. Extra turns increase latency and cost and can hide an unclear prompt.

Assistant answers are rendered with Fibel's server-side Markdown and highlighting stack using compact chat typography. Raw model HTML, unsafe link protocols, and images are not rendered.

## Discovery routes

`seoPlugin` serves `robots.txt`, `sitemap.xml`, and the built-in fallback favicon, and pushes language alternates, social card tags, and JSON-LD into the head of every page. Set `seo.favicon` to a public URL when the host should supply its own icon; Fibel writes that URL as configured, which lets several mounted instances share one host-level asset. `llmsPlugin` serves `llms.txt` and `llms-full.txt`, per locale and for the default locale at the root.

Set `siteUrl` in any project that will be published. Without it these routes emit relative URLs, which crawlers reject.

Pages with `hidden: true` are excluded from the sitemap and the `llms.txt` index and are rendered with a `noindex` meta tag.

Plugins add head markup through `context.headTags`, a list of `(page, context) => string` functions. Use it for analytics snippets or verification tags instead of replacing `layoutPlugin`. `context.bodyItems` has the same callback shape and renders opt-in overlays after the page shell. Routes can set `scope: "internal"` to stay below `routing.internalPath` or `scope: "public"` to avoid an internal alias.

## Plugin pattern

Use plugins for small, explicit extensions:

```ts
import type { FibelPlugin } from "@k2b/fibel";

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
import { createFibelApp } from "@k2b/fibel";
import config from "./fibel.config";

const fibel = await createFibelApp(config);

export default {
  fetch: fibel.fetch,
};
```

Any host that can call `fetch(request)` can mount Fibel. If mounting under `/docs`, set `routing.basePath` to `/docs` and route matching requests to `fibel.fetch`.

## Custom application pages

Use `pages` when a route needs server-rendered application output but should keep Fibel's header, sidebar, search, assistant, theme, SEO, raw Markdown, and discovery behavior:

```ts
export default defineFibel({
  title: "Cloud UI",
  pages: [
    {
      path: "/panel-header",
      title: "PanelHeader",
      description: "A consistent heading and action area.",
      section: "Components",
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

Keep these invariants:

- Fibel creates each custom page under every configured locale.
- `context` is either one shared Markdown string or `{ default, <locale> }`; `default` is the required language-neutral fallback.
- `context.markdown` feeds search, raw `.md` routes, `llms.txt`, and the assistant's existing `search_docs` and `read_doc` tools.
- `context.html` is rendered once with the configured Markdown service and can be displayed by the page. Do not extract documentation from component HTML.
- `layout: "article"` keeps normal article chrome. `layout: "full"` keeps the Fibel shell but gives the renderer a wider body without the article heading and pager.
- Custom paths are locale-relative absolute paths such as `/panel-header`. They must not contain a locale, query, hash, trailing slash, or `.md` suffix. Collisions with Markdown pages fail at startup.

### Solid SSR and islands

Use `solidPage` only when the host already owns an `@k2b/ssr` pipeline:

```tsx
import { createConfig } from "@k2b/ssr";
import {
  fibelSsrTemplate,
  solidPage,
  type FibelSsrTemplateOptions,
} from "@k2b/fibel/solid";

const { config: ssrConfig, plugin, html } =
  createConfig<FibelSsrTemplateOptions>({
    rootDir: import.meta.dir,
    template: fibelSsrTemplate,
  });

const page = solidPage({
  html,
  path: "/panel-header",
  title: "PanelHeader",
  description: "A consistent heading and action area.",
  context: panelHeaderMarkdown,
  component: ({ context }) => (
    <PanelHeaderPage documentation={context.html} />
  ),
});
```

Fibel's Solid entry point is only a render bridge. The host must register `plugin()` in development and production, mount the one `ssrConfig` route at `/_ssr`, and keep island props serializable. Do not add the SSR plugin to `fibel dev` or `fibel build`.

If the host already has an SSR config with another site template, create a second `createConfig({ template: fibelSsrTemplate })` only for its `html` renderer. Continue using the original config and plugin for `/_ssr` and builds. Both configs must use the same `rootDir` and `basePath`; only one plugin is registered.

### Several Fibel instances

Prefer separate instances when `/docs` and `/ui` should have separate navigation, search, assistant context, and chat sessions. Mount their Fetch apps under distinct `routing.basePath` values in one Hono/Bun process. Share the header config, theme cookie, assistant provider, and rate-limiter objects rather than adding search scopes or a Fibel multi-site manager.

Use the structured header config for cross-instance links:

```ts
import type { FibelHeaderConfig } from "@k2b/fibel";

const header = {
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
```

`renderFibelHeader` from `@k2b/fibel/layout` returns the same canonical markup for an external surface. `layoutPlugin({ header: false })` removes only Fibel's header when an outer shell supplies it. Search/theme/mobile controls are independently optional.

## Commands

For app projects:

```sh
bunx --bun @k2b/fibel init
bunx --bun @k2b/fibel dev --port 5173 --config fibel.config.ts
bunx --bun @k2b/fibel build --config fibel.config.ts
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
docker run --rm -p 3000:3000 ghcr.io/k2b-dev/fibel:latest
docker run --rm -p 3000:3000 ghcr.io/k2b-dev/fibel:v0.4.1
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
- The page is not `hidden`. Hidden pages are excluded from the search index entirely, not just from navigation.
- The query is sent to `${basePath}${internalPath}/search`.
- The page title, description, section, and Markdown body contain searchable text.

### Debug theme flicker

Check:

- The theme cookie name matches `config.theme.cookieName`.
- The server-rendered `<html>` class and `data-theme` match the selected theme.
- Client code updates the cookie and root element together.

## Guardrails

- Do not add MDX unless the user explicitly asks for it; Fibel's core content model is Markdown.
- Do not add a knowledge registry or HTML-to-Markdown extraction for custom pages. Their explicit `context` Markdown is the knowledge source.
- Do not make Fibel own Solid transforms, island discovery, `/_ssr` assets, or another build service. The host owns the single `@k2b/ssr` pipeline.
- Do not assume Hono is required. Fibel exposes a Fetch handler.
- Do not call raw Markdown routes an export feature; they are regular routes ending in `.md` or `.markdown`.
- Keep docs professional and direct. Avoid marketing filler and internal project-history wording.
