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

## Footer links

```ts
export default defineFibel({
  title: "My Docs",
  footerLinks: [
    { label: "Imprint", value: "/en/imprint" },
    { label: "GitHub", value: "https://github.com/example/docs" },
  ],
});
```

Each link has a `label` and a `value`. Relative values are resolved under the configured base path. Absolute `https:`, `mailto:`, `tel:`, and hash links are used as written.

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
```

`title` is the page title. `navTitle` is the sidebar label. `section` selects the sidebar group. `order` sorts pages within a locale. `description` is used for SEO, search, and the intro. `hidden` removes a page from navigation and pagination. `tags` are displayed as chips. `updated` displays an update date.

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
