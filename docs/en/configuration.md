---
title: Configuration
navTitle: Configuration
section: Start
order: 2
description: Configure content folders, routes, locales, assets, footer links, frontmatter, theme, and plugins.
tags: [config, reference]
updated: 2026-06-09
---

# Configuration

`fibel.config.ts` describes site-wide documentation behavior. Page-specific information belongs in the frontmatter of each Markdown file.

## Minimal config

```ts
import { defineFibel } from "@valentinkolb/fibel";

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

`content` points to the Markdown folder. `assets` points to files that should be served with the documentation, such as images, PDFs, or downloads.

Keep links in Markdown files stable and relative to the documentation. This makes mounted deployments easier to maintain.

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

`basePath` is the public path of the documentation. Set it when Fibel runs under a sub-route. `internalPath` is reserved for generated files and internal endpoints. `assetsPath` is the public path for the assets folder.

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

Each locale maps to a folder under `docs`. Translated pages should use the same slug. `docs/en/search.md` and `docs/de/search.md` describe the same page in different languages.

## SEO

```ts
export default defineFibel({
  title: "My Docs",
  siteUrl: "https://docs.example.com",
  seo: {
    ogImage: "/assets/social.png",
    twitterSite: "@example",
    disallow: ["/en/internal"],
  },
});
```

Set `siteUrl` for search engines. It turns canonical URLs, language alternates, and sitemap entries into absolute URLs. Without it Fibel falls back to relative paths and the sitemap is not valid for crawlers.

`ogImage` is the social preview image used when a page does not define its own. Local paths are resolved under the base path and turned into absolute URLs. `twitterSite` is the handle credited on cards. `disallow` adds paths to `robots.txt`.

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

`headerLinks` fills the navigation next to the site title. Local values are resolved against the locale of the current page, so `/runtime` points to `/en/runtime` for an English reader and to `/de/runtime` for a German one. Write the value as the page slug without a locale segment.

A link is marked as active when its value matches the slug of the current page. When `headerLinks` is not set, the header shows no navigation.

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

Each link has a `label` and a `value`. Local values are resolved against the locale of the current page, exactly like header links, so `/imprint` points to `/en/imprint` for an English reader and to `/de/imprint` for a German one. Absolute `https:`, `mailto:`, `tel:`, and hash links are used as written.

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
updated: 2026-06-09
image: /assets/configuration.png
```

`title` is the page title. `navTitle` is the sidebar label. `section` selects the sidebar group. `order` sorts pages within a locale. `description` is used for SEO, search, and the intro. `hidden` removes a page from navigation and pagination and marks the page as `noindex`. `tags` are displayed as chips. `updated` displays an update date and fills `article:modified_time`. `image` overrides the social preview image for this page.

## Plugin list

When `plugins` is not set, Fibel loads the default plugin set.

```ts
import { defineFibel, defaultPlugins } from "@valentinkolb/fibel";
import { projectPlugin } from "./plugins/project-plugin";

export default defineFibel({
  title: "My Docs",
  plugins: [...defaultPlugins(), projectPlugin()],
});
```

Append project plugins to the defaults when the built-in behavior should remain active. Replace the list only when the project owns rendering, search, layout, or routing itself.
