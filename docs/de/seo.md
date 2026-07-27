---
title: SEO und Auffindbarkeit
navTitle: SEO
section: Integrierte Plugins
order: 35
description: Wie Fibel Dokumentation für Suchmaschinen auffindbar und für Sprachmodelle lesbar macht.
tags: [seo, sitemap, llms]
updated: 2026-07-25
---

# SEO und Auffindbarkeit

Das SEO-Plugin beschreibt jede Seite für Suchmaschinen. Das llms-Plugin veröffentlicht denselben Inhalt in einer Form, die Sprachmodelle verarbeiten können. Beide funktionieren ohne Konfiguration, eine veröffentlichte Seite sollte aber `siteUrl` setzen.

## Site-URL setzen

```ts
export default defineFibel({
  title: "Meine Docs",
  siteUrl: "https://docs.example.com",
});
```

`siteUrl` macht Canonical-URLs, Sprachalternativen, strukturierte Daten und Sitemap-Einträge absolut. Ohne den Wert gibt Fibel relative Pfade aus und Crawler verwerfen die Sitemap. Fibel warnt beim Start, wenn der Wert fehlt.

## Sprachalternativen

Mehrsprachige Dokumentation konkurriert mit sich selbst, wenn Suchmaschinen Übersetzungen als eigenständige Seiten behandeln. Fibel verknüpft sie stattdessen.

```html
<link rel="alternate" hreflang="en" href="https://docs.example.com/en/configuration">
<link rel="alternate" hreflang="de" href="https://docs.example.com/de/configuration">
<link rel="alternate" hreflang="x-default" href="https://docs.example.com/en/configuration">
```

Die Zuordnung läuft über den Slug. `docs/en/configuration.md` und `docs/de/configuration.md` bilden eine Gruppe. Der `x-default`-Eintrag zeigt auf das Standard-Locale. Dieselben Alternativen stehen auch in der Sitemap.

## Sitemap und Robots

```txt
/sitemap.xml
/robots.txt
```

Die Sitemap listet jede sichtbare Seite mit absoluter URL, dem `updated`-Datum als `lastmod` und den Sprachalternativen. `robots.txt` sperrt den internen Pfad sowie alle Pfade aus `seo.disallow` und verweist auf die Sitemap.

Seiten mit `hidden: true` fehlen in der Sitemap und werden mit einem `noindex`-Meta-Tag ausgeliefert.

## Favicon

```ts
export default defineFibel({
  title: "Meine Docs",
  seo: {
    favicon: "/assets/logo.svg",
  },
});
```

`favicon` ist die öffentliche URL für den Icon-Link des Dokuments. Fibel schreibt sie unverändert, sodass mehrere gemountete Fibel-Instanzen einen Host-Pfad wie `/assets/logo.svg` teilen können. Ohne diese Option bleibt das eingebaute Fibel-SVG unter dem internen Pfad der jeweiligen Instanz verfügbar.

## Social Cards

```ts
export default defineFibel({
  title: "Meine Docs",
  seo: {
    ogImage: "/assets/social.png",
    twitterSite: "@example",
  },
});
```

Fibel rendert Open-Graph- und Twitter-Card-Tags aus Titel und Beschreibung der Seite. `ogImage` ist das Standard-Vorschaubild, eine Seite überschreibt es mit `image` im Frontmatter. Mit Bild wechseln die Cards in das große Format.

## Strukturierte Daten

Jede indexierbare Seite trägt JSON-LD mit einem `TechArticle`. Inhaltsseiten ergänzen eine `BreadcrumbList` aus der Sidebar-Section. Die Locale-Startseiten tragen stattdessen einen `WebSite`-Eintrag.

Fibel deklariert bewusst keine `SearchAction`. Dieses Markup verspricht Crawlern eine URL, die Suchergebnisse als Seite rendert, und Fibels Suche ist ein JSON-Endpunkt für den Spotlight-Dialog.

## Routen für Sprachmodelle

```txt
/llms.txt              Index für das Standard-Locale
/de/llms.txt           Index für ein bestimmtes Locale
/llms-full.txt         alle Seiten des Standard-Locales in einer Datei
/de/llms-full.txt      alle Seiten eines Locales in einer Datei
```

Der Index folgt der `llms.txt`-Konvention: Titel, kurze Zusammenfassung, dann die Seiten gruppiert nach Sidebar-Section. Jeder Eintrag verlinkt mit seiner Beschreibung auf die rohe Markdown-Route, ein Modell kann also genau die Seite laden, die es braucht. `llms-full.txt` enthält das Markdown aller Seiten für Werkzeuge, die lieber einen einzigen Request machen.

Versteckte Seiten fehlen in beiden.

## Eigene Head-Tags

Analytics-Snippets und Verification-Tags gehören in ein Plugin statt in ein ersetztes Layout. Die [Plugin-API](/de/plugins) dokumentiert den `headTags`-Hook.
