---
name: fibel
description: Build, configure, debug, or extend Fibel documentation sites using @k2b/fibel. Use for fibel.config.ts, Markdown collections, custom SSR pages, plugins, search, themes, the documentation assistant, MCP, Agent Skills discovery, or mounting Fibel in another Fetch or Hono application.
---

# Fibel

Fibel is a config-first documentation runtime for Bun. It turns localized
Markdown and optional host-rendered pages into a Web-standard Fetch app with
navigation, search, raw Markdown routes, `llms.txt`, SEO, and optional AI
integrations.

Reply in the user's language unless they request another language. Keep code,
configuration keys, and commit messages in English.

## Establish the current contract

Inspect the project before suggesting changes:

```sh
sed -n '1,240p' package.json
sed -n '1,280p' fibel.config.ts
find docs -maxdepth 3 -type f | sort
```

When working inside Fibel itself, also inspect:

```sh
sed -n '1,280p' src/types.ts
sed -n '1,280p' src/config.ts
sed -n '1,220p' src/plugins/index.ts
```

Prefer local source and installed package types over this overview. When a
Fibel MCP server is available, use `search_docs` to find the relevant subject
and `read_doc` to load the exact current Markdown. For collection-based sites,
use `list_collections` when the appropriate scope is unclear.

## Package and commands

Use `@k2b/fibel` for the root API, `@k2b/fibel/plugins` for plugins,
`@k2b/fibel/layout` for the framework-neutral header renderer, and
`@k2b/fibel/solid` for the optional Solid bridge.

```sh
bunx --bun @k2b/fibel dev
bunx --bun @k2b/fibel build
bun run typecheck
bun test
```

## Minimal configuration

```ts
import { defineFibel } from "@k2b/fibel";

export default defineFibel({
  title: "Product Docs",
  description: "Documentation for Product.",
  siteUrl: "https://docs.example.com",
  content: "docs",
  locales: [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
  ],
  defaultLocale: "en",
  routing: {
    basePath: "/docs",
    internalPath: "/_fibel",
    assetsPath: "/assets",
  },
});
```

`content` defaults to `docs`, `assets` to `assets`, and `root` to the current
working directory. Keep `routing.basePath` aligned with the host mount path.
Every locale has its own directory, such as `docs/en/index.md`.

## Content and collections

Markdown frontmatter controls navigation and metadata:

```md
---
title: Configuration
navTitle: Configuration
section: Start
order: 20
description: Configure the documentation site.
tags: [config, routing]
---

# Configuration
```

Use collections when related areas should share one deployment, header, search,
assistant, MCP server, and plugin set while keeping separate sidebars:

```ts
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
```

Each collection content directory contains the normal locale directories.
Canonical routes are `{basePath}/{locale}/{collectionPath}/{pageSlug}`.

Turn one Markdown collection into a date-sorted editorial feed with the
optional blog plugin:

```ts
import { blogPlugin } from "@k2b/fibel/plugins";

plugins: [...defaultPlugins(), blogPlugin({ collection: "blog" })],
```

Blog posts require `date` frontmatter and may set `authors`. Content before
`<!-- truncate -->` becomes the feed excerpt; otherwise Fibel uses the
description. Do not add an `index.md` to that collection because the plugin
owns its root. Posts remain available to search, Assistant, MCP, raw Markdown,
and `llms.txt`.

## Custom application pages

Use `pages` when the visible body comes from the host application but search
and agents still need explicit Markdown knowledge:

```ts
pages: [
  {
    path: "/panel-header",
    collection: "ui",
    title: "PanelHeader",
    description: "A consistent heading and action area.",
    content: panelHeaderMarkdown,
    render: ({ content }) => `<section>${content.html}</section>`,
  },
],
```

`content` is the canonical custom-page knowledge field. The deprecated
`context` definition and render aliases still work with migration warnings;
do not use them in new code.

Use `solidPage()` from `@k2b/fibel/solid` for Solid server components or
`@k2b/ssr` islands. The host owns its SSR renderer and route.

## Optional agent integrations

Append optional plugins after `defaultPlugins()`:

```ts
import { defaultPlugins, defineFibel } from "@k2b/fibel";
import {
  agentSkillsPlugin,
  assistantPlugin,
  mcpPlugin,
  providerFromEnv,
} from "@k2b/fibel/plugins";

export default defineFibel({
  title: "Product Docs",
  plugins: [
    ...defaultPlugins(),
    mcpPlugin(),
    agentSkillsPlugin({ directory: "skills" }),
    assistantPlugin({ provider: providerFromEnv() }),
  ],
});
```

- `mcpPlugin()` exposes visible Markdown through read-only documentation tools.
- `assistantPlugin()` answers from visible documentation and has bounded
  in-memory limits by default; keep provider credentials server-side.
- `agentSkillsPlugin()` publishes self-contained `skills/*/SKILL.md` files at
  `/.well-known/agent-skills/`. Each directory name must match the skill's
  frontmatter `name`.

With the default layout, `mcpPlugin()` alone adds an **MCP** footer item and
`agentSkillsPlugin()` adds **Agents**. When both are active, one **Agents**
dialog combines the Vercel Skills CLI install command with the Codex, Claude
Code, OpenCode, and Other MCP setup. The skill provides compact workflow
guidance; MCP supplies exact current documentation. Plugin order does not
change the result.

When `assistantPlugin()` is active, it automatically receives trusted setup
metadata for the enabled Agent Skills and MCP plugins. It derives the Skills
CLI command from the current request origin and the MCP endpoint from resolved
routing. Omitted integrations are not described and require no opt-out.

Agent Skills discovery is origin-scoped, not `basePath`-scoped. A standalone
Fibel server receives root requests automatically. When Fibel is mounted below
a Hono subrouter, forward both the public mount and the well-known route:

```ts
app.all("/.well-known/agent-skills/*", (c) =>
  fibel.fetch(c.req.raw),
);
app.all("/docs/*", (c) => fibel.fetch(c.req.raw));
```

Only one Fibel instance can own the well-known route on an origin. Prefer one
collection-based instance or explicitly choose the discovery owner.

## Verification

Verify the smallest affected surface first, then the complete package:

```sh
bun run typecheck
bun test
bun run build
```

For Agent Skills discovery, also check the site as a real consumer:

```sh
bunx skills add https://docs.example.com
bunx skills add https://docs.example.com --list
```

These commands use the open-source Vercel Skills CLI. Test the deployed
website origin because discovery is not scoped below `routing.basePath`.

Do not claim a release from a passing local build. A release additionally
requires the requested version change, exact-SHA CI, tag and push, registry
publication, and a fresh consumer check.
