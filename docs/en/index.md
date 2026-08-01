---
title: Fibel
navTitle: Overview
section: Start
order: 1
description: Fibel publishes Markdown and host-rendered application pages in one documentation shell with search, multilingual routing, and Markdown sources for tools.
tags: [overview, markdown, docs]
updated: 2026-07-26
---

# Fibel

Fibel reads Markdown from a content directory and serves it as a website. The source files remain readable in the repository, and every page is additionally available as raw Markdown, so reviewers, scripts, and language models work from the same source the site is built from.

Every built-in capability is a plugin: Markdown rendering, layout, search, theme handling, i18n checks, and SEO output. The default set can be extended, individual plugins can be replaced, and the list can be assembled from scratch. Rendering, navigation, search, and routing therefore remain under project control rather than fixed by the framework.

Fibel runs on Bun and is configured in a single file. Markdown content requires no build step. Applications can additionally place custom server-rendered pages and optional Solid islands inside the same shell while keeping explicit Markdown content for search and tools.

## Quick start

```sh
bunx --bun @k2b/fibel init
bunx --bun @k2b/fibel dev
```

`init` creates `fibel.config.ts`, a first page under `docs/en/`, and an `assets/` directory. `dev` serves the project and reloads the browser when a file changes. The development server prints its URL on startup.

Fibel moved from `@valentinkolb/fibel` to `@k2b/fibel` in `v0.2.0`. Existing projects need to replace root imports with `@k2b/fibel`, plugin imports with `@k2b/fibel/plugins`, and CLI commands with `bunx --bun @k2b/fibel`. The previous package is deprecated.

Projects worked on by coding agents should also install the English Fibel
Agent Skill directly from this website with the
[open-source Vercel Skills CLI](https://github.com/vercel-labs/skills):

```sh
bunx skills add https://fibel.dev
```

It provides a concise workflow and uses the public Fibel MCP server for exact
current details. The agent still answers in the user's language.

## Capabilities

- Pages generated from `docs/<locale>/**/*.md`, with navigation, sections, and pagination derived from frontmatter.
- Custom server-rendered pages with searchable Markdown content and an optional Solid SSR bridge.
- Server-side search with a spotlight dialog, opened with `/` or `Mod+K`.
- Native language routes and a language switcher that preserves the current page.
- Light and dark mode resolved on the server, so the first paint is already correct.
- Canonical URLs, `hreflang` alternates, a sitemap, and structured data for search engines.
- `llms.txt` and raw `.md` routes for tools that read documentation directly.
- A plugin API for replacing or extending any built-in behavior.

## Machine-readable output

Documentation is increasingly processed by tools rather than read in a browser. Fibel exposes every page in a form those tools can consume, without a separate export step:

```txt
/en/configuration        the rendered page
/en/configuration.md     the Markdown source
/llms.txt                an index of all pages, grouped by section
/llms-full.txt           the complete documentation in a single file
```

These are stable URLs, not file downloads. Pages excluded from navigation are excluded here as well.

## Project structure

A Fibel project consists of a config file and a content directory. Assets are optional.

```txt
fibel.config.ts
docs/
  en/
    index.md
    configuration.md
  de/
    index.md
    configuration.md
assets/
```

Each locale has its own directory. `docs/en/configuration.md` is served as `/en/configuration` and as `/en/configuration.md`. Pages sharing a slug across locales are treated as translations of one another, which determines both the language switcher and the `hreflang` output.

## Page model

A page consists of frontmatter and Markdown content.

```md
---
title: Configuration
navTitle: Configuration
section: Start
order: 2
description: Configure routes, locales, assets, theme, and plugins.
tags: [config, routing]
updated: 2026-06-09
---

# Configuration
```

Frontmatter controls metadata, navigation, and the chips below the page title. All fields are optional: in the absence of `title` Fibel falls back to the first `#` heading, and in the absence of `description` to the first paragraph. The layout renders the title once and omits the first `#` heading from the body, so it never appears twice.

## Next steps

[Configuration](/en/docs/configuration) covers project setup. [Hosting](/en/docs/runtime) describes running Fibel as a server or mounting it inside an existing application. [SEO](/en/docs/seo) documents what search engines and language models receive. [Agent Skills](/en/docs/agent-skills) documents website-based skill installation. [Built-in plugins](/en/docs/built-in-plugins) lists the default capabilities, and [Plugin API](/en/docs/plugins) describes how to extend them.
