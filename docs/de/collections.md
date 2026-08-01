---
title: Inhaltssammlungen
navTitle: Collections
section: Start
order: 4
description: Markdown- und benutzerdefinierte Seiten in getrennte Bereiche gliedern und dabei Suche, Assistent, MCP-Server und Deployment gemeinsam verwenden.
tags: [collections, routing, search]
updated: 2026-07-28
---

# Inhaltssammlungen

Collections fassen zusammengehörige Dokumentationsbereiche in einer Fibel-Instanz zusammen, beispielsweise Produktanleitungen und eine Komponentenreferenz. Jeder Bereich besitzt einen eigenen Markdown-Ordner und eine eigene Seitennavigation. Suche, Assistent, MCP, Theme, Header und Deployment bleiben gemeinsam.

Getrennte Fibel-Instanzen eignen sich weiterhin, wenn Bereiche unabhängige Suchindizes, Assistant-Sitzungen, Plugins oder Betriebsgrenzen benötigen.

## Collections auf dieser Website ansehen

Diese Fibel-Website ist selbst ein Collection-Beispiel. **Docs** enthält die
Anleitungen unter `/de/docs`. Die getrennte Collection **Blog Demo** enthält
normale Markdown-Beiträge unter `/de/blog`; nur ihre Startseite wird durch
`blogPlugin({ collection: "blog" })` zu einem nach Datum sortierten Feed mit
Jahresnavigation.

Beide Bereiche gehören weiterhin zu einer Fibel-Instanz. Sie teilen Header,
Suche, Assistent, MCP-Server, Theme und Deployment, besitzen aber getrennte
Content-Ordner und Sidebars. Die Collection-Links oberhalb der Sidebar wechseln
zwischen beiden Bereichen; **Everything** in der Suche durchsucht beide.

## Collections konfigurieren

An die Stelle des übergeordneten `content`-Ordners tritt eine Collection-Liste:

```ts
import { defineFibel } from "@k2b/fibel";

export default defineFibel({
  title: "Cloud",
  description: "Produktdokumentation und Komponentenreferenz für Cloud.",
  routing: {
    basePath: "/docs",
  },
  locales: [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
  ],
  defaultLocale: "en",
  collections: [
    {
      id: "docs",
      label: "Docs",
      description: "Produktanleitungen und Konfigurationsreferenz.",
      content: "content/docs",
    },
    {
      id: "ui",
      label: "UI",
      description: "Komponenten, Eigenschaften und Verwendungsbeispiele.",
      content: "content/ui",
    },
  ],
  defaultCollection: "docs",
});
```

Jeder Inhaltsordner behält die normale Locale-Struktur:

```txt
content/
├── docs/
│   ├── en/
│   │   ├── index.md
│   │   └── configuration.md
│   └── de/
│       ├── index.md
│       └── configuration.md
└── ui/
    ├── en/
    │   ├── index.md
    │   └── button.md
    └── de/
        ├── index.md
        └── button.md
```

`path` verwendet standardmäßig `/<id>`. Ein abweichender öffentlicher Pfad kann ausdrücklich angegeben werden:

```ts
{
  id: "components",
  label: "UI",
  content: "content/ui",
  path: "/catalog/ui",
}
```

Collection-IDs müssen eindeutige Slug-Werte sein. Pfade müssen eindeutige, nicht überlappende absolute Pfade aus Slug-Segmenten sein. Ein Collection-Pfad darf nicht mit einer konfigurierten Locale, dem internen Route-Segment oder dem Assets-Route-Segment beginnen.

## Collection-URLs

Kanonische Seiten-URLs folgen dieser Reihenfolge:

```txt
{basePath}/{locale}/{collectionPath}/{pageSlug}
```

Die Beispielkonfiguration erzeugt:

```txt
/docs/en/docs
/docs/en/docs/configuration
/docs/de/ui/button
```

Sprachneutrale Collection-URLs dienen als Einstiegspunkte und sind keine kanonischen Seiten:

```txt
/docs/ui/button → /docs/de/ui/button
```

Fibel bestimmt die Zielsprache zunächst über das gespeicherte `fibel_locale`-Cookie, danach über den Request-Header `Accept-Language` und zuletzt über `defaultLocale`. Die Weiterleitung verwendet `302` und erhält Query-Parameter. Der Aufruf einer kanonischen Seite aktualisiert das Locale-Cookie. `/docs/en` leitet zur Standard-Collection weiter.

Unbekannte Collection-Pfade liefern `404`. Fibel leitet aus einem beliebigen Seiten-Slug keine Collection ab.

## Benutzerdefinierte und Solid-Seiten hinzufügen

`collection` ordnet eine benutzerdefinierte Seite zu. Ohne Angabe gilt `defaultCollection`.

```tsx
import { solidPage } from "@k2b/fibel/solid";

const panelHeaderPage = solidPage({
  html,
  collection: "ui",
  path: "/panel-header",
  title: "PanelHeader",
  description: "Ein einheitlicher Bereich für Überschrift und Aktionen.",
  context: panelHeaderMarkdown,
  component: ({ context }) => (
    <PanelHeaderShowcase documentation={context.html} />
  ),
});
```

Mit der vorherigen Konfiguration liegt diese Seite unter `/docs/en/ui/panel-header`. Das `context`-Markdown fließt wie reguläres Collection-Markdown in Suche, rohe Markdown-Routen, Assistent, MCP und `llms.txt` ein.

## Collections durchsuchen

Die Sidebar zeigt ausschließlich die Navigation der aktiven Collection. Bei mehreren Collections wechseln Links oberhalb der Sidebar zwischen ihren Startseiten.

Die Suche startet in der aktuellen Collection. Der Suchdialog bietet **Everything** und einen Scope pro Collection. Der interne Endpunkt akzeptiert denselben optionalen Filter:

```txt
/docs/_fibel/search?locale=en&collection=ui&q=button
```

Ohne `collection` werden alle Collections der gewählten Sprache durchsucht.

## Assistent, MCP und Discovery

Der Assistent erhält ID, Label und Beschreibung der aktuellen Collection als vertrauenswürdigen Kontext. Sein Tool `search_docs` durchsucht standardmäßig die aktuelle Collection und akzeptiert alternativ eine andere Collection-ID oder `all`.

Ein MCP-Server für eine Instanz mit Collections ergänzt `list_collections`. Dessen Tool `search_docs` akzeptiert optional `collection`; ohne Angabe gilt die gesamte Fibel-Instanz. `read_doc` liest weiterhin genau eine kanonische Seiten-URL.

Globale `llms.txt`-Dateien beschreiben die Instanz und verlinken alle Collections. Zusätzlich stehen Collection-spezifische Dateien bereit:

```txt
/docs/en/llms.txt
/docs/en/ui/llms.txt
/docs/en/ui/llms-full.txt
```

Sitemap, Sprachalternativen, Canonical-Tags und rohe Markdown-URLs verwenden die kanonische Route mit Locale und Collection.

Agent Skills sind unabhängig von Locales und Collections. Ein konfiguriertes
`agentSkillsPlugin()` veröffentlicht einen origin-weiten Skill-Index für die
gesamte Fibel-Instanz. Der Skill kann für exakte Collection-spezifische Details
den gemeinsamen MCP-Server und dessen Tool `list_collections` verwenden.

## Bestehende Sites bleiben unverändert

Collections sind optional. Eine Konfiguration ohne `collections` liest weiterhin den übergeordneten `content`-Ordner und behält Routen wie `/docs/en/configuration`. Collection-Segment, Scope-Auswahl, MCP-Tool und Collection-spezifische Discovery-Routen werden dann nicht ergänzt.
