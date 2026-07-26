---
title: Fibel
navTitle: Überblick
section: Start
order: 1
description: Fibel veröffentlicht Markdown-Dokumentation als serverseitig gerenderte Website mit Suche, mehrsprachigem Routing und Markdown-Quellseiten für Werkzeuge.
tags: [überblick, markdown, docs]
updated: 2026-07-26
---

# Fibel

Fibel liest Markdown aus einem Content-Verzeichnis und liefert es als Website aus. Die Quelldateien bleiben im Repository lesbar, und jede Seite steht zusätzlich als rohes Markdown bereit. Reviewer, Skripte und Sprachmodelle arbeiten damit auf derselben Quelle, aus der die Website gebaut wird.

Sämtliche eingebauten Funktionen sind Plugins: Markdown-Rendering, Layout, Suche, Theme-Handling, i18n-Prüfung und SEO-Ausgabe. Das Standard-Set lässt sich erweitern, einzelne Plugins ersetzen oder die Liste vollständig neu zusammenstellen. Rendering, Navigation, Suche und Routing bleiben damit in der Hand des Projekts statt vom Framework vorgegeben.

Fibel läuft auf Bun und wird in einer einzigen Datei konfiguriert. Inhalte benötigen keinen Build-Schritt, ausgelieferte Seiten enthalten kein Client-Framework.

## Schnellstart

```sh
bunx --bun fibel init
bunx --bun fibel dev
```

`init` erzeugt `fibel.config.ts`, eine erste Seite unter `docs/en/` und ein `assets/`-Verzeichnis. `dev` liefert das Projekt aus und lädt den Browser bei Dateiänderungen neu. Der Entwicklungsserver gibt seine URL beim Start aus.

Fibel ist mit `v0.2.0` von `@valentinkolb/fibel` zum unscoped Paket `fibel` umgezogen. In bestehenden Projekten werden Root-Imports durch `fibel`, Plugin-Imports durch `fibel/plugins` und CLI-Aufrufe durch `bunx --bun fibel` ersetzt. Das bisherige Paket ist deprecated.

In Projekten, an denen Coding-Agents arbeiten, kommt zusätzlich der Fibel-Agent-Skill dazu:

```sh
bunx skills add k2b-dev/fibel
```

Er stellt die aktuellen Konventionen für Konfiguration, Markdown-Seiten, rohe `.md`-Routen, Plugins, Hosting und Verifikation bereit, damit Agents auf der dokumentierten API arbeiten statt zu raten.

## Funktionsumfang

- Seiten aus `docs/<locale>/**/*.md`, mit Navigation, Sections und Pagination aus dem Frontmatter.
- Serverseitige Suche mit Spotlight-Dialog, zu öffnen mit `/` oder `Mod+K`.
- Native Sprachrouten und ein Sprachumschalter, der die aktuelle Seite beibehält.
- Light und Dark Mode serverseitig aufgelöst, der erste Frame stimmt damit bereits.
- Canonical-URLs, `hreflang`-Alternativen, Sitemap und strukturierte Daten für Suchmaschinen.
- `llms.txt` und rohe `.md`-Routen für Werkzeuge, die Dokumentation direkt lesen.
- Eine Plugin-API zum Ersetzen oder Erweitern sämtlicher eingebauter Funktionen.

## Maschinenlesbare Ausgabe

Dokumentation wird zunehmend von Werkzeugen verarbeitet statt im Browser gelesen. Fibel stellt jede Seite in einer Form bereit, die diese Werkzeuge verarbeiten können, ohne separaten Export-Schritt:

```txt
/de/configuration        die gerenderte Seite
/de/configuration.md     die Markdown-Quelle
/llms.txt                ein Index aller Seiten, nach Section gruppiert
/llms-full.txt           die vollständige Dokumentation in einer Datei
```

Es handelt sich um stabile URLs, nicht um Datei-Downloads. Seiten, die aus der Navigation ausgenommen sind, fehlen auch hier.

## Projektstruktur

Ein Fibel-Projekt besteht aus einer Config-Datei und einem Content-Verzeichnis. Assets sind optional.

```txt
fibel.config.ts
docs/
  en/
    index.md
    configuration.md
  de/
    index.md
    configuration.md
assets/
```

Jedes Locale hat ein eigenes Verzeichnis. `docs/de/configuration.md` wird als `/de/configuration` und als `/de/configuration.md` ausgeliefert. Seiten mit identischem Slug in mehreren Sprachen gelten als Übersetzungen voneinander; daraus ergeben sich sowohl der Sprachumschalter als auch die `hreflang`-Ausgabe.

## Seitenmodell

Eine Seite besteht aus Frontmatter und Markdown-Inhalt.

```md
---
title: Konfiguration
navTitle: Konfiguration
section: Start
order: 2
description: Konfiguriere Routen, Locales, Assets, Theme und Plugins.
tags: [config, routing]
updated: 2026-06-09
---

# Konfiguration
```

Das Frontmatter steuert Metadaten, Navigation und die Chips unter dem Seitentitel. Alle Felder sind optional: Fehlt `title`, greift Fibel auf die erste `#`-Überschrift zurück, fehlt `description`, auf den ersten Absatz. Das Layout rendert den Titel einmal und lässt die erste `#`-Überschrift im Text weg, sodass sie nicht doppelt erscheint.

## Nächste Schritte

Die [Konfiguration](/de/configuration) behandelt die Einrichtung eines Projekts. [Hosting](/de/runtime) beschreibt den Betrieb als Server oder das Einbinden in eine bestehende Anwendung. [SEO](/de/seo) dokumentiert, was Suchmaschinen und Sprachmodelle erhalten. [Integrierte Plugins](/de/built-in-plugins) listet den Funktionsumfang auf, die [Plugin-API](/de/plugins) beschreibt dessen Erweiterung.
