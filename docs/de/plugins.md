---
title: Plugin API
navTitle: Plugin API
section: Architektur
order: 20
description: Erweitere Fibel mit Services, Lifecycle-Hooks, Routen, Validierung und projektspezifischen Integrationen.
tags: [plugins, api, erweiterung]
updated: 2026-06-09
---

# Plugin API

Plugins erweitern Fibel an klaren Stellen: vor dem Laden der Inhalte, nach dem Rendern der Seiten und beim Registrieren zusätzlicher Routen. Damit lassen sich Projektregeln, eigene Endpunkte und alternative Implementierungen ergänzen, ohne den Kern zu verändern.

## Plugin-Form

```ts
import type { FibelPlugin } from "@valentinkolb/fibel";

export function projectPlugin(): FibelPlugin {
  return {
    name: "project-plugin",
    setup(context) {},
    afterContent(context) {},
    routes(context) {
      return [];
    },
  };
}
```

`setup` läuft vor dem Laden der Markdown-Dateien. Nutze diesen Hook, um Services zu ersetzen oder zu umschließen.

`afterContent` läuft nach dem Laden und Rendern der Seiten. Nutze diesen Hook für Validierung, Indizes oder abgeleitete Metadaten.

`routes` ergänzt Fetch-Routen. Nutze diesen Hook für generierte Dateien, interne Endpunkte oder projektspezifische APIs.

## Service umschließen

Dieses Beispiel ergänzt vor jedem Markdown-Dokument einen Hinweis und nutzt danach den bestehenden Markdown-Renderer.

```ts
import type { FibelPlugin } from "@valentinkolb/fibel";

export function markdownNoticePlugin(): FibelPlugin {
  return {
    name: "markdown-notice",
    setup(context) {
      const renderMarkdown = context.services.renderMarkdown;

      context.services.renderMarkdown = (markdown, page, ctx) => {
        const notice = `> Diese Seite gehört zu ${ctx.config.title}.\n\n`;
        return renderMarkdown(`${notice}${markdown}`, page, ctx);
      };
    },
  };
}
```

Dieses Muster eignet sich für einheitliche Hinweise, Projekt-Banner oder kleine Anpassungen am Content vor dem Rendern.

## Content validieren

Validierungs-Plugins brechen den Start ab, wenn Inhalte nicht den Projektregeln entsprechen.

```ts
import type { FibelPlugin } from "@valentinkolb/fibel";

export function requireTagsPlugin(): FibelPlugin {
  return {
    name: "require-tags",
    afterContent(context) {
      for (const page of context.pages) {
        if (!page.meta.hidden && page.meta.tags.length === 0) {
          throw new Error(`${page.sourcePath} has no tags.`);
        }
      }
    },
  };
}
```

Sinnvolle Prüfungen sind fehlende Beschreibungen, ungültige Tags, unvollständige Übersetzungen oder Seiten, die nicht veröffentlicht werden sollen.

## Route hinzufügen

Routen erhalten den aktuellen Request und den Fibel-Context. Dieses Beispiel liefert eine kleine JSON-Übersicht aller Seiten.

```ts
import type { FibelPlugin } from "@valentinkolb/fibel";

export function docsManifestPlugin(): FibelPlugin {
  return {
    name: "docs-manifest",
    routes(context) {
      return [
        {
          path: "/manifest.json",
          handler() {
            return Response.json({
              title: context.config.title,
              pages: context.pages.map((page) => ({
                title: page.meta.title,
                href: page.href,
                locale: page.locale.code,
              })),
            });
          },
        },
      ];
    },
  };
}
```

Wähle eigene Routen so, dass sie nicht mit internen Routen oder Seitenpfaden kollidieren.

## Mit Defaults kombinieren

Die meisten Projekte hängen eigene Plugins an das Standard-Set an.

```ts
import { defineFibel, defaultPlugins } from "@valentinkolb/fibel";
import { docsManifestPlugin } from "./plugins/docs-manifest";
import { requireTagsPlugin } from "./plugins/require-tags";

export default defineFibel({
  title: "Product Docs",
  plugins: [
    ...defaultPlugins(),
    requireTagsPlugin(),
    docsManifestPlugin(),
  ],
});
```

Die Reihenfolge ist relevant. Plugins, die Services ersetzen, sollten vor Plugins stehen, die diese Services verwenden. Validierung und zusätzliche Routen können in der Regel nach den Defaults stehen.

## Context-Referenz

```ts
type FibelContext = {
  config: ResolvedFibelConfig;
  pages: FibelPage[];
  nav: Map<string, NavSection[]>;
  searchIndex: SearchEntry[];
  routes: FibelRoute[];
  services: FibelServices;
};
```

Der Context ist die gemeinsame Arbeitsfläche der Plugins. Er enthält Konfiguration, geladene Seiten, Navigation, Suchdaten, registrierte Routen und austauschbare Services.
