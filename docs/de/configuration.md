---
title: Konfiguration
navTitle: Konfiguration
section: Start
order: 2
description: Konfiguriere Content-Ordner, Routen, Locales, Assets, Header, eigene Seiten, Frontmatter, Theme und Plugins.
tags: [config, referenz]
updated: 2026-06-09
---

# Konfiguration

`fibel.config.ts` beschreibt das Verhalten der gesamten Dokumentationsseite. Seitenspezifische Angaben gehören in das Frontmatter der jeweiligen Markdown-Datei.

## Minimale Config

```ts
import { defineFibel } from "@k2b/fibel";

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

Beide Schlüssel sind optional. `content` steht standardmäßig auf `docs` und zeigt auf den Ordner mit Markdown-Dateien. `assets` steht standardmäßig auf `assets` und zeigt auf Dateien, die zusammen mit der Dokumentation ausgeliefert werden, zum Beispiel Bilder, PDFs oder Downloads. Beide werden relativ zu `root` aufgelöst. `root` ist standardmäßig das aktuelle Arbeitsverzeichnis und muss nur gesetzt werden, wenn die Config-Datei nicht im Projektwurzelverzeichnis liegt.

Links in Markdown-Dateien bleiben stabil und relativ zur Dokumentation. Das erleichtert den Betrieb unter einem Base Path.

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

`basePath` ist der öffentliche Pfad der Dokumentation und wird gesetzt, wenn Fibel unter einer Sub-Route läuft. `internalPath` ist für generierte Dateien und interne Endpunkte reserviert. `assetsPath` ist der öffentliche Pfad für den Assets-Ordner.

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

Jedes Locale entspricht einem Ordner unter `docs`. Übersetzungen sollten denselben Slug verwenden. `docs/en/search.md` und `docs/de/search.md` beschreiben also dieselbe Seite in unterschiedlichen Sprachen. Genau über den Slug werden sie auch für Sprachumschaltung und `hreflang` einander zugeordnet.

Fehlt `locales`, leitet Fibel die Sprachen aus den Ordnernamen im Content-Verzeichnis ab und nutzt den großgeschriebenen Ordnernamen als Label. `defaultLocale` fällt dann auf das erste Locale der Liste zurück. Für eine veröffentlichte Seite sollten beide Werte explizit gesetzt sein, sonst entscheidet die Ordnerreihenfolge über die Standardsprache.

`defaultLocale` muss in `locales` enthalten sein. Andernfalls bricht Fibel beim Start mit einem Fehler ab.

## SEO

```ts
export default defineFibel({
  title: "Meine Docs",
  siteUrl: "https://docs.example.com",
  seo: {
    ogImage: "/assets/social.png",
    twitterSite: "@example",
    disallow: ["/de/intern"],
  },
});
```

`siteUrl` ist für Suchmaschinen erforderlich. Damit werden Canonical-URLs, Sprachalternativen und Sitemap-Einträge zu absoluten URLs. Ohne den Wert fällt Fibel auf relative Pfade zurück und die Sitemap ist für Crawler ungültig.

`ogImage` ist das Social-Preview-Bild für Seiten ohne eigenes Bild. Lokale Pfade werden unter dem Base Path aufgelöst und zu absoluten URLs ergänzt. `twitterSite` ist das Handle, das auf Cards genannt wird. `disallow` ergänzt Pfade in der `robots.txt`.

Seiten mit `hidden` erscheinen nicht in der Sitemap und bekommen ein `noindex`-Meta-Tag.

## Header-Links

```ts
export default defineFibel({
  title: "Meine Docs",
  headerLinks: [
    { label: "Überblick", value: "/" },
    { label: "Guide", value: "/runtime" },
    { label: "Changelog", value: "https://github.com/example/docs/releases" },
  ],
});
```

`headerLinks` füllt die Navigation neben dem Seitentitel. Lokale Werte werden gegen das Locale der aktuellen Seite aufgelöst. `/runtime` verweist also für englische Leser auf `/en/runtime` und für deutsche auf `/de/runtime`. Schreibe den Wert als Slug ohne Locale-Segment.

Ein Link wird als aktiv markiert, wenn sein Wert dem Slug der aktuellen Seite entspricht. Ist `headerLinks` nicht gesetzt, zeigt der Header keine Navigation.

## Gemeinsamer Header

Die strukturierte `header`-Konfiguration ist für mehrere Fibel-Instanzen gedacht, die wie eine zusammenhängende Website erscheinen:

```ts
export default defineFibel({
  title: "Cloud UI",
  routing: { basePath: "/ui" },
  header: {
    title: "Cloud",
    homeHref: ({ locale }) => `/${locale}`,
    links: [
      {
        label: "Docs",
        href: ({ locale }) => `/docs/${locale}`,
        activeWhen: "/docs",
      },
      {
        label: "UI",
        href: ({ locale }) => `/ui/${locale}`,
        activeWhen: "/ui",
      },
    ],
    searchLabel: "Cloud UI durchsuchen",
    searchPlaceholder: "Komponenten durchsuchen...",
  },
});
```

`title` ist die gemeinsame Marke und bleibt unabhängig vom Instanztitel für Metadaten und Assistent. `homeHref` und der `href` eines Links akzeptieren einen String oder eine synchrone Funktion mit `locale`, `pathname` und `basePath`. `activeWhen` markiert den exakten Präfix und seine Unterpfade als aktiv.

`search`, `themeToggle` und `mobileNavigation` sind standardmäßig `true` und lassen sich einzeln deaktivieren. `headerLinks` bleibt die kürzere locale-relative API für Links innerhalb einer einzelnen Fibel-Instanz.

## Footer-Links

```ts
export default defineFibel({
  title: "Meine Docs",
  footerLinks: [
    { label: "Impressum", value: "/imprint" },
    { label: "GitHub", value: "https://github.com/example/docs" },
  ],
});
```

Jeder Link besteht aus `label` und `value`. Lokale Werte werden wie Header-Links gegen das Locale der aktuellen Seite aufgelöst. `/imprint` zeigt also für englische Leser auf `/en/imprint` und für deutsche auf `/de/imprint`. Absolute `https:`, `mailto:`, `tel:` und Hash-Links werden unverändert verwendet.

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
image: /assets/konfiguration.png
```

