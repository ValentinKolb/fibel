---
title: Fibel
navTitle: Überblick
section: Start
order: 1
description: Fibel veröffentlicht Markdown-Dokumentation als serverseitig gerenderte Website mit Suche, Mehrsprachigkeit und Markdown-Quellen für Werkzeuge.
tags: [überblick, markdown, docs]
updated: 2026-06-09
---

# Fibel

Fibel richtet sich an Teams, die Produkt- und Entwicklerdokumentation im Repository pflegen und als Website veröffentlichen möchten. Die Inhalte liegen als Markdown-Dateien vor. Fibel rendert daraus Seiten mit Navigation, Suchindex, Sprachumschaltung und stabilen Links auf die Markdown-Quelle.

So bleibt dieselbe Dokumentation in drei Arbeitskontexten nutzbar: im Code-Review, im Browser und in Werkzeugen wie LLMs, die Markdown direkt verarbeiten.

## Wofür Fibel gedacht ist

- Dokumentation soll versioniert neben dem Code liegen.
- Leser sollen eine vollständige Website mit Navigation, Suche und Theme erhalten.
- Mehrsprachige Seiten sollen dieselbe Struktur verwenden.
- LLMs und Automationen sollen den Markdown-Inhalt direkt lesen können.
- Projekte sollen Fibel als eigene Docs-App starten oder unter einer Route in eine bestehende App mounten können.

## Was Fibel bereitstellt

- Serverseitig gerendertes HTML mit Titel, Beschreibung und Canonical URL.
- Locale-Ordner für mehrsprachige Dokumentation.
- Ein Standard-Theme mit Light und Dark Mode.
- Integrierte Suche mit serverseitigem Index.
- Markdown-URLs wie `/de/configuration.md` für Werkzeuge und Reviews.
- Page-Actions zum Kopieren von Seiten- und Markdown-Links.
- Heading-Anker für Links auf einzelne Abschnitte.
- Ein Plugin-System zum Erweitern oder Ersetzen einzelner Funktionen.

## Projektstruktur

Eine Fibel-Seite benötigt eine Config-Datei und einen Markdown-Ordner. Assets sind optional.

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

Jedes Locale hat einen eigenen Ordner. Eine Seite unter `docs/de/configuration.md` wird als `/de/configuration` ausgeliefert. Derselbe Inhalt ist unter `/de/configuration.md` und `/de/configuration.markdown` als Markdown verfügbar.

## Schnellstart

Erzeuge die Projektdateien:

```sh
bunx --bun @valentinkolb/fibel init
```

Starte den lokalen Server:

```sh
bunx --bun @valentinkolb/fibel dev
```

Öffne die ausgegebene URL und bearbeite die Markdown-Dateien im `docs`-Ordner.

## Agent-Skill

Installiere den Fibel-Agent-Skill in Codex-Umgebungen, die an Fibel-Projekten arbeiten sollen:

```sh
bunx skills add ValentinKolb/fibel
```

Der Skill gibt Agenten die aktuellen Fibel-Konventionen für Konfiguration, Markdown-Seiten, rohe `.md`-Routen, Plugins, Hosting und Verifikation.

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

Das Frontmatter steuert Metadaten, Navigation und Page-Chips. Das Feld `title` ist der Seitentitel; fehlt es, greift Fibel auf die erste Markdown-Überschrift `#` zurück. In beiden Fällen rendert das Default-Layout diesen Titel einmal und lässt die erste `#`-Überschrift im Artikel aus, damit sie nicht doppelt erscheint.

## Nächste Schritte

Lies zuerst die [Konfiguration](/de/configuration), wenn du ein Projekt einrichtest. Lies [Hosting](/de/runtime), wenn Fibel als Server oder in einer bestehenden App laufen soll. [Integrierte Plugins](/de/built-in-plugins) listet auf, was Fibel mitbringt, und die [Plugin-API](/de/plugins) erklärt, wie du eigenes Verhalten ergänzt.
