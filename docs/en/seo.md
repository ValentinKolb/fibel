---
title: SEO and discovery
navTitle: SEO
section: Built-in plugins
order: 35
description: How Fibel makes documentation findable for search engines and readable for language models.
tags: [seo, sitemap, llms]
updated: 2026-07-25
---

# SEO and discovery

The SEO plugin describes each page for search engines. The llms plugin publishes the same content in a form language models can consume. Both work without configuration, but a published site should set `siteUrl`.

## Set the site URL

```ts
export default defineFibel({
  title: "My Docs",
  siteUrl: "https://docs.example.com",
});
```

`siteUrl` turns canonical URLs, language alternates, structured data, and sitemap entries into absolute URLs. Without it Fibel emits relative paths and crawlers reject the sitemap. Fibel prints a warning at startup when the value is missing.

## Language alternates

Multilingual documentation competes with itself when search engines treat translations as separate pages. Fibel links them instead.

```html
<link rel="alternate" hreflang="en" href="https://docs.example.com/en/configuration">
<link rel="alternate" hreflang="de" href="https://docs.example.com/de/configuration">
<link rel="alternate" hreflang="x-default" href="https://docs.example.com/en/configuration">
```

Pages are matched by slug. `docs/en/configuration.md` and `docs/de/configuration.md` form one group. The `x-default` entry points at the default locale. The same alternates are repeated in the sitemap.

## Sitemap and robots

```txt
/sitemap.xml
/robots.txt
```

The sitemap lists every visible page with an absolute URL, its `updated` date as `lastmod`, and the language alternates. `robots.txt` disallows the internal path and any path listed in `seo.disallow`, then points at the sitemap.

Pages with `hidden: true` are left out of the sitemap and rendered with a `noindex` meta tag.

## Favicon

```ts
export default defineFibel({
  title: "My Docs",
  seo: {
    favicon: "/assets/logo.svg",
  },
});
```

`favicon` is the public URL used by the document's icon link. Fibel writes it as configured, so a host-level path such as `/assets/logo.svg` can be shared by several mounted Fibel instances. Without this option, the built-in Fibel SVG remains available under the instance's internal path.

## Social cards

```ts
export default defineFibel({
  title: "My Docs",
  seo: {
    ogImage: "/assets/social.png",
    twitterSite: "@example",
  },
});
```

Fibel renders Open Graph and Twitter card tags from the page title and description. `ogImage` is the default preview image; a page overrides it with `image` in its frontmatter. Cards switch to the large format when an image is available.

## Structured data

Every indexable page carries JSON-LD with a `TechArticle`. Content pages add a `BreadcrumbList` built from the sidebar section. Locale index pages add a `WebSite` entry instead of the breadcrumbs.

Fibel does not declare a `SearchAction`. That markup promises crawlers a URL that renders search results as a page, and Fibel's search is a JSON endpoint used by the spotlight dialog.

## Routes for language models

```txt
/llms.txt              index for the default locale
/en/llms.txt           index for a specific locale
/llms-full.txt         every page of the default locale in one file
/en/llms-full.txt      every page of a locale in one file
```

The index follows the `llms.txt` convention: a title, a short summary, then the pages grouped by sidebar section. Each entry links to the raw Markdown route with its description, so a model can fetch exactly the page it needs. `llms-full.txt` inlines the Markdown of every page for tools that prefer one request.

Hidden pages are excluded from both.

## Custom head tags

Analytics snippets and verification tags belong in a plugin rather than in a replaced layout. The [Plugin API](/en/docs/plugins) documents the `headTags` hook.