Alle Felder sind optional. `title` ist der Seitentitel; fehlt er, nutzt Fibel die erste `#`-Überschrift und danach den Slug in Titelschreibweise. `navTitle` ist das Label in der Sidebar und entspricht standardmäßig dem Titel. `section` bestimmt die Sidebar-Gruppe und ist standardmäßig `Guide`. `order` sortiert Seiten innerhalb eines Locales und ist standardmäßig `100`. `description` wird für SEO, Suche und das Intro genutzt; fehlt sie, nimmt Fibel den ersten Absatz auf 180 Zeichen gekürzt und fällt danach auf die Seitenbeschreibung zurück. `hidden` entfernt eine Seite aus Navigation, Pagination, der seiteneigenen Suche, `llms.txt` und der Sitemap und markiert sie als `noindex`. Die Seite bleibt unter ihrer URL erreichbar, genau das macht sie für Seiten nützlich, die nur im Footer verlinkt sind. `tags` werden als Chips angezeigt. `updated` zeigt ein Aktualisierungsdatum an und füllt `article:modified_time`. `image` überschreibt das Social-Preview-Bild dieser Seite.

## Eigene Seiten

`pages` registriert von einer Anwendung gerenderte Routen neben Markdown-Dateien. Die Seitenmetadaten folgen denselben Regeln für Navigation, Suche, SEO und Sichtbarkeit. Optionales `context` liefert das Markdown für rohe Routen, Suche und Assistent.

Der [Guide für eigene Seiten](/de/custom-pages) beschreibt den vollständigen Renderer-Vertrag, gemeinsamen und lokalisierten Kontext, Solid-SSR-Integration und mehrere Instanzen.

## Plugin-Liste

Wenn `plugins` nicht gesetzt ist, lädt Fibel das Default-Plugin-Set.

```ts
import { defineFibel, defaultPlugins } from "@k2b/fibel";
import { projectPlugin } from "./plugins/project-plugin";

export default defineFibel({
  title: "Meine Docs",
  plugins: [...defaultPlugins(), projectPlugin()],
});
```

Eigene Plugins werden an die Defaults angehängt, wenn die integrierten Funktionen erhalten bleiben sollen. Eine vollständige Ersetzung der Liste ist nur nötig, wenn das Projekt Rendering, Suche, Layout oder Routen selbst steuert.
