---
title: Agent-Skills-Discovery
navTitle: Agent Skills
section: Integrierte Plugins
order: 30
description: Veröffentlicht eigenständige Agent Skills aus einem Verzeichnis über den origin-weiten Well-known-Endpunkt.
tags: [agent-skills, coding-agenten, plugin]
updated: 2026-07-29
---

# Agent-Skills-Discovery

Das optionale Agent-Skills-Plugin veröffentlicht wiederverwendbare Anweisungen
für Coding-Agenten direkt über eine Fibel-Website. Es folgt dem
Agent-Skills-Discovery-Format. Kompatible Clients können Skills dadurch finden
und installieren, ohne das Quell-Repository zu klonen.

Agent Skills ergänzen [MCP](/de/mcp): Ein Skill liefert kompakte Arbeitsabläufe
und Orientierung, während MCP bei Bedarf die exakte aktuelle Dokumentation
bereitstellt.

## Verzeichnisstruktur

Das Plugin erhält ein Verzeichnis relativ zu `root`:

```txt
skills/
  product-docs/
    SKILL.md
```

Jeder direkte Unterordner beschreibt einen Skill. Seine `SKILL.md` benötigt
Frontmatter mit `name` und `description`:

```md
---
name: product-docs
description: Build and maintain Product documentation with Fibel.
---

# Product documentation

Use the Product MCP server for exact API details.
```

Der Verzeichnisname muss `name` entsprechen. Namen bestehen aus
Kleinbuchstaben, Ziffern und einzelnen Bindestrichen und sind höchstens 64
Zeichen lang. Beschreibungen enthalten höchstens 1024 Zeichen.

Das aktuelle Plugin unterstützt bewusst nur eigenständige `SKILL.md`-Dateien.
Ein danebenliegendes `references`-, `scripts`- oder `assets`-Element benötigt
eine Archiv-Distribution. Fibel bricht deshalb beim Start ab, statt einen
unvollständigen Skill zu veröffentlichen.

Ein Skill ist ein einzelnes, nicht lokalisiertes Artefakt und wird nicht pro
Fibel-Locale dupliziert. Fibels eigener Skill ist Englisch und weist den
Agenten an, in der Sprache des Nutzers zu antworten. Das Plugin transportiert
die geschriebene Datei und übersetzt oder erkennt ihre Sprache nicht.

## Discovery aktivieren

`agentSkillsPlugin()` wird nach den Standard-Plugins ergänzt:

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

Fibel liest und validiert das Verzeichnis beim Start. Discovery-Index und
Skill-Artefakte sind deterministisch und enthalten die vorgeschriebenen
SHA-256-Digests:

```txt
/.well-known/agent-skills/index.json
/.well-known/agent-skills/product-docs/SKILL.md
```

Beide Endpunkte sind öffentlich, schreibgeschützt und werden fünf Minuten
gecacht.

## Agent-Einrichtung im Footer

Mit dem Standard-Layout ergänzt das Plugin den Eintrag **Agents** im Footer.
Der Dialog zeigt den Befehl für den Website-Origin mit der
[Open-Source-Skills-CLI von Vercel](https://github.com/vercel-labs/skills).

Ist zusätzlich `mcpPlugin()` aktiv, enthält derselbe Dialog die vorhandene
MCP-Einrichtung für Codex, Claude Code, OpenCode und andere Clients. Der Skill
liefert dem Agenten kompakte Arbeitsanweisungen; MCP ermöglicht die Suche und
das Lesen der exakten aktuellen Dokumentation. Die Reihenfolge der Plugins
ändert den Dialog nicht. Ohne MCP entstehen keine leeren MCP-Elemente.

## Einbindung unter einem Base Path

Agent-Skills-Discovery gehört zum Origin und ignoriert deshalb bewusst
`routing.basePath`. Ein eigenständiger Fibel-Server erhält alle
Origin-Anfragen; dort ist keine zusätzliche Konfiguration erforderlich.

Bindet ein Host Fibel unter einem Hono-Subrouter ein, muss er die
Well-known-Route separat weiterleiten:

```ts
const fibel = await createFibelApp(config);

app.all("/.well-known/agent-skills/*", (c) =>
  fibel.fetch(c.req.raw),
);
app.all("/docs/*", (c) => fibel.fetch(c.req.raw));
```

Leitet der Host ausschließlich `/docs/*` weiter, kann Fibel keine Anfragen an
den Origin-Root erhalten. Das ist eine Zuständigkeitsgrenze des Routers und
keine Fibel-Einstellung.

Nur eine Fibel-Instanz sollte auf einem Origin
`/.well-known/agent-skills/*` besitzen. Für zusammengehörige
Dokumentationsbereiche eignet sich eine Instanz mit
[Collections](/de/collections). Andernfalls wird genau eine Instanz als
Discovery-Owner ausgewählt.

## Installieren und prüfen

Die Vercel Skills CLI erhält die vollständige Website-URL:

```sh
bunx skills add https://docs.example.com
bunx skills add https://docs.example.com --list
bunx skills add https://docs.example.com --skill product-docs
```

Der erste Befehl öffnet die normale interaktive Installation. `--list` prüft
Discovery ohne Installation; `--skill` wählt einen veröffentlichten Skill
direkt aus. Geprüft wird der bereitgestellte Origin und nicht nur die
Fibel-Seite unter ihrem Base Path.
