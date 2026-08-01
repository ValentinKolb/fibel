---
title: Configuration
navTitle: Configuration
section: Start
order: 2
description: Configure content folders, routes, locales, assets, headers, custom pages, frontmatter, theme, and plugins.
tags: [config, reference]
updated: 2026-06-09
---

# Configuration

`fibel.config.ts` describes site-wide documentation behavior. Page-specific information belongs in the frontmatter of each Markdown file.

## Minimal config

```ts
import { defineFibel } from "@k2b/fibel";

export default defineFibel({
  title: "My Docs",
  description: "Documentation for my project.",
  siteUrl: "https://example.com",
  locales: [{ code: "en", label: "English" }],
  defaultLocale: "en",
});
```

`title` is used for branding and metadata. `description` is the default site description. `siteUrl` is used for canonical URLs and SEO files.

## Content and assets

```ts
export default defineFibel({
  title: "My Docs",
  content: "docs",
  assets: "assets",
});
```

Both keys are optional. `content` defaults to `docs` and points to the Markdown folder. `assets` defaults to `assets` and points to files served with the documentation, such as images, PDFs, or downloads. Both are resolved relative to `root`, which defaults to the current working directory and only needs to be set when the config file does not sit at the project root.

Keep links in Markdown files stable and relative to the documentation. This makes mounted deployments easier to maintain.

## Collections

Use `collections` instead of the top-level `content` folder when several documentation areas should share one Fibel instance:

```ts
export default defineFibel({
  title: "Cloud",
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

`path` optionally changes a collection's public path and otherwise defaults to its ID. Custom pages select a collection with `collection`; omitted values use `defaultCollection`. The [collections guide](/en/docs/collections) documents URL composition, locale redirects, search scopes, Solid pages, Assistant, MCP, and discovery routes.

## Routing

```ts
export default defineFibel({
  title: "My Docs",
  routing: {
    basePath: "/docs",
    internalPath: "/_fibel",
    assetsPath: "/assets",
  },
});
```

`basePath` is the public path of the documentation. Set it when Fibel runs under a sub-route. `internalPath` is reserved for generated files and internal endpoints. `assetsPath` is the public path for the assets folder. Collection routes compose as `{basePath}/{locale}/{collectionPath}/{pageSlug}`.

## Locales

```ts
export default defineFibel({
  title: "My Docs",
  locales: [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
  ],
  defaultLocale: "en",
});
```

Each locale maps to a folder under `docs`. Translated pages should use the same slug. `docs/en/search.md` and `docs/de/search.md` describe the same page in different languages, which is also what pairs them for language switching and `hreflang`.

When `locales` is omitted, Fibel infers them from the folder names under the content directory and uses the uppercased folder name as the label. `defaultLocale` then falls back to the first locale in the list. Set both explicitly for a published site, because folder order decides the default otherwise.

`defaultLocale` must appear in `locales`. Fibel throws at startup when it does not.

## SEO

```ts
export default defineFibel({
  title: "My Docs",
  siteUrl: "https://docs.example.com",
  seo: {
    favicon: "/assets/logo.svg",
    ogImage: "/assets/social.png",
    twitterSite: "@example",
    disallow: ["/en/internal"],
  },
});
```

Set `siteUrl` for search engines. It turns canonical URLs, language alternates, and sitemap entries into absolute URLs. Without it Fibel falls back to relative paths and the sitemap is not valid for crawlers.

`favicon` is a public URL written into the document head as configured. Without it Fibel uses the built-in icon under its internal path. `ogImage` is the social preview image used when a page does not define its own. Local image paths are resolved under the base path and turned into absolute URLs. `twitterSite` is the handle credited on cards. `disallow` adds paths to `robots.txt`.

Pages marked `hidden` are excluded from the sitemap and get a `noindex` meta tag.

## Header links

```ts
export default defineFibel({
  title: "My Docs",
  headerLinks: [
    { label: "Overview", value: "/" },
    { label: "Guide", value: "/runtime" },
    { label: "Changelog", value: "https://github.com/example/docs/releases" },
  ],
});
```

`headerLinks` fills the navigation next to the site title. Local values are resolved against the locale and current collection of the page, so `/runtime` points to `/en/runtime` for a legacy English site and `/docs/en/ui/runtime` inside a mounted `ui` collection. Write the value as the page slug without locale or collection segments.

A link is marked as active when its value matches the slug of the current page. When `headerLinks` is not set, the header shows no navigation.

## Shared header

The structured `header` config is intended for several Fibel instances that should appear as one website:

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
    searchPlaceholder: "Search components...",
  },
});
```

`title` is the shared brand and stays independent from the instance title used by metadata and the assistant. `homeHref` and link `href` values accept either a string or a synchronous function receiving `locale`, `pathname`, `basePath`, and the optional `collection` ID. `activeWhen` marks a link active for the exact prefix and its descendants.

`search`, `themeToggle`, and `mobileNavigation` default to `true` and can be disabled individually. `headerLinks` remains the shorter locale-relative API for links inside a single Fibel instance.

## Footer links

```ts
export default defineFibel({
  title: "My Docs",
  footerLinks: [
    { label: "Imprint", value: "/imprint" },
    { label: "GitHub", value: "https://github.com/example/docs" },
  ],
});
```

Each link has a `label` and a `value`. Local values are resolved against the locale and current collection of the page, exactly like header links. Absolute `https:`, `mailto:`, `tel:`, and hash links are used as written.

## Frontmatter

Fibel supports flat frontmatter with strings, numbers, booleans, and simple string arrays.

```yaml
title: Configuration
navTitle: Configuration
section: Start
order: 2
description: Configure content, routes, locales, assets, theme, and plugins.
hidden: false
tags: [config, routing]
date: 2026-05-21
authors: [Fibel Team]
updated: 2026-06-09
image: /assets/configuration.png
```

Every field is optional. `title` is the page title; without it Fibel uses the first `#` heading, then a title-cased version of the slug. `navTitle` is the sidebar label and defaults to the title. `section` selects the sidebar group and defaults to `Guide`. `order` sorts pages within a locale and defaults to `100`. `description` is used for SEO, search, and the intro; without it Fibel takes the first paragraph, shortened to 180 characters, and falls back to the site description. `hidden` removes a page from navigation, pagination, the site's own search, `llms.txt`, and the sitemap, and marks it as `noindex`. The page stays reachable at its URL, which is what makes it useful for pages linked only from the footer. `tags` are displayed as chips. `date` is the publication date and fills `article:published_time`; `authors` lists the authors. `updated` displays an update date and fills `article:modified_time`. `image` overrides the social preview image for this page.

## Custom pages

`pages` registers application-rendered routes alongside Markdown files. Page metadata follows the same navigation, search, SEO, and visibility rules. Optional `context` supplies the Markdown returned by raw routes and read by search and the assistant. In collection mode, `collection` selects the owning collection and otherwise falls back to `defaultCollection`.

The [custom pages guide](/en/docs/custom-pages) documents the complete renderer contract, shared and localized context, Solid SSR integration, and multiple instances.

## Plugin list

When `plugins` is not set, Fibel loads the default plugin set.

```ts
import { defineFibel, defaultPlugins } from "@k2b/fibel";
import { projectPlugin } from "./plugins/project-plugin";

export default defineFibel({
  title: "My Docs",
  plugins: [...defaultPlugins(), projectPlugin()],
});
```

Append project plugins to the defaults when the built-in behavior should remain active. Replace the list only when the project owns rendering, search, layout, or routing itself.
