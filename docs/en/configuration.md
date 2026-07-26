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

Each locale maps to a folder under `docs`. Translated pages should use the same slug. `docs/en/search.md` and `docs/de/search.md` describe the same page in different languages, which is also what pairs them for language switching and `hreflang`.

When `locales` is omitted, Fibel infers them from the folder names under the content directory and uses the uppercased folder name as the label. `defaultLocale` then falls back to the first locale in the list. Set both explicitly for a published site, because folder order decides the default otherwise.

`defaultLocale` must appear in `locales`. Fibel throws at startup when it does not.

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

Every field is optional. `title` is the page title; without it Fibel uses the first `#` heading, then a title-cased version of the slug. `navTitle` is the sidebar label and defaults to the title. `section` selects the sidebar group and defaults to `Guide`. `order` sorts pages within a locale and defaults to `100`. `description` is used for SEO, search, and the intro; without it Fibel takes the first paragraph, shortened to 180 characters, and falls back to the site description. `hidden` removes a page from navigation, pagination, the site's own search, `llms.txt`, and the sitemap, and marks it as `noindex`. The page stays reachable at its URL, which is what makes it useful for pages linked only from the footer. `tags` are displayed as chips. `updated` displays an update date and fills `article:modified_time`. `image` overrides the social preview image for this page.

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
