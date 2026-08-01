---
title: Search
navTitle: Search
section: Built-in plugins
order: 30
description: The search plugin builds an index from Markdown content and exposes an endpoint for spotlight search.
tags: [search, spotlight, plugin]
updated: 2026-06-09
---

# Search

The search plugin makes documentation searchable without turning the whole website into a client-side app. The index is built from Markdown pages when the app starts. The interface queries a server endpoint while the reader types.

## Endpoint

The search endpoint is served under the internal path.

```txt
/_fibel/search?locale=en&q=config
```

When Fibel runs under `/docs`, the endpoint is served at `/docs/_fibel/search`.

Collection-enabled sites accept an optional collection ID:

```txt
/docs/_fibel/search?locale=en&collection=ui&q=button
```

Omit `collection` to search every collection in the locale.

## Indexed content

The index includes:

- Page title.
- Page description.
- Sidebar section.
- Markdown text of the page.

For custom pages, optional `content` Markdown is indexed instead of rendered component HTML. Search entries also carry their collection ID and label when collections are configured.

Search is locale-aware. An English query searches English pages. A German query searches German pages.

## Spotlight interface

The default layout opens search from the header search button, `/`, or `Mod+K`. Results update without a full page reload. Arrow keys move the selection, and Enter opens the active result.

With collections, search starts in the current collection. Scope buttons switch between **Everything** and individual collections without leaving the dialog.

## Project customization

Projects can replace the search plugin when they need another index, an external search system, or different ranking rules. As long as the layout queries the same endpoint, the interface can stay unchanged.

## Markdown sources

Every page is also available as Markdown, for example `/en/search.md`. The Copy Markdown button copies that URL. This is useful for LLMs, support workflows, and review processes.
