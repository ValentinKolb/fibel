---
title: Built-in plugins
navTitle: Overview
section: Built-in plugins
order: 25
description: Fibel ships with a default plugin set for Markdown, theme handling, i18n, SEO, assets, search, and layout.
tags: [plugins, built-in]
updated: 2026-06-09
---

# Built-in plugins

Fibel assembles its default behavior from normal plugins. Projects can use that set as-is, append their own plugins, or replace individual responsibilities.

## Default set

```ts
import { defaultPlugins } from "@valentinkolb/fibel";

const plugins = defaultPlugins();
```

The default set includes:

- `markdownPlugin`: renders Markdown to HTML, processes code blocks, and creates heading anchors.
- `themePlugin`: reads the theme cookie and provides the selected theme to the layout.
- `i18nPlugin`: checks whether translated pages exist in the configured locales.
- `seoPlugin`: serves SEO files such as favicon, sitemap, and robots output.
- `assetsPlugin`: serves files from the configured assets folder.
- `searchPlugin`: builds the search index and exposes the search endpoint.
- `layoutPlugin`: renders navigation, page layout, page actions, footer, search dialog, and client script.

## Extend the defaults

Append project plugins to the default set when the built-in behavior should remain active.

```ts
import { defineFibel, defaultPlugins } from "@valentinkolb/fibel";
import { projectLinksPlugin } from "./plugins/project-links";

export default defineFibel({
  title: "Product Docs",
  plugins: [...defaultPlugins(), projectLinksPlugin()],
});
```

This is the right starting point for most projects.

## Replace the defaults

Replace the plugin list when a project owns rendering, layout, search, or routes itself.

```ts
import { defineFibel } from "@valentinkolb/fibel";
import { searchPlugin, themePlugin } from "fibel/plugins";

export default defineFibel({
  title: "Product Docs",
  plugins: [
    customMarkdownPlugin(),
    themePlugin(),
    searchPlugin(),
    customLayoutPlugin(),
  ],
});
```

Fibel does not add omitted plugins automatically. A custom list should include every capability the website needs.

## Routes and ownership

Several built-in plugins own routes. The search plugin owns the search endpoint. The layout plugin serves the client script. The SEO plugin serves SEO files. The assets plugin serves public files.

Custom plugins should choose route paths explicitly. This prevents collisions and keeps documentation predictable under a base path.
