---
title: Agent Skills discovery
navTitle: Agent Skills
section: Built-in plugins
order: 30
description: Publish self-contained Agent Skills from a directory at the origin-level well-known discovery endpoint.
tags: [agent-skills, coding-agents, plugin]
updated: 2026-07-29
---

# Agent Skills discovery

The optional Agent Skills plugin publishes reusable instructions for coding
agents directly from a Fibel website. It follows the Agent Skills discovery
format, so a compatible client can find and install the skills without cloning
the source repository.

Agent Skills complement [MCP](/en/docs/mcp): a skill provides compact workflow and
orientation instructions, while MCP supplies exact current documentation when
the agent needs details.

## Directory layout

Give the plugin one directory relative to `root`:

```txt
skills/
  product-docs/
    SKILL.md
```

Each immediate child directory represents one skill. Its `SKILL.md` needs
`name` and `description` frontmatter:

```md
---
name: product-docs
description: Build and maintain Product documentation with Fibel.
---

# Product documentation

Use the Product MCP server for exact API details.
```

The directory name must equal `name`. Names use lowercase letters, digits, and
single hyphens and contain at most 64 characters. Descriptions contain at most
1024 characters.

The current plugin intentionally supports self-contained `SKILL.md` files only.
A sibling `references`, `scripts`, or `assets` entry requires archive
distribution and therefore fails startup instead of publishing a broken skill.

A skill is one unlocalized artifact rather than one file per Fibel locale.
Fibel's own bundled skill is written in English and instructs the agent to
answer in the user's language. The plugin transports the authored file and
does not translate or detect its language.

## Enable discovery

Append `agentSkillsPlugin()` after the default plugins:

```ts
import { defaultPlugins, defineFibel } from "@k2b/fibel";
import { agentSkillsPlugin } from "@k2b/fibel/plugins";

export default defineFibel({
  title: "Product Docs",
  plugins: [
    ...defaultPlugins(),
    agentSkillsPlugin({ directory: "skills" }),
  ],
});
```

Fibel reads and validates the directory at startup. The discovery index and
skill artifacts are deterministic and include the required SHA-256 digests:

```txt
/.well-known/agent-skills/index.json
/.well-known/agent-skills/product-docs/SKILL.md
```

Both endpoints are public, read-only, and cached for five minutes.

## Agent setup in the footer

With the default layout, the plugin adds an **Agents** item to the footer. The
dialog shows the website-origin command for the
[open-source Vercel Skills CLI](https://github.com/vercel-labs/skills).

When `mcpPlugin()` is also active, the same dialog adds the existing MCP setup
tabs for Codex, Claude Code, OpenCode, and Other clients. The skill gives the agent
compact workflow guidance, while MCP lets it search and read exact current
documentation. Plugin order does not affect the dialog. Without MCP, no empty
MCP controls are rendered.

## Mounting below a base path

Agent Skills discovery belongs to the origin and deliberately ignores
`routing.basePath`. A standalone Fibel server receives every origin request,
so no extra configuration is necessary.

When a host mounts Fibel below a Hono subrouter, it must forward the well-known
route separately:

```ts
const fibel = await createFibelApp(config);

app.all("/.well-known/agent-skills/*", (c) =>
  fibel.fetch(c.req.raw),
);
app.all("/docs/*", (c) => fibel.fetch(c.req.raw));
```

If the host forwards only `/docs/*`, Fibel cannot receive root-level discovery
requests. This is a router ownership boundary rather than a Fibel setting.

Only one Fibel instance should own `/.well-known/agent-skills/*` on an origin.
For related documentation areas, prefer one instance with
[collections](/en/docs/collections). Otherwise, explicitly choose one instance as
the discovery owner.

## Install and verify

Use the full website URL with the Vercel Skills CLI:

```sh
bunx skills add https://docs.example.com
bunx skills add https://docs.example.com --list
bunx skills add https://docs.example.com --skill product-docs
```

The first command opens the normal interactive installation. `--list` verifies
discovery without installing anything; `--skill` selects one published skill
directly. Test the deployed origin, not only the Fibel page below its base
path.
