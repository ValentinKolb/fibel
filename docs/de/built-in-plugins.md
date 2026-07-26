---
title: Integrierte Plugins
navTitle: Überblick
section: Integrierte Plugins
order: 25
description: Fibel liefert ein Standard-Plugin-Set für Markdown, Theme, i18n, SEO, Assets, Suche, Powered-by-Hinweis und Layout.
tags: [plugins, integriert]
updated: 2026-06-09
---

# Integrierte Plugins

Fibel setzt seine Standardfunktionen aus normalen Plugins zusammen. Projekte können dieses Set unverändert verwenden, eigene Plugins ergänzen oder einzelne Verantwortlichkeiten ersetzen.

## Standard-Set

```ts
import { defaultPlugins } from "@valentinkolb/fibel";

const plugins = defaultPlugins();
```

Das Standard-Set enthält:

- `markdownPlugin`: rendert Markdown zu HTML, verarbeitet Codeblöcke und erzeugt Heading-Anker.
- `themePlugin`: liest den Theme-Cookie und stellt das ausgewählte Theme für das Layout bereit. Siehe [Theme](/de/theme).
- `i18nPlugin`: prüft, ob übersetzte Seiten in den konfigurierten Locales vorhanden sind.
- `seoPlugin`: liefert SEO-Dateien wie Favicon, Sitemap und Robots-Ausgabe und ergänzt jede Seite um Sprachalternativen und Social-Card-Metadaten.
- `llmsPlugin`: liefert `llms.txt` und `llms-full.txt`, damit Sprachmodelle die Dokumentation finden und lesen können. Siehe [SEO](/de/seo).
- `assetsPlugin`: liefert Dateien aus dem konfigurierten Assets-Ordner.
- `searchPlugin`: baut den Suchindex und stellt den Suchendpunkt bereit. Siehe [Suche](/de/search).
- `poweredByPlugin`: ergänzt den Hinweis `Powered by fibel.dev` im Footer.
- `layoutPlugin`: rendert Navigation, Seitenlayout, Page-Actions, Footer, Suchdialog und Client-Script.

## Optionale Plugins

Fibel liefert Plugins mit, die nicht im Standard-Set stecken, weil sie Konfiguration brauchen.

`assistantPlugin` ergänzt einen begrenzten Dokumentationschat mit `@k2b/nessi`. Das Plugin nutzt standardmäßig In-Memory-Rate-Limits und behält Provider-Zugangsdaten auf dem Server. Siehe [Dokumentationsassistent](/de/assistant).

`imprintPlugin` ergänzt einen Footer-Link auf rechtliche Angaben, die an anderer Stelle liegen. Das Plugin eignet sich, wenn das Impressum zur Firma oder Person hinter mehreren Seiten gehört und nicht als Dokumentationsseite gepflegt werden soll.

```ts
import { defineFibel, defaultPlugins } from "@valentinkolb/fibel";
import { imprintPlugin } from "@valentinkolb/fibel/plugins";

export default defineFibel({
  title: "Meine Docs",
  plugins: [...defaultPlugins(), imprintPlugin({ url: "https://example.com/impressum", label: "Impressum" })],
});
```

Die URL wird unverändert verwendet und kann auf eine beliebige externe Seite zeigen. `label` ist standardmäßig `Imprint`.

## Standard-Set erweitern

Eigene Plugins werden an das Standard-Set angehängt, wenn die integrierten Funktionen erhalten bleiben sollen.

```ts
import { defineFibel, defaultPlugins } from "@valentinkolb/fibel";
import { projectLinksPlugin } from "./plugins/project-links";

export default defineFibel({
  title: "Product Docs",
  plugins: [...defaultPlugins(), projectLinksPlugin()],
});
```

Diese Variante ist für die meisten Projekte der richtige Startpunkt. Die [Plugin-API](/de/plugins) beschreibt die verfügbaren Hooks.

## Standard-Set ersetzen

Die Plugin-Liste wird vollständig ersetzt, wenn ein Projekt Rendering, Layout, Suche oder Routen selbst steuern soll.

```ts
import { defineFibel } from "@valentinkolb/fibel";
import { searchPlugin, themePlugin } from "@valentinkolb/fibel/plugins";

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

Um den standardmäßigen Footer-Hinweis zu entfernen, verwende eine Plugin-Liste ohne `poweredByPlugin`.

## Routen und Zuständigkeiten

Mehrere integrierte Plugins besitzen eigene Routen. Das Search-Plugin besitzt den Suchendpunkt. Das Layout-Plugin liefert das Client-Script. Das SEO-Plugin liefert SEO-Dateien. Das Assets-Plugin liefert öffentliche Dateien.

Eigene Plugins sollten Routenpfade explizit wählen. Das verhindert Konflikte und macht die Dokumentation unter einem Base Path vorhersehbar.
