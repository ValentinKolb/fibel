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

Plugins erweitern Fibel an klaren Stellen: vor dem Laden der Inhalte, vor und nach dem Rendern der Seiten sowie beim Registrieren zusätzlicher Routen. Damit lassen sich Projektregeln, eigene Endpunkte und alternative Implementierungen ergänzen, ohne den Kern zu verändern.

## Plugin-Form

```ts
import type { FibelPlugin } from "@k2b/fibel";

export function projectPlugin(): FibelPlugin {
  return {
    name: "project-plugin",
    setup(context) {},
    transformContent(context) {},
    afterContent(context) {},
    routes(context) {
      return [];
    },
  };
}
```

`setup` läuft vor dem Laden der Markdown-Dateien und dient dem Ersetzen oder Umschließen von Services.

`transformContent` läuft, nachdem alle Markdown- und Custom-Seiten geladen wurden, aber bevor Markdown und Navigation gerendert werden. Der Hook eignet sich für kleine Metadaten-Transformationen, die Rendering, Suche und spätere Plugins sehen sollen.

`afterContent` läuft nach dem Laden und Rendern der Seiten und eignet sich für Validierung, Indizes oder abgeleitete Metadaten.

`routes` ergänzt Fetch-Routen, etwa für generierte Dateien, interne Endpunkte oder projektspezifische APIs.

## Service umschließen

Dieses Beispiel ergänzt vor jedem Markdown-Dokument einen Hinweis und nutzt danach den bestehenden Markdown-Renderer.

```ts
import type { FibelPlugin } from "@k2b/fibel";

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
import type { FibelPlugin } from "@k2b/fibel";

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
import type { FibelPlugin } from "@k2b/fibel";

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

Ein `path`, der auf `/*` endet, wird als Präfix statt exakt abgeglichen. Das Assets-Plugin liefert damit ein ganzes Verzeichnis aus. Mit `scope: "internal"` ist eine Route nur unter `routing.internalPath` erreichbar, mit `scope: "public"` nur unter dem öffentlichen Pfad. `scope: "origin"` prüft den Request-Pfad, bevor `routing.basePath` entfernt wird, und ist für domain-weite Protokolle wie Agent-Skills-Discovery vorgesehen. Routen ohne Scope behalten das bestehende Verhalten und passen auf öffentliche und interne Pfade, niemals jedoch auf Origin-Pfade.

Eine Origin-Route funktioniert automatisch, wenn Fibel den vollständigen
Fetch-Handler besitzt. Ein Host, der Fibel unter einem Subrouter einbindet,
muss den Origin-Pfad separat an `fibel.fetch` weiterleiten.

Eigene Routenpfade sollten nicht mit internen Routen oder Seitenpfaden kollidieren.

## Head-Tags hinzufügen

`context.headTags` sammelt Funktionen, die Markup in den `<head>` jeder Seite rendern. Jede Funktion bekommt die aktuelle Seite und den Context, Tags können also pro Seite und pro Sprache unterschiedlich ausfallen.

```ts
import type { FibelPlugin } from "@k2b/fibel";

export function analyticsPlugin(siteId: string): FibelPlugin {
  return {
    name: "analytics",
    setup(context) {
      context.headTags.push(() => `<script defer data-site="${siteId}" src="https://example.com/a.js"></script>`);
    },
  };
}
```

Ein leerer Rückgabewert überspringt die jeweilige Seite. Das eingebaute SEO-Plugin nutzt diesen Hook für Sprachalternativen, Social Cards und strukturierte Daten.

## Body-Einträge hinzufügen

`context.bodyItems` funktioniert wie `headTags`, rendert Markup aber nach dem Seiten-Shell und vor Fibels Client-Script. Der Hook eignet sich für optionale Overlays oder Launcher, die aktuelle Seite und Sprache benötigen. Ein leerer Rückgabewert überspringt die jeweilige Seite.

## Mit Defaults kombinieren

Die meisten Projekte hängen eigene Plugins an das Standard-Set an.

```ts
import { defineFibel, defaultPlugins } from "@k2b/fibel";
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
  footerItems: string[];
  headTags: HeadTag[];
  bodyItems: BodyItem[];
  searchIndex: SearchEntry[];
  routes: FibelRoute[];
  services: FibelServices;
};
```

Der Context ist die gemeinsame Arbeitsfläche der Plugins. Er enthält Konfiguration, geladene Seiten, Navigation, Footer- und Body-Einträge, Head-Tags, Suchdaten, registrierte Routen und austauschbare Services.

Alle auf dieser Seite gezeigten Typen sind als Type-Import aus `@k2b/fibel` verfügbar.

## Service-Referenz

Vier Services lassen sich in `setup` ersetzen oder umschließen. Ein Ersetzen ändert das Verhalten, ein Umschließen erweitert es.

```ts
type FibelServices = {
  renderMarkdown: (markdown: string, page: FibelPage, context: FibelContext) => string;
  renderPage: (page: FibelPage, request: Request, context: FibelContext) => string;
  getTheme: (request: Request, context: FibelContext) => ThemeMode;
  search: (query: string, locale: string, context: FibelContext) => SearchEntry[];
};
```

`renderMarkdown` wandelt Seiteninhalte in HTML um und läuft einmal pro Seite beim Start. `renderPage` erzeugt das vollständige HTML-Dokument für einen Request. `getTheme` bestimmt das Theme vor dem Rendern. `search` beantwortet Anfragen des Suchendpunkts.

Die Standardimplementierungen stecken im Markdown-, Layout-, Theme- und Search-Plugin. Fehlt eines davon in der Plugin-Liste, bleibt der jeweilige Service bei seiner wirkungslosen Vorbelegung.
