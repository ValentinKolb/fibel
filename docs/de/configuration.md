---
title: Konfiguration
navTitle: Konfiguration
section: Start
order: 2
description: Konfiguriere Content-Ordner, Routen, Locales, Assets, Footer-Links, Frontmatter, Theme und Plugins.
tags: [config, referenz]
updated: 2026-06-09
---

# Konfiguration

`fibel.config.ts` beschreibt das Verhalten der gesamten Dokumentationsseite. Seitenspezifische Angaben gehören in das Frontmatter der jeweiligen Markdown-Datei.

## Minimale Config

```ts
import { defineFibel } from "@valentinkolb/fibel";

export default defineFibel({
  title: "Meine Docs",
  description: "Dokumentation für mein Projekt.",
  siteUrl: "https://example.com",
  locales: [{ code: "de", label: "Deutsch" }],
  defaultLocale: "de",
});
```

`title` wird für Branding und Metadaten verwendet. `description` ist die Standardbeschreibung der Website. `siteUrl` wird für Canonical URLs und SEO-Dateien genutzt.

## Content und Assets

```ts
export default defineFibel({
  title: "Meine Docs",
  content: "docs",
  assets: "assets",
});
```

`content` zeigt auf den Ordner mit Markdown-Dateien. `assets` zeigt auf Dateien, die zusammen mit der Dokumentation ausgeliefert werden, zum Beispiel Bilder, PDFs oder Downloads.

Halte Links in Markdown-Dateien stabil und relativ zur Dokumentation. Das erleichtert den Betrieb unter einem Base Path.

## Routing

```ts
export default defineFibel({
  title: "Meine Docs",
  routing: {
    basePath: "/docs",
    internalPath: "/_fibel",
    assetsPath: "/assets",
  },
});
```

`basePath` ist der öffentliche Pfad der Dokumentation. Setze ihn, wenn Fibel unter einer Sub-Route läuft. `internalPath` ist für generierte Dateien und interne Endpunkte reserviert. `assetsPath` ist der öffentliche Pfad für den Assets-Ordner.

## Locales

```ts
export default defineFibel({
  title: "Meine Docs",
  locales: [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
  ],
  defaultLocale: "de",
});
```

Jedes Locale entspricht einem Ordner unter `docs`. Übersetzungen sollten denselben Slug verwenden. `docs/en/search.md` und `docs/de/search.md` beschreiben also dieselbe Seite in unterschiedlichen Sprachen.

## Footer-Links

```ts
export default defineFibel({
  title: "Meine Docs",
  footerLinks: [
    { label: "Impressum", value: "/de/imprint" },
    { label: "GitHub", value: "https://github.com/example/docs" },
  ],
});
```

Jeder Link besteht aus `label` und `value`. Relative Werte werden unter dem konfigurierten Base Path aufgelöst. Absolute `https:`, `mailto:`, `tel:` und Hash-Links werden unverändert verwendet.

## Frontmatter

Fibel unterstützt flaches Frontmatter mit Textwerten, Zahlen, Wahrheitswerten und einfachen Listen von Textwerten.

```yaml
title: Konfiguration
navTitle: Konfiguration
section: Start
order: 2
description: Konfiguriere Content, Routen, Locales, Assets, Theme und Plugins.
hidden: false
tags: [config, routing]
updated: 2026-06-09
```

`title` ist der Seitentitel. `navTitle` ist das Label in der Sidebar. `section` bestimmt die Sidebar-Gruppe. `order` sortiert Seiten innerhalb eines Locales. `description` wird für SEO, Suche und das Intro genutzt. `hidden` entfernt eine Seite aus Navigation und Pagination. `tags` werden als Chips angezeigt. `updated` zeigt ein Aktualisierungsdatum an.

## Plugin-Liste

Wenn `plugins` nicht gesetzt ist, lädt Fibel das Default-Plugin-Set.

```ts
import { defineFibel, defaultPlugins } from "@valentinkolb/fibel";
import { projectPlugin } from "./plugins/project-plugin";

export default defineFibel({
  title: "Meine Docs",
  plugins: [...defaultPlugins(), projectPlugin()],
});
```

Hänge eigene Plugins an die Defaults an, wenn die integrierten Funktionen erhalten bleiben sollen. Ersetze die Liste nur, wenn das Projekt Rendering, Suche, Layout oder Routen vollständig selbst steuern soll.
