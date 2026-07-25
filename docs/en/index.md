---
title: Fibel
navTitle: Overview
section: Start
order: 1
description: Fibel publishes Markdown documentation as a server-rendered website with search, multilingual routing, and Markdown source pages for tools.
tags: [overview, markdown, docs]
updated: 2026-06-09
---

# Fibel

Fibel is for teams that maintain product and developer documentation in a repository and publish it as a website. Content lives in Markdown files. Fibel renders those files into pages with navigation, search, language switching, and stable links to the Markdown source.

The same documentation remains usable in three workflows: code review, browser reading, and tools such as LLMs that consume Markdown directly.

## Use cases

- Documentation should be versioned next to the code.
- Readers need a complete website with navigation, search, and theme support.
- Multilingual pages should keep the same structure across locales.
- LLMs and automation should be able to read Markdown source content directly.
- Projects should be able to run Fibel as a docs app or mount it under a route in an existing app.

## What Fibel provides

- Server-rendered HTML with title, description, and canonical URL.
- Locale folders for multilingual documentation.
- A default theme with light and dark mode.
- Built-in search backed by a server-side index.
- Markdown URLs such as `/en/configuration.md` for tools and review workflows.
- Page actions for copying page and Markdown links.
- Heading anchors for linking to specific sections.
- A plugin system for extending or replacing individual capabilities.

## Project structure

A Fibel site needs a config file and a Markdown folder. Assets are optional.

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

Each locale has its own folder. A page at `docs/en/configuration.md` is served as `/en/configuration`. The same content is available as Markdown at `/en/configuration.md` and `/en/configuration.markdown`.

## Quick start

Create the project files:

```sh
bunx --bun @valentinkolb/fibel init
```

Start the local server:

```sh
bunx --bun @valentinkolb/fibel dev
```

Open the printed URL and edit the Markdown files in the `docs` folder.

## Agent skill

Install the Fibel agent skill in Codex environments that should work on Fibel projects:

```sh
bunx skills add ValentinKolb/fibel
```

The skill gives agents the current Fibel conventions for configuration, Markdown pages, raw `.md` routes, plugins, hosting, and verification.

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

Frontmatter controls metadata, navigation, and page chips. The `title` field is the page title; without it Fibel falls back to the first Markdown `#` heading. Either way the default layout renders that title once and omits the first `#` heading from the article body, so the heading is not repeated.

## Next steps

Read [Configuration](/en/configuration) first when setting up a project. Read [Hosting](/en/runtime) when Fibel should run as a server or inside another app. [Built-in plugins](/en/built-in-plugins) lists what Fibel brings along, and [Plugin API](/en/plugins) explains how to add project-specific behavior.
