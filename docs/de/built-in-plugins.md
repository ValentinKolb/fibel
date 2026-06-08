---
title: Integrierte Plugins
navTitle: Überblick
section: Integrierte Plugins
order: 25
description: Fibel liefert ein Standard-Plugin-Set für Markdown, Theme, i18n, SEO, Assets, Suche und Layout.
tags: [plugins, integriert]
updated: 2026-06-09
---

# Integrierte Plugins

Fibel setzt seine Standardfunktionen aus normalen Plugins zusammen. Projekte können dieses Set unverändert verwenden, eigene Plugins ergänzen oder einzelne Verantwortlichkeiten ersetzen.

## Standard-Set

```ts
import { defaultPlugins } from "fibel";

const plugins = defaultPlugins();
```

Das Standard-Set enthält:

- `markdownPlugin`: rendert Markdown zu HTML, verarbeitet Codeblöcke und erzeugt Heading-Anker.
- `themePlugin`: liest den Theme-Cookie und stellt das ausgewählte Theme für das Layout bereit.
- `i18nPlugin`: prüft, ob übersetzte Seiten in den konfigurierten Locales vorhanden sind.
- `seoPlugin`: liefert SEO-Dateien wie Favicon, Sitemap und Robots-Ausgabe.
- `assetsPlugin`: liefert Dateien aus dem konfigurierten Assets-Ordner.
- `searchPlugin`: baut den Suchindex und stellt den Suchendpunkt bereit.
- `layoutPlugin`: rendert Navigation, Seitenlayout, Page-Actions, Footer, Suchdialog und Client-Script.

## Standard-Set erweitern

Hänge eigene Plugins an das Standard-Set an, wenn die integrierten Funktionen erhalten bleiben sollen.

```ts
import { defineFibel, defaultPlugins } from "fibel";
import { projectLinksPlugin } from "./plugins/project-links";

export default defineFibel({
  title: "Product Docs",
  plugins: [...defaultPlugins(), projectLinksPlugin()],
});
```

Diese Variante ist für die meisten Projekte der richtige Startpunkt.

## Standard-Set ersetzen

Ersetze die Plugin-Liste, wenn ein Projekt Rendering, Layout, Suche oder Routen vollständig selbst steuern soll.

```ts
import { defineFibel } from "fibel";
import { searchPlugin, themePlugin } from "fibel/plugins";

export default defineFibel({
  title: "Product Docs",
  plugins: [
    customMarkdownPlugin(),
    themePlugin(),
    searchPlugin(),
    customLayoutPlugin(),
  ],
});
```

Fibel ergänzt ausgelassene Plugins nicht automatisch. Eine eigene Liste sollte alle Funktionen enthalten, die die Website benötigt.

## Routen und Zuständigkeiten

Mehrere integrierte Plugins besitzen eigene Routen. Das Search-Plugin besitzt den Suchendpunkt. Das Layout-Plugin liefert das Client-Script. Das SEO-Plugin liefert SEO-Dateien. Das Assets-Plugin liefert öffentliche Dateien.

Eigene Plugins sollten Routenpfade explizit wählen. Das verhindert Konflikte und macht die Dokumentation unter einem Base Path vorhersehbar.
