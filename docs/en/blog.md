---
title: Blog collections
navTitle: Blog
section: Content
order: 28
description: Publish a date-sorted editorial feed from a normal Markdown collection without creating a second content pipeline.
tags: [blog, collections, markdown]
updated: 2026-08-01
---

# Blog collections

`blogPlugin()` turns one existing collection into a blog. The collection keeps
the normal Fibel routes and sidebar, while its root page becomes an editorial
feed sorted by publication date.

## Configure the collection

```ts
import { defaultPlugins, defineFibel } from "@k2b/fibel";
import { blogPlugin } from "@k2b/fibel/plugins";

export default defineFibel({
  title: "Product",
  collections: [
    { id: "docs", label: "Docs", content: "content/docs" },
    {
      id: "blog",
      label: "Blog",
      description: "News and field notes from the product team.",
      content: "content/blog",
    },
  ],
  defaultCollection: "docs",
  plugins: [...defaultPlugins(), blogPlugin({ collection: "blog" })],
});
```

Do not add an `index.md` to the blog collection. The plugin owns the collection
root and generates its feed from the posts.

## Write posts

Each post is a normal localized Markdown file. `date` is required; `authors`
and all regular Fibel metadata remain optional.

```md
---
title: A small release
description: What changed and why it matters.
date: 2026-08-01
authors: [Ada Lovelace, Grace Hopper]
tags: [release, notes]
---

# A small release

This paragraph appears in the feed.

<!-- truncate -->

The complete post continues here.
```

With locales `en` and `de`, place translations at matching paths such as
`content/blog/en/small-release.md` and `content/blog/de/small-release.md`.
Fibel uses the current locale for dates and language switching.

## One source for every consumer

The plugin changes presentation, not storage. Search indexes the complete post,
the Assistant and MCP read its Markdown, raw `.md` routes keep working, and the
collection-specific `llms.txt` includes the same pages. The generated feed uses
content before `<!-- truncate -->`; without a marker it falls back to the
frontmatter description.
